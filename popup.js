const btnConnect = document.getElementById('btn-connect');
const endpoint = 'http://localhost:3000'
const icons = {
  pending: 'assets/pending.png',
  success: 'assets/success.png',
  failed: 'assets.failed.png',
};

/**
 * @param {chrome.tabs.Tab} tab Current active tab
 */
async function extractCookies(tab) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
  const promises = frames.map(frame => {
    const url = new URL(frame.url);
    return chrome.cookies.getAll({ url: url.origin });
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
async function extractTabURL(tab) {
  return tab.url;
}

btnConnect.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs.pop();
    if (tab == null) {
      return;
    }

    const [tab_url, cookies, local_storage] = await Promise.all([
      extractTabURL(tab),
      extractCookies(tab),
      extractLocalStorage(tab),
    ]);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tab_url, cookies, local_storage }),
    });

    if (response.status < 400) {
      chrome.action.setIcon({ path: icons.success });
    } else {
      throw new Error(response.statusText);
    }
  } catch (error) {
    chrome.action.setIcon({ path: icons.failed });
  }
});
