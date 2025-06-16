import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { ShortcutManager } from './shortcut';
import { initializeAudioRecorder, setupAudioIPC, audioRecorder } from './audio';
import { initializeTaskManager, TaskManager } from './taskManager';
import { initializeIPC } from './ipc';

let shortcutManager: ShortcutManager | null = null;
let isQuitting = false;
let tray: Tray | null = null;

function createTray(mainWindow: BrowserWindow) {
  // 创建托盘图标
  let iconPath: string;
  if (process.env.NODE_ENV === 'development') {
    // 在开发环境中，使用项目根目录
    iconPath = path.join(process.cwd(), 'src/assets/tray-icon.png');
  } else {
    // 在生产环境中，使用相对于编译后文件的路径
    iconPath = path.join(__dirname, '../assets/tray-icon.png');
  }
  
  console.log('Current working directory:', process.cwd());
  console.log('Tray icon path:', iconPath);

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.error('Failed to load tray icon from path:', iconPath);
      return null;
    }

    // 强制调整图标尺寸为 20x20
    const resizedIcon = icon.resize({
      width: 20,
      height: 20,
      quality: 'best'
    });

    // 创建托盘实例
    tray = new Tray(resizedIcon);
    
    // 设置托盘图标的模板模式（macOS 特性）
    if (process.platform === 'darwin') {
      resizedIcon.setTemplateImage(true);
    }
    
    tray.setToolTip('WhisperElectron');

    // 更新菜单的函数
    const updateMenu = async () => {
      const isRecording = audioRecorder?.getStatus().isRecording || false;
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Window',
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          }
        },
        { type: 'separator' },
        ...(isRecording ? [
          {
            label: 'Stop',
            click: () => {
              mainWindow.webContents.send('recording:stop');
            }
          },
          {
            label: 'Cancel',
            click: () => {
              mainWindow.webContents.send('recording:cancel');
            }
          }
        ] : [
          {
            label: 'Start',
            click: () => {
              mainWindow.webContents.send('recording:start');
            }
          }
        ]),
        { type: 'separator' },
        {
          label: 'Settings',
          click: () => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('app:openSettings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            quitApp();
          }
        }
      ]);

      tray?.setContextMenu(contextMenu);
    };

    // 初始创建菜单
    updateMenu();

    // 监听录音状态变化
    mainWindow.webContents.on('did-finish-load', () => {
      // 监听录音状态更新
      ipcMain.on('recording:status', () => {
        updateMenu();
      });
    });

    // 点击托盘图标显示主窗口
    tray.on('click', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    return tray;
  } catch (error) {
    console.error('Error creating tray:', error);
    return null;
  }
}

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

  // 创建托盘图标
  createTray(mainWindow);

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

  // 清理托盘
  if (tray) {
    tray.destroy();
    tray = null;
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

  // 添加 IPC 处理程序
  ipcMain.handle('app:minimizeToTray', () => {
    mainWindow?.hide();
  });

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