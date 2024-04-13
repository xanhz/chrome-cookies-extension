const btnConnect = document.getElementById('btn-connect');
const spinner = document.getElementById('spinner');
const noop = () => {};
const icons = {
  pending: 'assets/pending.png',
  success: 'assets/success.png',
  failed: 'assets/failed.png',
};

btnConnect.addEventListener('click', () => {
  btnConnect.disabled = true;
  btnConnect.firstElementChild.innerHTML = 'Connecting';
  spinner.style.display = 'inline-block';
  chrome.runtime.sendMessage({ action: 'extension-connect' }, {}, error => {
    btnConnect.firstElementChild.innerHTML = 'Connect';
    btnConnect.disabled = false;
    spinner.style.display = 'none';
    if (error) {
      chrome.action.setIcon({ path: icons.failed });
    } else {
      chrome.action.setIcon({ path: icons.success });
    }
  });
});
