/**
 * This module provides IPC (Inter-Process Communication) handlers for the WhisperElectron application.
 * It manages communication between the main process and renderer process, handling all task-related
 * operations including recording, transcription, configuration, and application lifecycle.
 */

import { ipcMain } from 'electron';
import { ShortcutManager } from './shortcut';
import { FullTaskManager } from './managers/FullTaskManager';
import { RecordingSubTaskManager } from './managers/RecordingSubTaskManager';
import { TranscriptionSubTaskManager } from './managers/TranscriptionSubTaskManager';
import { ImportSubTaskManager } from './managers/ImportSubTaskManager';
import { quitApp } from './index';
import { configManager } from './config';
import { whisperManager } from './whisper/manager';
import { 
  UnifiedTaskOptions,
  AudioSourceType,
  TaskStage,
  StageState
} from './types/task';

// 全局任务管理器实例（在index.ts中初始化）
let fullTaskManager: FullTaskManager | null = null;
let recordingManager: RecordingSubTaskManager | null = null;
let transcriptionManager: TranscriptionSubTaskManager | null = null;
let importManager: ImportSubTaskManager | null = null;

/**
 * Sets the task manager instances for IPC handlers to use.
 * This function is called by index.ts after initializing the task managers.
 * 
 * @param taskManager - The main FullTaskManager instance
 * @param recordingTaskManager - The RecordingSubTaskManager instance
 * @param transcriptionTaskManager - The TranscriptionSubTaskManager instance
 * @param importTaskManager - The ImportSubTaskManager instance
 */
