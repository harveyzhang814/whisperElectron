import { ipcMain } from 'electron';
import { ShortcutManager } from './shortcut';
import { FullTaskManager } from './experimental/managers/FullTaskManager';
import { RecordingSubTaskManager } from './experimental/managers/RecordingSubTaskManager';
import { quitApp } from './index';
import { configManager } from './config';
import { whisperManager } from './whisper/manager';
import { TaskState, TaskMetadata } from './experimental/types/task';

// 全局任务管理器实例（在index.ts中初始化）
let fullTaskManager: FullTaskManager | null = null;
let recordingManager: RecordingSubTaskManager | null = null;

// 设置任务管理器实例（由index.ts调用）
export function setTaskManagers(
  taskManager: FullTaskManager,
  recordingTaskManager: RecordingSubTaskManager
) {
  fullTaskManager = taskManager;
  recordingManager = recordingTaskManager;

  // 设置任务事件监听器，转发任务状态变化到前端
  fullTaskManager.subscribeToTaskEvents((_event) => {
    // 转发任务事件到所有渲染进程
    const windows = require('electron').BrowserWindow.getAllWindows();
    windows.forEach((window: any) => {
      if (!window.isDestroyed()) {
        window.webContents.send('task:refresh');
      }
    });
  });
}

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

  // 录音相关的 IPC - 使用新的RecordingSubTaskManager
  ipcMain.handle('recording:start', async (_, taskId?: string) => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      let resultTaskId: string;

      if (taskId) {
        // 如果传入了taskId，则启动指定任务的录音
        const task = await fullTaskManager!.getTask(taskId);
        if (!task) {
          return { success: false, error: 'Task not found' };
        }

        // 检查任务状态是否为 CREATED 或 CANCELLED
        if (task.state !== TaskState.CREATED && task.state !== TaskState.CANCELLED) {
          return { 
            success: false, 
            error: `Cannot start recording for task in ${task.state} state. Only CREATED or CANCELLED tasks can be started.` 
          };
        }

        // 启动指定任务的录音
        await fullTaskManager!.startTask(taskId);
        resultTaskId = taskId;
      } else {
        // 如果没有传入taskId，则创建新任务并启动录音（原逻辑）
        const taskMetadata: TaskMetadata = {
          name: 'New Recording',
          description: 'Audio recording task',
          tags: ['recording'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const task = await fullTaskManager!.createTask('RECORDING', taskMetadata);

        // 启动录音任务
        await fullTaskManager!.startTask(task.id);
        resultTaskId = task.id;
      }

      return { success: true, taskId: resultTaskId };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('recording:stop', async (_, taskId?: string) => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      let targetTaskId: string;

      if (taskId) {
        // 如果传入了taskId，则停止指定任务的录音
        const task = await fullTaskManager!.getTask(taskId);
        if (!task) {
          return { success: false, error: 'Task not found' };
        }

        // 检查任务状态是否为 RUNNING
        if (task.state !== TaskState.RUNNING) {
          return { 
            success: false, 
            error: `Cannot stop recording for task in ${task.state} state. Only RUNNING tasks can be stopped.` 
          };
        }

        targetTaskId = taskId;
      } else {
        // 如果没有传入taskId，则按照原逻辑停止当前录音
        const currentTaskId = recordingManager.getCurrentRecordingTaskId();
        if (!currentTaskId) {
          return { success: false, error: 'No active recording found' };
        }
        targetTaskId = currentTaskId;
      }

      // 停止录音任务 - 调用子任务管理器的stopTask方法
      await fullTaskManager!.getSubTaskManager('RECORDING')!.stopTask(targetTaskId);

      return { success: true, taskId: targetTaskId };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('recording:cancel', async () => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      const currentTaskId = recordingManager.getCurrentRecordingTaskId();
      if (!currentTaskId) {
        return { success: false, error: 'No active recording found' };
      }

      // 取消录音任务 - 调用子任务管理器的cancelTask方法
      await fullTaskManager!.getSubTaskManager('RECORDING')!.cancelTask(currentTaskId);

      return { success: true, taskId: currentTaskId };
    } catch (error) {
      console.error('Error cancelling recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('recording:getStatus', () => {
    if (!recordingManager) {
      return { isRecording: false };
    }
    return recordingManager.getRecordingStatus();
  });

  ipcMain.handle('recording:getCurrentTask', async () => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      const currentTaskId = recordingManager.getCurrentRecordingTaskId();
      if (!currentTaskId) {
        return { success: true, task: null };
      }

      const task = await fullTaskManager!.getTask(currentTaskId);
      return { success: true, task };
    } catch (error) {
      console.error('Error getting current recording task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // 任务相关的 IPC - 使用新的FullTaskManager
  ipcMain.handle('task:create', async (_, title: string) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const taskMetadata: TaskMetadata = {
        name: title,
        description: 'Recording task',
        tags: ['recording'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const task = await fullTaskManager.createTask('RECORDING', taskMetadata);

      return { success: true, task };
    } catch (error) {
      console.error('Error creating task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('task:update', async (_, id: string, updates: any) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const task = await fullTaskManager.getTask(id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 更新任务元数据
      if (updates.name) {
        task.metadata.name = updates.name;
      }
      if (updates.description) {
        task.metadata.description = updates.description;
      }
      if (updates.tags) {
        task.metadata.tags = updates.tags;
      }
      task.metadata.updatedAt = Date.now();

      // 更新任务状态
      if (updates.state) {
        await fullTaskManager.updateTaskState(id, updates.state as TaskState);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('task:getAll', async () => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const tasks = await fullTaskManager.getTasks(undefined, {
        field: 'createdAt',
        order: 'desc'
      });
      return { success: true, tasks };
    } catch (error) {
      console.error('Error getting all tasks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('task:delete', async (_, id: string) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      await fullTaskManager.deleteTask(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('task:getCurrentRecording', async () => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      const currentTaskId = recordingManager.getCurrentRecordingTaskId();
      if (!currentTaskId) {
        return { success: true, task: null };
      }

      const task = await fullTaskManager!.getTask(currentTaskId);
      return { success: true, task };
    } catch (error) {
      console.error('Error getting current recording task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // 兼容旧的audio:接口，直接调用新的recording:接口
  ipcMain.handle('audio:start', async () => {
    return await ipcMain.handle('recording:start', async () => {
      try {
        if (!recordingManager) {
          return { success: false, error: 'Recording manager not initialized' };
        }

        const taskMetadata: TaskMetadata = {
          name: 'New Recording',
          description: 'Audio recording task',
          tags: ['recording'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const task = await fullTaskManager!.createTask('RECORDING', taskMetadata);
        await fullTaskManager!.startTask(task.id);

        return { success: true, taskId: task.id };
      } catch (error) {
        console.error('Error starting recording:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  });

  ipcMain.handle('audio:stop', async () => {
    return await ipcMain.handle('recording:stop', async () => {
      try {
        if (!recordingManager) {
          return { success: false, error: 'Recording manager not initialized' };
        }

        const currentTaskId = recordingManager.getCurrentRecordingTaskId();
        if (!currentTaskId) {
          return { success: false, error: 'No active recording found' };
        }

        await fullTaskManager!.updateTaskState(currentTaskId, TaskState.COMPLETED);
        return { success: true, taskId: currentTaskId };
      } catch (error) {
        console.error('Error stopping recording:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  });

  ipcMain.handle('audio:cancel', async () => {
    return await ipcMain.handle('recording:cancel', async () => {
      try {
        if (!recordingManager) {
          return { success: false, error: 'Recording manager not initialized' };
        }

        const currentTaskId = recordingManager.getCurrentRecordingTaskId();
        if (!currentTaskId) {
          return { success: false, error: 'No active recording found' };
        }

        await fullTaskManager!.updateTaskState(currentTaskId, TaskState.CANCELLED);
        return { success: true, taskId: currentTaskId };
      } catch (error) {
        console.error('Error cancelling recording:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
  });

  ipcMain.handle('audio:getStatus', () => {
    if (!recordingManager) {
      return { isRecording: false };
    }
    return recordingManager.getRecordingStatus();
  });

  ipcMain.handle('audio:openFile', async (_event, audioPath: string) => {
    const { shell } = require('electron');
    if (audioPath) {
      shell.showItemInFolder(audioPath);
    }
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

  ipcMain.handle('whisper:cancel', async (_, jobId: string) => {
    try {
      const cancelled = whisperManager.cancelTranscribe(jobId);
      return { success: cancelled };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:getJob', async (_, jobId: string) => {
    try {
      const job = whisperManager.getTranscriptionJob(jobId);
      return { success: true, job };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('whisper:getAllJobs', async () => {
    try {
      const jobs = whisperManager.getAllTranscriptionJobs();
      return { success: true, jobs };
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
      const baseConfig = configManager.getConfigSection('whisper');
      const config = {
        ...baseConfig,
        retryDelay: 1000,
        defaultLanguage: baseConfig.language || 'auto',
        defaultOutputFormat: 'json' as const,
        enableWordTimestamps: false,
        enableConfidence: false
      };
      const result = await whisperManager.testNewConnection(config);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
} 