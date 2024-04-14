const btnConnect = {
  element: document.getElementById('btn-connect'),
  spinner: document.getElementById('spinner'),
  text(msg) {
    this.element.firstElementChild.innerHTML = msg;
    return this;
  },
  turnOnSpinner() {
    this.spinner.style.display = 'inline-block';
    return this;
  },
  turnOffSpinner() {
    this.spinner.style.display = 'none';
    return this;
  },
  enable() {
    this.element.disabled = false;
    this.element.style.cursor = 'pointer';
    this.element.style.backgroundColor = '#007bff';
    return this;
  },
  disable() {
    this.element.disabled = true;
    this.element.style.cursor = 'not-allowed';
    this.element.style.backgroundColor = '#082d55';
    return this;
  },
  onclick(cb) {
    this.element.addEventListener('click', cb);
  },
};

const btnDisconnect = {
  element: document.getElementById('btn-disconnect'),
  enable() {
    this.element.disabled = false;
    this.element.style.cursor = 'pointer';
    this.element.style.backgroundColor = '#d61515';
    return this;
  },
  disable() {
    this.element.disabled = true;
    this.element.style.cursor = 'not-allowed';
    this.element.style.backgroundColor = '#700101';
    return this;
  },
  onclick(cb) {
    this.element.addEventListener('click', cb);
  },
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

chrome.runtime.sendMessage({ action: ExtensionAction.CheckStatus }, {}, status => {
  if (status === ExtentionStatus.Connected) {
    btnConnect.disable();
    btnDisconnect.enable();
  } else {
    btnConnect.enable();
    btnDisconnect.disable();
  }
});

btnConnect.onclick(() => {
  btnConnect.text('Đang kết nối').turnOnSpinner().disable();
  chrome.runtime.sendMessage({ action: ExtensionAction.Connect }, {}, error => {
    if (error) {
      btnConnect.enable();
    } else {
      btnConnect.disable();
      btnDisconnect.enable();
    }
    btnConnect.text('Kết nối').turnOffSpinner();
  });
});

btnDisconnect.onclick(() => {
  chrome.runtime.sendMessage({ action: ExtensionAction.Disconnect }, {}, error => {
    if (error) {
      console.error(error);
      return;
    }
    btnConnect.text('Kết nối').enable();
    btnDisconnect.disable();
  });
});
