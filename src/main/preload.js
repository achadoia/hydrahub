const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('hydra', {
  getCatalog: invoke('catalog:get'),
  releases: invoke('github:releases'),
  directVersion: invoke('direct:version'),
  install: invoke('game:install'),
  cancel: invoke('game:cancel'),
  installed: invoke('game:installed'),
  launch: invoke('game:launch'),
  setExe: invoke('game:setExe'),
  openFolder: invoke('game:openFolder'),
  uninstall: invoke('game:uninstall'),
  getSettings: invoke('settings:get'),
  setSettings: invoke('settings:set'),
  pickDir: invoke('settings:pickDir'),
  open: invoke('shell:open'),
  info: invoke('app:info'),
  account: invoke('account:get'),
  login: invoke('account:login'),
  cancelLogin: invoke('account:cancel'),
  logout: invoke('account:logout'),
  onProgress: (fn) => ipcRenderer.on('download:progress', (_e, p) => fn(p)),
  onToast: (fn) => ipcRenderer.on('toast', (_e, p) => fn(p)),
});
