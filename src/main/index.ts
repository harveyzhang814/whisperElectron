import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ShortcutManager } from './shortcut';
import { initializeAudioRecorder, setupAudioIPC } from './audio';

let shortcutManager: ShortcutManager | null = null;
let isQuitting = false;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5180');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  return mainWindow;
}

// 初始化快捷键管理器
async function initializeShortcutManager() {
  shortcutManager = new ShortcutManager();
  // 已迁移为 globalShortcut，无需辅助功能权限检查
}

// 设置 IPC 通信
function setupIPC() {
  // 获取所有快捷键配置
  ipcMain.handle('shortcuts:get', () => {
    return shortcutManager?.getShortcuts() || [];
  });

  // 更新快捷键配置（用 action 作为唯一标识）
  ipcMain.handle('shortcuts:update', (_, action: string, config: any) => {
    shortcutManager?.updateShortcut(action as import('./shortcut').ShortcutAction, config);
  });

  // 添加退出应用的 IPC 处理
  ipcMain.handle('app:quit', () => {
    quitApp();
  });
}

// 退出应用
async function quitApp() {
  isQuitting = true;
  
  // 清理快捷键管理器
  if (shortcutManager) {
    shortcutManager.cleanup();
    shortcutManager = null;
  }

  // 关闭所有窗口
  BrowserWindow.getAllWindows().forEach(window => {
    window.destroy();
  });

  // 退出应用
  app.quit();
}

app.whenReady().then(async () => {
  createWindow();
  await initializeShortcutManager();
  initializeAudioRecorder();
  setupIPC();
  setupAudioIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 处理所有窗口关闭事件
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

// 处理应用退出前的事件
app.on('before-quit', () => {
  isQuitting = true;
  if (shortcutManager) {
    shortcutManager.cleanup();
  }
}); 