import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ShortcutManager } from './shortcut';
import { initializeAudioRecorder, setupAudioIPC, audioRecorder } from './audio';
import { initializeTaskManager, TaskManager } from './taskManager';

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
  mainWindow.on('close', async (event) => {
    if (!isQuitting) {
      event.preventDefault();
      // 如果有正在进行的录音，先停止
      const currentTask = await TaskManager.getCurrentRecordingTask();
      if (currentTask && audioRecorder?.getStatus().isRecording) {
        await audioRecorder.stopRecording();
        await TaskManager.updateTask(currentTask.id, { status: 'backlog' });
      }
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
  ipcMain.handle('app:quit', async () => {
    await quitApp();
  });

  // 任务相关的 IPC 处理器已经在 taskManager.ts 中注册
}

// 退出应用
async function quitApp() {
  isQuitting = true;
  
  // 如果有正在进行的录音，先停止
  const currentTask = await TaskManager.getCurrentRecordingTask();
  if (currentTask && audioRecorder?.getStatus().isRecording) {
    await audioRecorder.stopRecording();
    await TaskManager.updateTask(currentTask.id, { status: 'backlog' });
  }

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
  // 先初始化录音器和任务管理器
  initializeAudioRecorder();
  initializeTaskManager();
  setupAudioIPC();

  // 然后创建窗口和设置快捷键
  const mainWindow = createWindow();
  await initializeShortcutManager();
  setupIPC();

  // 通知渲染进程主进程已就绪
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app:ready');
  });

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
app.on('before-quit', async () => {
  isQuitting = true;
  // 如果有正在进行的录音，先停止
  const currentTask = await TaskManager.getCurrentRecordingTask();
  if (currentTask && audioRecorder?.getStatus().isRecording) {
    await audioRecorder.stopRecording();
    await TaskManager.updateTask(currentTask.id, { status: 'backlog' });
  }
  if (shortcutManager) {
    shortcutManager.cleanup();
  }
}); 