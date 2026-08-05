const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, globalShortcut, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let widgetWindow;
let tray;
let isQuitting = false;
let isRendererReadyToClose = false;

const DATA_FILE = path.join(app.getPath('userData'), 'focus-data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      let rawData = fs.readFileSync(DATA_FILE, 'utf8');
      if (rawData.charCodeAt(0) === 0xFEFF) {
        rawData = rawData.slice(1);
      }
      return { success: true, data: JSON.parse(rawData) };
    }
    return { success: true, data: null };
  } catch (err) {
    console.error('Error loading data file:', err);
    return { success: false, error: err.message };
  }
}

function saveData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving data file:', err);
    return { success: false, error: err.message };
  }
}

// --- Window Creation ---
const isDev = process.env.NODE_ENV === 'development';
const getLoadURL = (mode) => isDev 
  ? `http://localhost:5173?mode=${mode}` 
  : `file://${path.join(__dirname, 'dist-react', 'index.html')}?mode=${mode}`;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960, height: 700,
    minWidth: 900, minHeight: 650,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, autoplayPolicy: 'no-user-gesture-required',
      webSecurity: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'), { search: 'mode=main' }).catch(err => console.error("Load File Error:", err));

  mainWindow.once('ready-to-show', () => mainWindow.show());
  // Fallback to show the window if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 1000);

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (event) => {
    if (isRendererReadyToClose) return; // Allow normal close

    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    } else {
      event.preventDefault(); // Prevent immediate destroy to allow renderer to save logs
      try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
          mainWindow.webContents.send('window-is-closing');
        }
      } catch (err) {}
    }
  });
}

function createWidgetWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  widgetWindow = new BrowserWindow({
    width: 320, height: 275,
    minWidth: 290, minHeight: 250,
    x: width - 340, y: 50,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, autoplayPolicy: 'no-user-gesture-required'
    },
    show: false
  });

  widgetWindow.loadFile(path.join(__dirname, 'src', 'index.html'), { search: 'mode=widget' }).catch(err => console.error(err));

  // Optional: Widget window visibility logic will be handled via IPC
}

// --- Zustand IPC State Synchronization ---
ipcMain.on('sync-state', (event, stateDiff) => {
  // Broadcast state changes to the OTHER window to keep Zustand perfectly in sync
  if (event.sender === mainWindow?.webContents && widgetWindow) {
    widgetWindow.webContents.send('state-updated', stateDiff);
  } else if (event.sender === widgetWindow?.webContents && mainWindow) {
    mainWindow.webContents.send('state-updated', stateDiff);
  }
});

function createTray() {
  // Use a fallback transparent 1x1 base64 pixel if the icon doesn't exist yet
  let iconPath = path.join(__dirname, 'src', 'assets', 'icon.png');
  let trayImage;

  if (fs.existsSync(iconPath)) {
    trayImage = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // 1x1 transparent PNG fallback
    const fallbackBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    trayImage = nativeImage.createFromDataURL(fallbackBase64);
  }

  tray = new Tray(trayImage);
  tray.setToolTip('Focus Mode');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Focus Mode',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('FocusMode');
    createMainWindow();
    createWidgetWindow();
    createTray();

    // Register Keyboard Shortcuts
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      if (widgetWindow) {
        widgetWindow.isVisible() ? widgetWindow.hide() : widgetWindow.show();
      }
    });

    globalShortcut.register('Alt+H', () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });

    // Send IPC events to React to handle logic
    globalShortcut.register('Alt+P', () => mainWindow?.webContents.send('shortcut-pause'));
    globalShortcut.register('Alt+R', () => mainWindow?.webContents.send('shortcut-resume'));
    globalShortcut.register('Alt+B', () => mainWindow?.webContents.send('shortcut-break'));
    globalShortcut.register('Alt+S', () => mainWindow?.webContents.send('shortcut-switch'));

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        createWidgetWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler implementations
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

let isCustomFullScreen = false;

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    
    if (isCustomFullScreen) {
      isCustomFullScreen = false;
      mainWindow.setSize(960, 700);
      mainWindow.center();
    } else {
      isCustomFullScreen = true;
      mainWindow.setBounds(primaryDisplay.bounds);
    }
  }
});

ipcMain.on('set-fullscreen', (event, flag) => {
  if (mainWindow) mainWindow.setFullScreen(flag);
});

ipcMain.on('renderer-ready-to-close', () => {
  isRendererReadyToClose = true;
  app.quit(); // triggers close again, but this time isRendererReadyToClose is true
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close(); // triggers the close intercept
});

let wasFullScreen = false;

