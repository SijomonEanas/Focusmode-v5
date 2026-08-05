const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Management
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  setFullScreen: (flag) => ipcRenderer.send('set-fullscreen', flag),
  close: () => ipcRenderer.send('window-close'),
  toggleWidgetMode: () => ipcRenderer.send('toggle-widget-mode'),
  toggleDashboardMode: () => ipcRenderer.send('toggle-dashboard-mode'),
  resizeWidgetHeight: (height) => ipcRenderer.send('resize-widget-height', height),
  
  // Data Persistence
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  saveDataSync: (data) => ipcRenderer.sendSync('save-data-sync', data),
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),
  
  // Keyboard Shortcuts
  onShortcutPause: (callback) => ipcRenderer.on('shortcut-pause', () => callback()),
  onShortcutResume: (callback) => ipcRenderer.on('shortcut-resume', () => callback()),
  onShortcutBreak: (callback) => ipcRenderer.on('shortcut-break', () => callback()),
  onShortcutSwitch: (callback) => ipcRenderer.on('shortcut-switch', () => callback()),
  
  // Settings & OS Integrations
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  getRandomQuoteImage: () => ipcRenderer.invoke('get-random-quote-image'),
  openUserQuotesFolder: () => ipcRenderer.invoke('open-user-quotes-folder'),
  sendNotification: (notificationData) => ipcRenderer.send('send-notification', notificationData),

  // --- Dual-Window State Synchronization ---
  syncState: (stateDiff) => ipcRenderer.send('sync-state', stateDiff),
  onStateUpdated: (callback) => {
    // Wrap callback to strip the event object from IPC
    const handler = (event, diff) => callback(diff);
    ipcRenderer.on('state-updated', handler);
    return () => ipcRenderer.off('state-updated', handler);
  },
  onWindowClosing: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window-is-closing', handler);
    return () => ipcRenderer.off('window-is-closing', handler);
  },
  notifyReadyToClose: () => ipcRenderer.send('renderer-ready-to-close')
});
