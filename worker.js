const noop = () => {};

/** @enum */
const ExtesionIcons = {
  Pending: 'assets/pending.png',
  Success: 'assets/success.png',
  Failed: 'assets/failed.png',
};

/** @enum */
const ExtensionAction = Object.freeze({
  Connect: 'extension-connect',
  Disconnect: 'extension-disconnect',
  CheckStatus: 'extension-check-status',
});

/** @enum */
const ExtentionStatus = Object.freeze({
  Pending: 'pending',
  Connected: 'connected',
  Failed: 'failed',
});

const settings = {
  timer: null,
  cycle: 30_000,
  endpoint: 'http://localhost:3000',
  token: '123456',
  status: ExtentionStatus.Pending,
};

/**
 * @param {chrome.tabs.Tab} tab Current active tab
 */
async function extractCookies(tab) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
  const promises = frames.map(frame => {
    const url = new URL(frame.url);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return chrome.cookies.getAll({ url: url.origin });
    }
    return Promise.resolve([]);
  });
  const cookies2D = await Promise.all(promises);
  const uCookies = new Set();
  return cookies2D.reduce((prev, cookies) => {
    for (const cookie of cookies) {
      const key = JSON.stringify(cookie, undefined, 0);
      if (uCookies.has(key)) {
        continue;
      }
      uCookies.add(key);
      prev.push(cookie);
    }
    return prev;
  }, []);
}

/**
 * @param {chrome.tabs.Tab} tab Current active tab
 */
async function extractLocalStorage(tab) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function () {
      return JSON.stringify(localStorage);
    },
  });
  const storage = JSON.parse(results[0].result);
  for (const [key, value] of Object.entries(storage)) {
    try {
      storage[key] = JSON.parse(value);
    } catch {}
  }
  return storage;
}

/**
 * @param {boolean} reload Reload all tabs before sending
 */
async function send(reload = false) {
  if (reload) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const promises = tabs.map(tab => chrome.tabs.reload(tab.id));
    await Promise.all(promises);
  }
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const data = {};
  for (const tab of tabs) {
    const url = new URL(tab.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      continue;
    }
    const [cookies, local_storage] = await Promise.all([extractCookies(tab), extractLocalStorage(tab)]);
    data[url.hostname] = { cookies, local_storage };
  }

  const response = await fetch(settings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authentication: `Bearer ${settings.token}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status >= 400) {
    throw new Error(response.statusText);
  }
}

chrome.runtime.onMessage.addListener(function (msg, _, sendResponse) {
  if (typeof msg === 'object' && msg !== null) {
    if (msg.action === ExtensionAction.Connect) {
      clearInterval(settings.timer);
      send()
        .then(() => {
          chrome.action.setIcon({ path: ExtesionIcons.Success });
          settings.status = ExtentionStatus.Connected;
          settings.timer = setInterval(() => send(true).catch(noop), settings.cycle);
          sendResponse();
        })
        .catch(error => {
          settings.status = ExtentionStatus.Failed;
          chrome.action.setIcon({ path: ExtesionIcons.Failed });
          sendResponse(error);
        });
    } else if (msg.action === ExtensionAction.Disconnect) {
      clearInterval(settings.timer);
      settings.status = ExtentionStatus.Pending;
      chrome.action.setIcon({ path: ExtesionIcons.Pending });
      sendResponse();
    } else if (msg.action === ExtensionAction.CheckStatus) {
      sendResponse(settings.status);
    }
  } else {
    sendResponse();
  }
  return true;
});
