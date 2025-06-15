import { ipcMain } from 'electron';
import { ShortcutManager } from './shortcut';
import { TaskManager } from './taskManager';
import { quitApp } from './index';

// 初始化所有 IPC 处理器
export function initializeIPC(shortcutManager: ShortcutManager) {
  // 应用相关的 IPC
  ipcMain.handle('app:quit', async () => {
    await quitApp();
  });

  // 快捷键相关的 IPC
  ipcMain.handle('shortcuts:get', () => {
    return shortcutManager?.getShortcuts() || [];
  });

  ipcMain.handle('shortcuts:update', (_, action: string, config: any) => {
    shortcutManager?.updateShortcut(action as import('./shortcut').ShortcutAction, config);
  });

  // 任务相关的 IPC
  ipcMain.handle('task:create', async (_, title: string, status: import('../renderer/types/task').Task['status']) => {
    return await TaskManager.createTask(title, status);
  });

  ipcMain.handle('task:update', async (_, id: string, updates: Partial<import('../renderer/types/task').Task>) => {
    await TaskManager.updateTask(id, updates);
    return { success: true };
  });

  ipcMain.handle('task:getAll', async () => {
    return await TaskManager.getAllTasks();
  });

  ipcMain.handle('task:delete', async (_, id: string) => {
    await TaskManager.deleteTask(id);
    return { success: true };
  });

  ipcMain.handle('task:openAudioFile', async (_, audioPath: string) => {
    TaskManager.openAudioFile(audioPath);
    return { success: true };
  });

  ipcMain.handle('task:getCurrentRecording', async () => {
    return await TaskManager.getCurrentRecordingTask();
  });
} 