ipcMain.on('toggle-widget-mode', () => {
  if (mainWindow) {
    wasFullScreen = isCustomFullScreen;
    if (isCustomFullScreen) {
      isCustomFullScreen = false;
    }
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    mainWindow.setMinimumSize(290, 220);
    mainWindow.setSize(300, 240);
    mainWindow.setAlwaysOnTop(true, 'screen-saver'); // Always-on-top floating above all windows
    mainWindow.setResizable(false);
    // Position near the top-right of the screen
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(width - 300, 50);
  }
});

ipcMain.on('toggle-dashboard-mode', () => {
  if (mainWindow) {
    mainWindow.setMinimumSize(900, 650);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    if (wasFullScreen) {
      isCustomFullScreen = true;
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      mainWindow.setBounds(primaryDisplay.bounds);
    } else {
      mainWindow.setSize(960, 700);
      mainWindow.center();
    }
  }
});

ipcMain.handle('get-autostart', () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.handle('set-autostart', (event, enable) => {
  // Configure startup options
  const appPath = app.getPath('exe');
  
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: appPath,
    args: []
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  return saveData(data);
});

ipcMain.on('save-data-sync', (event, data) => {
  event.returnValue = saveData(data);
});

ipcMain.handle('get-system-idle-time', () => {
  return powerMonitor.getSystemIdleTime();
});

const { execSync } = require('child_process');

// Helper to resolve Windows .lnk shortcuts via PowerShell COM API
function resolveLnk(lnkPath) {
  try {
    const escapedPath = lnkPath.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "$sh = New-Object -ComObject WScript.Shell; $target = $sh.CreateShortcut('${escapedPath}').TargetPath; if ($target) { Write-Output $target }"`;
    const target = execSync(cmd).toString().trim();
    return target;
  } catch (e) {
    console.error("Failed to resolve LNK:", e);
    return null;
  }
}

// Recursively collect valid image paths, following directories and Windows LNK shortcuts
function collectImages(dir, depth = 0) {
  if (depth > 3) return []; // Prevent infinite loop in circular structures
  let images = [];
  try {
    if (!fs.existsSync(dir)) return [];
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        images = images.concat(collectImages(itemPath, depth + 1));
      } else {
        const ext = path.extname(item).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
          images.push(itemPath);
        } else if (ext === '.lnk') {
          const targetPath = resolveLnk(itemPath);
          if (targetPath && fs.existsSync(targetPath)) {
            const targetStat = fs.statSync(targetPath);
            if (targetStat.isDirectory()) {
              images = images.concat(collectImages(targetPath, depth + 1));
            } else {
              const targetExt = path.extname(targetPath).toLowerCase();
              if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(targetExt)) {
                images.push(targetPath);
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Error reading directory:", dir, err);
  }
  return images;
}

function getUserQuotesDirectories() {
  const dirs = [];
  const exeDir = path.dirname(app.getPath('exe'));
  const portableQuotesDir = path.join(exeDir, 'user-quotes');
  dirs.push(portableQuotesDir);

  const cwdQuotesDir = path.join(process.cwd(), 'user-quotes');
  if (!dirs.includes(cwdQuotesDir)) dirs.push(cwdQuotesDir);

  const appDataQuotesDir = path.join(app.getPath('userData'), 'user-quotes');
  if (!dirs.includes(appDataQuotesDir)) dirs.push(appDataQuotesDir);

  return dirs;
}

ipcMain.handle('get-random-quote-image', () => {
  try {
    const dirs = getUserQuotesDirectories();
    let imagePaths = [];
    
    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        imagePaths = imagePaths.concat(collectImages(dir));
      }
    });

    if (imagePaths.length > 0) {
      const randomPath = imagePaths[Math.floor(Math.random() * imagePaths.length)];
      const data = fs.readFileSync(randomPath);
      const base64 = data.toString('base64');
      const ext = path.extname(randomPath).toLowerCase();
      let mime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.webp') mime = 'image/webp';
      
      return { source: 'user', data: `data:${mime};base64,${base64}`, name: path.basename(randomPath) };
    }
  } catch (err) {
    console.error('Error reading user quotes folder:', err);
  }
  return { source: 'bundled', index: Math.floor(Math.random() * 3) + 1 };
});

ipcMain.handle('open-user-quotes-folder', async () => {
  const exeDir = path.dirname(app.getPath('exe'));
  let targetDir = path.join(exeDir, 'user-quotes');
  
  try {
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (e) {
        targetDir = path.join(app.getPath('userData'), 'user-quotes');
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      }
    }
  } catch (err) {
    targetDir = path.join(app.getPath('userData'), 'user-quotes');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const { shell } = require('electron');
  await shell.openPath(targetDir);
  return targetDir;
});

ipcMain.on('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});