export function setTaskManagers(
  taskManager: FullTaskManager,
  recordingTaskManager: RecordingSubTaskManager,
  transcriptionTaskManager: TranscriptionSubTaskManager,
  importTaskManager: ImportSubTaskManager
) {
  fullTaskManager = taskManager;
  recordingManager = recordingTaskManager;
  transcriptionManager = transcriptionTaskManager;
  importManager = importTaskManager;

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

/**
 * Initializes all IPC handlers for the application.
 * This function sets up all the communication channels between main and renderer processes.
 * 
 * @param shortcutManager - The ShortcutManager instance for handling global shortcuts
 */
export function initializeIPC(shortcutManager: ShortcutManager) {

  /**
   * Application Lifecycle IPC Handlers
   */

  /**
   * Handles application quit request from renderer process.
   * Initiates the application shutdown process.
   */
  ipcMain.handle('app:quit', async () => {
    await quitApp();
  });

  /**
   * Shortcut Management IPC Handlers
   */

  /**
   * Retrieves all configured shortcuts from the ShortcutManager.
   * Returns an array of shortcut configurations for the renderer process.
   */
  ipcMain.handle('shortcuts:get', () => {
    return shortcutManager?.getShortcuts() || [];
  });

  /**
   * Updates a specific shortcut configuration.
   * 
   * @param _ - Event object (unused)
   * @param action - The shortcut action to update
   * @param config - The new shortcut configuration
   */
  ipcMain.handle('shortcuts:update', (_, action: string, config: any) => {
    shortcutManager?.updateShortcut(action as import('./shortcut').ShortcutAction, config);
  });

  /**
   * Recording Task IPC Handlers
   * These handlers manage audio recording tasks using the RecordingSubTaskManager.
   */

  /**
   * Starts a recording task. Can either start a new recording or resume an existing one.
   * 
   * @param _ - Event object (unused)
   * @param taskId - Optional task ID. If provided, starts/resumes the specified task.
   *                 If not provided, creates a new recording task.
   * @returns Object with success status and task ID
   */
  ipcMain.handle('recording:start', async (_, taskId?: string) => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      let resultTaskId: string;

      if (taskId) {
        // 如果传入了taskId，则启动指定任务的录音阶段
        const task = await fullTaskManager!.getTask(taskId);
        if (!task) {
          return { success: false, error: 'Task not found' };
        }

        // 检查音频源阶段状态
        const audioSourceStage = task.stages[TaskStage.AUDIO_SOURCE];
        if (audioSourceStage.state !== StageState.PENDING && 
            audioSourceStage.state !== StageState.FAILED) {
          return { 
            success: false, 
            error: `Cannot start recording for task with audio source stage in ${audioSourceStage.state} state. Only PENDING or FAILED stages can be started.` 
          };
        }

        // 启动指定任务的录音阶段
        await recordingManager.startTaskStage(taskId);
        resultTaskId = taskId;
      } else {
        // 如果没有传入taskId，则创建新任务并启动录音
        const taskOptions: UnifiedTaskOptions = {
          name: 'New Recording',
          description: 'Audio recording task',
          tags: ['recording'],
          audioSourceType: AudioSourceType.RECORDING
        };

        const task = await fullTaskManager!.createUnifiedTask(taskOptions);

        // 初始化录音阶段
        await recordingManager.initializeTaskStage(task.id, {
          name: task.metadata.name,
          description: task.metadata.description,
          tags: task.metadata.tags
        });

        // 启动录音阶段
        await recordingManager.startTaskStage(task.id);
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

  /**
   * Stops a recording task. Can stop a specific task or the currently active recording.
   * 
   * @param _ - Event object (unused)
   * @param taskId - Optional task ID. If provided, stops the specified task.
   *                 If not provided, stops the currently active recording.
   * @returns Object with success status and task ID
   */
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

        // 检查音频源阶段状态
        const audioSourceStage = task.stages[TaskStage.AUDIO_SOURCE];
        if (audioSourceStage.state !== StageState.IN_PROGRESS) {
          return { 
            success: false, 
            error: `Cannot stop recording for task with audio source stage in ${audioSourceStage.state} state. Only IN_PROGRESS stages can be stopped.` 
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

      // 完成录音阶段
      await recordingManager.completeTaskStage(targetTaskId);

      return { success: true, taskId: targetTaskId };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Cancels the currently active recording task.
   * This immediately stops recording and marks the task as cancelled.
   * 
   * @returns Object with success status and task ID
   */
  ipcMain.handle('recording:cancel', async () => {
    try {
      if (!recordingManager) {
        return { success: false, error: 'Recording manager not initialized' };
      }

      const currentTaskId = recordingManager.getCurrentRecordingTaskId();
      if (!currentTaskId) {
        return { success: false, error: 'No active recording found' };
      }

      // 取消录音阶段
      await recordingManager.cancelTaskStage(currentTaskId);

      return { success: true, taskId: currentTaskId };
    } catch (error) {
      console.error('Error cancelling recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Gets the current recording status from the RecordingSubTaskManager.
   * Returns information about whether recording is active and current task details.
   * 
   * @returns Recording status object
   */
  ipcMain.handle('recording:getStatus', () => {
    if (!recordingManager) {
      return { isRecording: false };
    }
    return recordingManager.getRecordingStatus();
  });

  /**
   * Gets the currently active recording task details.
   * Returns the full task object for the currently recording task.
   * 
   * @returns Object with success status and task details
   */
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

  /**
   * General Task Management IPC Handlers
   * These handlers provide general task management operations using the FullTaskManager.
   */

  /**
   * Creates a new unified task with the specified options.
   * 
   * @param _ - Event object (unused)
   * @param options - Unified task creation options (optional)
   * @returns Object with success status and created task
   */
  ipcMain.handle('unified:create', async (_, options?: Partial<UnifiedTaskOptions>) => {
    try {
      console.log('🎯 [IPC] unified:create called with options:', options);
      
      if (!fullTaskManager) {
        console.error('❌ [IPC] Task manager not initialized');
        return { success: false, error: 'Task manager not initialized' };
      }

      // 从 options 中提取类型和元数据（如果提供的话）
      let type = 'RECORDING'; // 默认类型
      let metadata: any = {};

      if (options) {
        type = options.audioSourceType === 'RECORDING' ? 'RECORDING' : 'IMPORT';
        metadata = {
          name: options.name,
          description: options.description,
          tags: options.tags
        };
      }

      console.log('📝 [IPC] Creating task with type:', type, 'and metadata:', metadata);
      const task = await fullTaskManager.createTask(type, metadata);
      
      console.log('✅ [IPC] Task created successfully:', {
        id: task.id,
        type: task.type,
        state: task.state,
        stages: task.stages
      });
      
      return { success: true, task };
    } catch (error) {
      console.error('❌ [IPC] Error creating unified task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Retrieves a specific unified task by ID.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID to retrieve
   * @returns Object with success status and task
   */
  ipcMain.handle('unified:get', async (_, taskId: string) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const task = await fullTaskManager.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      return { success: true, task };
    } catch (error) {
      console.error('Error getting unified task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Retrieves all unified tasks from the FullTaskManager.
   * Returns tasks sorted by creation date in descending order.
   * 
   * @returns Object with success status and array of tasks
   */
  ipcMain.handle('unified:getAll', async () => {
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
      console.error('Error getting all unified tasks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Updates a unified task with the specified updates.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID to update
   * @param updates - The updates to apply
   * @returns Object with success status and updated task
   */
  ipcMain.handle('unified:update', async (_, taskId: string, updates: any) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const task = await fullTaskManager.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // Update task metadata
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

      // Update task state if provided
      if (updates.state) {
        await fullTaskManager.updateTaskState(taskId, updates.state);
      }

      // Save the updated task
      await fullTaskManager.getStorage().saveTask(task);

      return { success: true, task };
    } catch (error) {
      console.error('Error updating unified task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Deletes a unified task from the FullTaskManager.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID to delete
   * @returns Object with success status
   */
  ipcMain.handle('unified:delete', async (_, taskId: string) => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      await fullTaskManager.deleteTask(taskId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting unified task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Starts a specific stage of a unified task.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID
   * @param stage - The stage to start ('AUDIO_SOURCE' or 'TRANSCRIPTION')
   * @returns Object with success status
   */
  ipcMain.handle('unified:startStage', async (_, taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => {
      try {
      console.log('🎯 [IPC] unified:startStage called with taskId:', taskId, 'stage:', stage);
      
      if (!fullTaskManager) {
        console.error('❌ [IPC] Task manager not initialized');
        return { success: false, error: 'Task manager not initialized' };
      }

      // 获取任务信息
      const task = await fullTaskManager.getTask(taskId);
      console.log('📋 [IPC] Task found:', {
        id: task?.id,
        type: task?.type,
        state: task?.state,
        stages: task?.stages
      });

      if (stage === 'AUDIO_SOURCE') {
        if (!recordingManager) {
          console.error('❌ [IPC] Recording manager not initialized');
          return { success: false, error: 'Recording manager not initialized' };
        }
        console.log('🚀 [IPC] Starting AUDIO_SOURCE stage with recording manager...');
        await recordingManager.startTaskStage(taskId);
        console.log('✅ [IPC] AUDIO_SOURCE stage started successfully');
      } else if (stage === 'TRANSCRIPTION') {
        if (!transcriptionManager) {
          console.error('❌ [IPC] Transcription manager not initialized');
          return { success: false, error: 'Transcription manager not initialized' };
        }
        console.log('🚀 [IPC] Starting TRANSCRIPTION stage with transcription manager...');
        await transcriptionManager.startTaskStage(taskId);
        console.log('✅ [IPC] TRANSCRIPTION stage started successfully');
      }

      return { success: true };
      } catch (error) {
      console.error('❌ [IPC] Error starting task stage:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

  /**
   * Stops a specific stage of a unified task.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID
   * @param stage - The stage to stop ('AUDIO_SOURCE' or 'TRANSCRIPTION')
   * @returns Object with success status
   */
  ipcMain.handle('unified:stopStage', async (_, taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      if (stage === 'AUDIO_SOURCE') {
        if (!recordingManager) {
          return { success: false, error: 'Recording manager not initialized' };
        }
        await recordingManager.stopTaskStage(taskId);
      } else if (stage === 'TRANSCRIPTION') {
        if (!transcriptionManager) {
          return { success: false, error: 'Transcription manager not initialized' };
        }
        await transcriptionManager.stopTaskStage(taskId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error stopping task stage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Cancels a specific stage of a unified task.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID
   * @param stage - The stage to cancel ('AUDIO_SOURCE' or 'TRANSCRIPTION')
   * @returns Object with success status
   */
  ipcMain.handle('unified:cancelStage', async (_, taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => {
      try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      if (stage === 'AUDIO_SOURCE') {
        if (!recordingManager) {
          return { success: false, error: 'Recording manager not initialized' };
        }
        await recordingManager.cancelTaskStage(taskId);
      } else if (stage === 'TRANSCRIPTION') {
        if (!transcriptionManager) {
          return { success: false, error: 'Transcription manager not initialized' };
        }
        await transcriptionManager.cancelTaskStage(taskId);
      }

      return { success: true };
      } catch (error) {
      console.error('Error canceling task stage:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

  /**
   * Configuration Management IPC Handlers
   * These handlers manage application configuration settings.
   */

  /**
   * Retrieves the current Whisper API configuration.
   * 
   * @returns Whisper API configuration object
   */
  ipcMain.handle('config:getWhisper', async () => {
    await configManager.initialize();
    return configManager.getConfigSection('whisper');
  });

  /**
   * Updates the Whisper API configuration and reinitializes the client.
   * 
   * @param _event - Event object (unused)
   * @param whisperConfig - New Whisper API configuration
   * @returns Configuration update result
   */
  ipcMain.handle('config:updateWhisper', async (_event, whisperConfig) => {
    await configManager.initialize();
    const result = await configManager.updateConfigSection('whisper', whisperConfig);
    whisperManager.reinitializeClient();
    return result;
  });

  /**
   * Direct Whisper API Handlers
   * These handlers provide direct access to the Whisper API for testing and debugging.
   * Note: These are legacy handlers and should be replaced with transcription task handlers.
   */

  /**
   * Starts a direct Whisper transcription job.
   * This bypasses the task system and directly calls the Whisper API.
   * 
   * @param _event - Event object (unused)
   * @param audioFilePath - Path to the audio file to transcribe
   * @param options - Transcription options
   * @returns Object with success status and transcription result
   */
  ipcMain.handle('whisper:transcribe', async (_event, audioFilePath: string, options?: any) => {
    try {
      if (!whisperManager) {
        return { success: false, error: 'Whisper manager not initialized' };
      }

      const result = await whisperManager.transcribe(audioFilePath, options);
      return { success: true, result };
    } catch (error) {
      console.error('Error in direct transcription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Cancels a direct Whisper transcription job.
   * 
   * @param _event - Event object (unused)
   * @param jobId - The transcription job ID to cancel
   * @returns Object with success status
   */
  ipcMain.handle('whisper:cancel', async (_event, jobId: string) => {
    try {
      if (!whisperManager) {
        return { success: false, error: 'Whisper manager not initialized' };
      }

      const cancelled = whisperManager.cancelTranscribe(jobId);
      return { success: cancelled };
    } catch (error) {
      console.error('Error cancelling transcription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Gets a specific Whisper transcription job by ID.
   * 
   * @param _event - Event object (unused)
   * @param jobId - The transcription job ID to retrieve
   * @returns Object with success status and job details
   */
  ipcMain.handle('whisper:getJob', async (_event, jobId: string) => {
    try {
      if (!whisperManager) {
        return { success: false, error: 'Whisper manager not initialized' };
      }

      const job = whisperManager.getTranscriptionJob(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      return { success: true, job };
    } catch (error) {
      console.error('Error getting transcription job:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Gets all active Whisper transcription jobs.
   * 
   * @returns Object with success status and array of jobs
   */
  ipcMain.handle('whisper:getAllJobs', () => {
    try {
      if (!whisperManager) {
        return { success: false, error: 'Whisper manager not initialized' };
      }

      const jobs = whisperManager.getAllTranscriptionJobs();
      return { success: true, jobs };
    } catch (error) {
      console.error('Error getting all transcription jobs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * Gets available Whisper models from the API.
   * 
   * @returns Object with success status and array of available models
   */
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

  /**
   * Checks the health status of the Whisper API service.
   * 
   * @returns Object with success status and health information
   */
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

  /**
   * Tests a new Whisper API connection with the current configuration.
   * This is useful for validating configuration changes before applying them.
   * 
   * @returns Object with success status and connection test results
   */
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

  /**
   * Transcription Task IPC Handlers
   * These handlers manage transcription tasks using the TranscriptionSubTaskManager.
   * They provide a task-based approach to transcription, integrating with the FullTaskManager.
   */

  /**
   * Starts a transcription task for a specific audio file.
   * Creates a new transcription task and associates it with the provided audio file.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The task ID to start transcription for
   * @param audioFilePath - Path to the audio file to transcribe
   * @param options - Optional transcription configuration options
   * @returns Object with success status and transcription task ID
   */
  ipcMain.handle('transcription:start', async (_, taskId: string, audioFilePath: string, options?: any) => {
    try {
      if (!transcriptionManager) {
        return { success: false, error: 'Transcription manager not initialized' };
      }

      // 获取任务
      const task = await fullTaskManager!.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 检查音频源阶段是否已完成
      const audioSourceStage = task.stages[TaskStage.AUDIO_SOURCE];
      if (audioSourceStage.state !== StageState.COMPLETED) {
        return { 
          success: false, 
          error: `Cannot start transcription for task with audio source stage in ${audioSourceStage.state} state. Audio source must be completed first.` 
        };
      }

      // 检查转录阶段状态
      const transcriptionStage = task.stages[TaskStage.TRANSCRIPTION];
      if (transcriptionStage.state !== StageState.PENDING && 
          transcriptionStage.state !== StageState.FAILED) {
        return { 
          success: false, 
          error: `Cannot start transcription for task with transcription stage in ${transcriptionStage.state} state. Only PENDING or FAILED stages can be started.` 
        };
      }

      // 初始化转录阶段
      await transcriptionManager.initializeTaskStage(taskId, {
        name: `Transcription for ${task.metadata.name}`,
        description: `Transcription task for audio file: ${audioFilePath}`,
        tags: ['transcription', ...(task.metadata.tags || [])],
        audioFilePath,
        options
      });

      // 启动转录阶段
      await transcriptionManager.startTaskStage(taskId);

      return { success: true, taskId };
    } catch (error) {
      console.error('Error starting transcription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Cancels a transcription task.
   * Immediately stops the transcription process and marks the task as cancelled.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The transcription task ID to cancel
   * @returns Object with success status
   */
  ipcMain.handle('transcription:cancel', async (_, taskId: string) => {
    try {
      if (!transcriptionManager) {
        return { success: false, error: 'Transcription manager not initialized' };
      }

      const task = await fullTaskManager!.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 检查转录阶段状态
      const transcriptionStage = task.stages[TaskStage.TRANSCRIPTION];
      if (transcriptionStage.state !== StageState.IN_PROGRESS) {
        return { 
          success: false, 
          error: `Cannot cancel transcription for task with transcription stage in ${transcriptionStage.state} state. Only IN_PROGRESS stages can be cancelled.` 
        };
      }

      // 取消转录阶段
      await transcriptionManager.cancelTaskStage(taskId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling transcription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Gets the current transcription status from the TranscriptionSubTaskManager.
   * Returns information about active transcription tasks and their counts.
   * 
   * @returns Object with transcription status information
   */
  ipcMain.handle('transcription:getStatus', () => {
    if (!transcriptionManager) {
      return { isTranscribing: false, activeCount: 0, activeTaskIds: [] };
    }
    return {
      isTranscribing: transcriptionManager.isTranscribing(),
      activeCount: transcriptionManager.getActiveTranscriptionCount(),
      activeTaskIds: transcriptionManager.getCurrentTranscriptionTaskIds()
    };
  });

  /**
   * Gets a specific transcription task by ID.
   * Returns the full task object including transcription-specific data.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The transcription task ID to retrieve
   * @returns Object with success status and task details
   */
  ipcMain.handle('transcription:getTask', async (_, taskId: string) => {
    try {
      if (!transcriptionManager) {
        return { success: false, error: 'Transcription manager not initialized' };
      }

      const task = await fullTaskManager!.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 获取转录阶段的管理任务
      const managedTask = transcriptionManager.getManagedTask(taskId);
      if (managedTask) {
        return { success: true, task: managedTask };
      }

      return { success: true, task };
    } catch (error) {
      console.error('Error getting transcription task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Gets all transcription tasks from the FullTaskManager.
   * Returns transcription tasks sorted by creation date in descending order.
   * 
   * @returns Object with success status and array of transcription tasks
   */
  ipcMain.handle('transcription:getAll', async () => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const tasks = await fullTaskManager.getTasks(
        { 
          stageStates: { [TaskStage.TRANSCRIPTION]: StageState.COMPLETED }
        },
        {
          field: 'createdAt',
          order: 'desc'
        }
      );
      return { success: true, tasks };
    } catch (error) {
      console.error('Error getting all transcription tasks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Audio Import Task IPC Handlers
   * These handlers manage audio file import tasks using the ImportSubTaskManager.
   */

  /**
   * Starts an audio import task for a specific file.
   * Creates a new import task and processes the provided audio file.
   * 
   * @param _ - Event object (unused)
   * @param filePath - Path to the audio file to import
   * @param options - Optional import configuration options
   * @returns Object with success status and task ID
   */
  ipcMain.handle('import:start', async (_, filePath: string, options?: any) => {
    try {
      if (!importManager) {
        return { success: false, error: 'Import manager not initialized' };
      }

      if (!filePath) {
        return { success: false, error: 'File path is required' };
      }

      // 创建新的导入任务
      const taskOptions: UnifiedTaskOptions = {
        name: `Import ${require('path').basename(filePath)}`,
        description: `Audio import task for file: ${filePath}`,
        tags: ['import'],
        audioSourceType: AudioSourceType.IMPORT,
        importConfig: {
          filePath,
          outputDirectory: options?.outputDirectory
        }
      };

      const task = await fullTaskManager!.createUnifiedTask(taskOptions);

      // 初始化导入阶段
      await importManager.initializeTaskStage(task.id, {
        name: task.metadata.name,
        description: task.metadata.description,
        tags: task.metadata.tags,
        filePath,
        options
      });

      // 启动导入阶段
      await importManager.startTaskStage(task.id);

      return { success: true, taskId: task.id };
    } catch (error) {
      console.error('Error starting import:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Cancels an audio import task.
   * Immediately stops the import process and marks the task as cancelled.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The import task ID to cancel
   * @returns Object with success status
   */
  ipcMain.handle('import:cancel', async (_, taskId: string) => {
    try {
      if (!importManager) {
        return { success: false, error: 'Import manager not initialized' };
      }

      const task = await fullTaskManager!.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 检查导入阶段状态
      const audioSourceStage = task.stages[TaskStage.AUDIO_SOURCE];
      if (audioSourceStage.state !== StageState.IN_PROGRESS) {
        return { 
          success: false, 
          error: `Cannot cancel import for task with audio source stage in ${audioSourceStage.state} state. Only IN_PROGRESS stages can be cancelled.` 
        };
      }

      // 取消导入阶段
      await importManager.cancelTaskStage(taskId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling import:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Gets the current import status from the ImportSubTaskManager.
   * Returns information about active import tasks and their counts.
   * 
   * @returns Object with import status information
   */
  ipcMain.handle('import:getStatus', () => {
    if (!importManager) {
      return { isImporting: false, activeCount: 0, activeTaskIds: [] };
    }
    return {
      isImporting: importManager.isImporting(),
      activeCount: importManager.getActiveImportCount(),
      activeTaskIds: importManager.getCurrentImportTaskIds()
    };
  });

  /**
   * Gets a specific import task by ID.
   * Returns the full task object including import-specific data.
   * 
   * @param _ - Event object (unused)
   * @param taskId - The import task ID to retrieve
   * @returns Object with success status and task details
   */
  ipcMain.handle('import:getTask', async (_, taskId: string) => {
    try {
      if (!importManager) {
        return { success: false, error: 'Import manager not initialized' };
      }

      const task = await fullTaskManager!.getTask(taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // 获取导入阶段的管理任务
      const managedTask = importManager.getManagedTask(taskId);
      if (managedTask) {
        return { success: true, task: managedTask };
      }

      return { success: true, task };
    } catch (error) {
      console.error('Error getting import task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Gets all import tasks from the FullTaskManager.
   * Returns import tasks sorted by creation date in descending order.
   * 
   * @returns Object with success status and array of import tasks
   */
  ipcMain.handle('import:getAll', async () => {
    try {
      if (!fullTaskManager) {
        return { success: false, error: 'Task manager not initialized' };
      }

      const tasks = await fullTaskManager.getTasks(
        { 
          audioSourceTypes: [AudioSourceType.IMPORT]
        },
        {
          field: 'createdAt',
          order: 'desc'
        }
      );
      return { success: true, tasks };
    } catch (error) {
      console.error('Error getting all import tasks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  /**
   * Opens the audio file in the system's default file explorer.
   * 
   * @param _event - Event object (unused)
   * @param audioPath - Path to the audio file to open
   */
  ipcMain.handle('audio:openFile', async (_event, audioPath: string) => {
    const { shell } = require('electron');
    if (audioPath) {
      shell.showItemInFolder(audioPath);
    }
  });
} 