"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIPC = initializeIPC;
const electron_1 = require("electron");
const taskManager_1 = require("./taskManager");
const index_1 = require("./index");
const config_1 = require("./config");
// 初始化所有 IPC 处理器
function initializeIPC(shortcutManager) {
    // 应用相关的 IPC
    electron_1.ipcMain.handle('app:quit', async () => {
        await (0, index_1.quitApp)();
    });
    // 快捷键相关的 IPC
    electron_1.ipcMain.handle('shortcuts:get', () => {
        return shortcutManager?.getShortcuts() || [];
    });
    electron_1.ipcMain.handle('shortcuts:update', (_, action, config) => {
        shortcutManager?.updateShortcut(action, config);
    });
    // 任务相关的 IPC
    electron_1.ipcMain.handle('task:create', async (_, title, status) => {
        return await taskManager_1.TaskManager.createTask(title, status);
    });
    electron_1.ipcMain.handle('task:update', async (_, id, updates) => {
        await taskManager_1.TaskManager.updateTask(id, updates);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:getAll', async () => {
        return await taskManager_1.TaskManager.getAllTasks();
    });
    electron_1.ipcMain.handle('task:delete', async (_, id) => {
        await taskManager_1.TaskManager.deleteTask(id);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:openAudioFile', async (_, audioPath) => {
        taskManager_1.TaskManager.openAudioFile(audioPath);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:getCurrentRecording', async () => {
        return await taskManager_1.TaskManager.getCurrentRecordingTask();
    });
    // Whisper 配置相关的 IPC
    electron_1.ipcMain.handle('config:getWhisper', async () => {
        await config_1.configManager.initialize();
        return config_1.configManager.getConfigSection('whisper');
    });
    electron_1.ipcMain.handle('config:updateWhisper', async (_event, whisperConfig) => {
        await config_1.configManager.initialize();
        return await config_1.configManager.updateConfigSection('whisper', whisperConfig);
    });
    electron_1.ipcMain.handle('config:testWhisperConnection', async () => {
        await config_1.configManager.initialize();
        const whisper = config_1.configManager.getConfigSection('whisper');
        // 这里可以实现实际的 API 测试逻辑，暂时返回 success: true
        // TODO: 可用 fetch/axios 请求 whisper.baseUrl/health
        return { success: true, models: [whisper.defaultModel] };
    });
}
