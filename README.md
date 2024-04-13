# chrome-cookies-extension

Support extracting cookies and local storage data of current active tab in Chrome.

## Installation

```bash
# Install typing only
yarn install
```

## Configuration

- **Endpoint**: edit variable `endpoint` in file `worker.js`
- **Bearer token**: edit variable `token` in file `worker.js`
- **Interval**: edit variable `cycle` in file `worker.js`
- **Incons**: edit variable `icons` in file `popup.js` & update images in folder `assets`
- **Extension name**: edit field `name` in file `manifest.json`
- **Extension description**: edit field `description` in file `manifest.json`
