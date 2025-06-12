"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const shortcut_1 = require("./shortcut");
const audio_1 = require("./audio");
const taskManager_1 = require("./taskManager");
let shortcutManager = null;
let isQuitting = false;
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5180');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load the built files
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    // 处理窗口关闭事件
    mainWindow.on('close', async (event) => {
        if (!isQuitting) {
            event.preventDefault();
            // 如果有正在进行的录音，先停止
            const currentTask = await taskManager_1.TaskManager.getCurrentRecordingTask();
            if (currentTask && audio_1.audioRecorder?.getStatus().isRecording) {
                await audio_1.audioRecorder.stopRecording();
                await taskManager_1.TaskManager.updateTask(currentTask.id, { status: 'backlog' });
            }
            mainWindow?.hide();
        }
    });
    return mainWindow;
}
// 初始化快捷键管理器
async function initializeShortcutManager() {
    shortcutManager = new shortcut_1.ShortcutManager();
    // 已迁移为 globalShortcut，无需辅助功能权限检查
}
// 设置 IPC 通信
function setupIPC() {
    // 获取所有快捷键配置
    electron_1.ipcMain.handle('shortcuts:get', () => {
        return shortcutManager?.getShortcuts() || [];
    });
    // 更新快捷键配置（用 action 作为唯一标识）
    electron_1.ipcMain.handle('shortcuts:update', (_, action, config) => {
        shortcutManager?.updateShortcut(action, config);
    });
    // 添加退出应用的 IPC 处理
    electron_1.ipcMain.handle('app:quit', async () => {
        await quitApp();
    });
    // 任务相关的 IPC 处理器已经在 taskManager.ts 中注册
}
// 退出应用
async function quitApp() {
    isQuitting = true;
    // 如果有正在进行的录音，先停止
    const currentTask = await taskManager_1.TaskManager.getCurrentRecordingTask();
    if (currentTask && audio_1.audioRecorder?.getStatus().isRecording) {
        await audio_1.audioRecorder.stopRecording();
        await taskManager_1.TaskManager.updateTask(currentTask.id, { status: 'backlog' });
    }
    // 清理快捷键管理器
    if (shortcutManager) {
        shortcutManager.cleanup();
        shortcutManager = null;
    }
    // 关闭所有窗口
    electron_1.BrowserWindow.getAllWindows().forEach(window => {
        window.destroy();
    });
    // 退出应用
    electron_1.app.quit();
}
electron_1.app.whenReady().then(async () => {
    // 先初始化录音器和任务管理器
    (0, audio_1.initializeAudioRecorder)();
    (0, taskManager_1.initializeTaskManager)();
    (0, audio_1.setupAudioIPC)();
    // 然后创建窗口和设置快捷键
    const mainWindow = createWindow();
    await initializeShortcutManager();
    setupIPC();
    // 通知渲染进程主进程已就绪
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app:ready');
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 处理所有窗口关闭事件
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        quitApp();
    }
});
// 处理应用退出前的事件
electron_1.app.on('before-quit', async () => {
    isQuitting = true;
    // 如果有正在进行的录音，先停止
    const currentTask = await taskManager_1.TaskManager.getCurrentRecordingTask();
    if (currentTask && audio_1.audioRecorder?.getStatus().isRecording) {
        await audio_1.audioRecorder.stopRecording();
        await taskManager_1.TaskManager.updateTask(currentTask.id, { status: 'backlog' });
    }
    if (shortcutManager) {
        shortcutManager.cleanup();
    }
});
