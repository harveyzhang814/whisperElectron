import { app, BrowserWindow } from 'electron';
import path from 'path';
import { ShortcutManager } from './shortcut';
import { initializeAudioRecorder, setupAudioIPC, audioRecorder } from './audio';
import { initializeTaskManager, TaskManager } from './taskManager';
import { initializeIPC } from './ipc';

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

// 退出应用
export async function quitApp() {
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
  // 先初始化录音器
  initializeAudioRecorder();

  // 初始化任务管理器
  initializeTaskManager();
  setupAudioIPC();

  // 然后创建窗口和设置快捷键
  const mainWindow = createWindow();
  await initializeShortcutManager();
  
  // 初始化 IPC 通信
  if (shortcutManager) {
    initializeIPC(shortcutManager);
  }

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