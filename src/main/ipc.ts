import { ipcMain } from 'electron';
import { ShortcutManager } from './shortcut';
import { TaskManager } from './taskManager';
import { quitApp } from './index';
import { configManager } from './config';
import { whisperManager } from './whisper/manager';

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

  // Whisper 配置相关的 IPC
  ipcMain.handle('config:getWhisper', async () => {
    await configManager.initialize();
    return configManager.getConfigSection('whisper');
  });

  ipcMain.handle('config:updateWhisper', async (_event, whisperConfig) => {
    await configManager.initialize();
    const result = await configManager.updateConfigSection('whisper', whisperConfig);
    whisperManager.reinitializeClient();
    return result;
  });

  // Whisper 转写相关的 IPC
  ipcMain.handle('whisper:transcribe', async (event, filePath: string, options = {}) => {
    try {
      const result = await whisperManager.transcribe(filePath, options, (progress) => {
        event.sender.send('whisper:progress', progress);
      });
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:cancel', async (_, taskId: string) => {
    try {
      const cancelled = whisperManager.cancelTranscribe(taskId);
      return { success: cancelled };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:getTask', async (_, taskId: string) => {
    try {
      const task = whisperManager.getTask(taskId);
      return { success: true, task };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:getAllTasks', async () => {
    try {
      const tasks = whisperManager.getAllTasks();
      return { success: true, tasks };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:getModels', async () => {
    try {
      const models = await whisperManager.getModels();
      return { success: true, models };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:checkHealth', async () => {
    try {
      const health = await whisperManager.checkHealth();
      return { success: true, health };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:testConnection', async () => {
    try {
      const connected = await whisperManager.testConnection();
      return { success: connected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
} 