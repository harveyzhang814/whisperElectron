import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as record from 'node-record-lpcm16';
import { BaseSubTaskManager, SubTaskOptions } from './BaseSubTaskManager';
import {
  RecordingTask,
  RecordingState,
  RecordingConfig,
  RecordingMetadata,
  RecordingEventType,
  RecordingEvent
} from '../types/recording';
import { TaskState, TaskEventType } from '../types/task';
import { TaskStorageInterface } from '../types/storage';

interface RecordingInstance {
  taskId: string;
  recorder: any; // node-record-lpcm16 instance
  fileStream: fs.WriteStream;
  outputPath: string;
}

/**
 * Manager for handling recording tasks
 */
export class RecordingSubTaskManager extends BaseSubTaskManager<RecordingTask> {
  private activeRecordings: Map<string, RecordingInstance>;
  private defaultConfig: RecordingConfig;

  constructor(taskManager: EventEmitter, storage: TaskStorageInterface) {
    super(taskManager, 'RECORDING', storage);
    this.activeRecordings = new Map();
    
    // Set default recording configuration
    this.defaultConfig = {
      sampleRate: 16000,
      channels: 1,
      format: 'wav',
      outputDirectory: path.join(process.cwd(), 'recordings'),
      silenceThreshold: 0,
      autoStopOnSilence: false,
      silenceDuration: 5000
    };

    // Set recording task concurrency limit to 1
    if (taskManager instanceof EventEmitter) {
      const fullTaskManager = (taskManager as any).fullTaskManager;
      if (fullTaskManager && typeof fullTaskManager.setTaskTypeConcurrency === 'function') {
        fullTaskManager.setTaskTypeConcurrency('RECORDING', 1);
      }
    }
  }

  protected async onInitialize(): Promise<void> {
    // Ensure output directory exists
    await fs.promises.mkdir(this.defaultConfig.outputDirectory, { recursive: true });
    
    // Restore historical tasks from storage
    await this.restoreHistoricalTasks();
  }

  protected async onCleanup(): Promise<void> {
    // Stop all active recordings
    for (const [taskId] of this.activeRecordings) {
      await this.stopRecording(taskId);
    }
  }

  protected async onCreateTask(taskId: string, options: SubTaskOptions): Promise<RecordingTask> {
    const config: RecordingConfig = {
      ...this.defaultConfig,
      ...options.config
    };

    // Create recording metadata
    const metadata: RecordingMetadata = {
      deviceId: config.deviceId || 'default',
      deviceName: 'Default Device', // TODO: Get actual device name
      sampleRate: config.sampleRate,
      channels: config.channels,
      format: config.format,
      duration: 0
    };

    // Create task metadata
    const taskMetadata = {
      name: options.name || 'New Recording',
      description: options.description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: options.tags || []
    };

    // Create and return the recording task
    return {
      id: taskId,
      type: 'RECORDING',
      state: TaskState.CREATED,
      recordingState: RecordingState.READY,
      progress: 0,
      metadata: taskMetadata,
      config,
      recordingMetadata: metadata
    };
  }

  protected async onStartTask(task: RecordingTask): Promise<void> {
    await this.startRecording(task.id);
  }

  protected async onPauseTask(task: RecordingTask): Promise<void> {
    await this.pauseRecording(task.id);
  }

  protected async onResumeTask(task: RecordingTask): Promise<void> {
    await this.resumeRecording(task.id);
  }

  protected async onStopTask(task: RecordingTask): Promise<void> {
    await this.stopRecording(task.id);
  }

  protected async onCancelTask(task: RecordingTask): Promise<void> {
    await this.cancelRecording(task.id);
  }

  protected async onDeleteTask(task: RecordingTask): Promise<void> {
    // If task has an output file, delete it
    if (task.recordingMetadata.outputPath) {
      try {
        await fs.promises.unlink(task.recordingMetadata.outputPath);
      } catch (error) {
        console.warn(`Failed to delete recording file: ${error}`);
      }
    }
  }

  protected async handleTaskStateChange(taskId: string, newState: TaskState): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Map TaskState to RecordingState
    let newRecordingState: RecordingState;
    switch (newState) {
      case TaskState.RUNNING:
        newRecordingState = RecordingState.RECORDING;
        break;
      case TaskState.PAUSED:
        newRecordingState = RecordingState.PAUSED;
        break;
      case TaskState.COMPLETED:
        newRecordingState = RecordingState.SAVED;
        break;
      case TaskState.FAILED:
        newRecordingState = RecordingState.FAILED;
        break;
      default:
        newRecordingState = RecordingState.READY;
    }

    // Update the recording state
    task.recordingState = newRecordingState;
    task.metadata.updatedAt = Date.now();
  }

  /**
   * Start recording for a specific task
   */
  private async startRecording(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (this.activeRecordings.has(taskId)) {
      throw new Error('Recording already in progress for this task');
    }

    try {
      // Create output file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${taskId}-${timestamp}.${task.config.format}`;
      const outputPath = path.join(task.config.outputDirectory, filename);

      // Create file stream
      const fileStream = fs.createWriteStream(outputPath, { encoding: 'binary' });

      // Start recording
      const recorder = record.record({
        sampleRate: task.config.sampleRate,
        channels: task.config.channels,
        threshold: task.config.silenceThreshold || 0,
        verbose: false,
        recordProgram: 'sox',
        audioType: task.config.format
      });

      // Setup recording instance
      const recordingInstance: RecordingInstance = {
        taskId,
        recorder,
        fileStream,
        outputPath
      };

      // Setup event handlers
      recorder.stream()
        .on('error', async (error: Error) => {
          console.error(`Recording error for task ${taskId}:`, error);
          await this.handleRecordingError(taskId, error);
        })
        .on('end', () => {
          console.log(`Recording ended for task ${taskId}`);
        })
        .pipe(fileStream);

      // Store the recording instance
      this.activeRecordings.set(taskId, recordingInstance);

      // Update task metadata
      task.recordingMetadata.outputPath = outputPath;
      task.metadata.updatedAt = Date.now();

      // Update task state
      await this.updateTaskState(taskId, TaskState.RUNNING);

    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Pause recording for a specific task
   */
  private async pauseRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      // TODO: Implement pause functionality
      // Currently node-record-lpcm16 doesn't support pause/resume
      // We might need to stop and create a new recording when resuming
      throw new Error('Pause functionality not implemented');
    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Resume recording for a specific task
   */
  private async resumeRecording(taskId: string): Promise<void> {
    try {
      // TODO: Implement resume functionality
      // Currently node-record-lpcm16 doesn't support pause/resume
      // We might need to create a new recording and concatenate the files later
      throw new Error('Resume functionality not implemented');
    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Stop recording for a specific task
   */
  private async stopRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      // Stop the recorder
      recording.recorder.stop();
      
      // Close the file stream
      recording.fileStream.end();

      // Get file stats
      const stats = await fs.promises.stat(recording.outputPath);
      
      // Update task metadata
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      task.recordingMetadata.fileSize = stats.size;
      task.metadata.updatedAt = Date.now();

      // Remove from active recordings
      this.activeRecordings.delete(taskId);

      // Update task state
      await this.updateTaskState(taskId, TaskState.COMPLETED);

      // Emit recording-specific event
      const recordingEvent: RecordingEvent = {
        type: RecordingEventType.FILE_SAVED,
        taskId,
        timestamp: Date.now(),
        filePath: recording.outputPath,
        fileSize: stats.size,
        duration: 0 // TODO: Calculate actual duration
      };
      this.taskManager.emit('recording:event', recordingEvent);

    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Cancel recording for a specific task (delete the audio file)
   */
  private async cancelRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      // Stop the recorder
      recording.recorder.stop();
      
      // Close the file stream
      recording.fileStream.end();

      // Delete the audio file
      try {
        await fs.promises.unlink(recording.outputPath);
        console.log(`Deleted recording file: ${recording.outputPath}`);
      } catch (error) {
        console.warn(`Failed to delete recording file: ${error}`);
      }

      // Clear the output path from task metadata
      const task = this.tasks.get(taskId);
      if (task) {
        task.recordingMetadata.outputPath = undefined;
        task.recordingMetadata.fileSize = undefined;
        task.metadata.updatedAt = Date.now();
      }

      // Remove from active recordings
      this.activeRecordings.delete(taskId);

      // Note: Don't update task state here, let the base class handle it
      // The base class will call updateTaskState(taskId, TaskState.CANCELLED)

    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Handle recording errors
   */
  private async handleRecordingError(taskId: string, error: any): Promise<void> {
    // Update task state to failed
    await this.updateTaskState(taskId, TaskState.FAILED);

    // Emit recording-specific error event
    const recordingEvent: RecordingEvent = {
      type: RecordingEventType.RECORDING_ERROR,
      taskId,
      timestamp: Date.now(),
      error: error instanceof Error ? error : new Error(String(error))
    };
    this.taskManager.emit('recording:event', recordingEvent);
  }

  public async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      // 任务已不存在，直接返回
      return;
    }
    // ...后续删除逻辑
    await this.onDeleteTask(task);
    this.tasks.delete(taskId);
  }

  /**
   * 是否有正在进行的录音
   */
  public isRecording(): boolean {
    return this.activeRecordings.size > 0;
  }

  /**
   * 获取当前正在录音的任务ID
   */
  public getCurrentRecordingTaskId(): string | null {
    const entry = Array.from(this.activeRecordings.keys())[0];
    return entry ?? null;
  }

  /**
   * 获取录音状态
   */
  public getRecordingStatus(): { isRecording: boolean } {
    return { isRecording: this.isRecording() };
  }

  /**
   * 动态更新录音配置
   */
  public updateConfig(config: Partial<RecordingConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * 适配器专用：对外暴露的停止录音方法
   */
  public async stopRecordingForAdapter(taskId: string): Promise<void> {
    return this.stopRecording(taskId);
  }

  /**
   * Update task state and ensure synchronization with FullTaskManager
   */
  public async updateTaskState(taskId: string, newState: TaskState): Promise<void> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const previousState = task.state;
    task.state = newState;
    task.metadata.updatedAt = Date.now();

    // Call parent method to save to database
    await super.updateTaskState(taskId, newState);

    // Also emit directly to taskManager (FullTaskManager) for immediate notification
    this.taskManager.emit('taskEvent', {
      type: TaskEventType.STATE_CHANGED,
      taskId,
      timestamp: Date.now(),
      previousState,
      newState
    });

    await this.handleTaskStateChange(taskId, newState);
  }

  /**
   * Override validateStateTransition to allow CREATED to RUNNING transition for recording tasks
   */
  protected validateStateTransition(currentState: TaskState, newState: TaskState): boolean {
    // Allow CREATED to RUNNING transition for recording tasks
    if (currentState === TaskState.CREATED && newState === TaskState.RUNNING) {
      return true;
    }

    // Use parent validation for other transitions
    return super.validateStateTransition(currentState, newState);
  }

  /**
   * Restore historical tasks from storage
   */
  private async restoreHistoricalTasks(): Promise<void> {
    try {
      console.log('🔄 [RecordingSubTaskManager] Restoring historical tasks...');
      const storedTasks = await this.storage.loadAllTasks();
      console.log('📦 [RecordingSubTaskManager] All stored tasks:', {
        count: storedTasks.length,
        tasks: storedTasks.map(task => ({
          id: task.id,
          type: task.type,
          state: task.state,
          progress: task.progress,
          metadata: task.metadata,
          extendedData: task.extendedData
        }))
      });
      
      for (const storedTask of storedTasks) {
        if (storedTask.type === 'RECORDING') {
          console.log('🎯 [RecordingSubTaskManager] Processing recording task:', storedTask.id);
          // Convert BaseTask to RecordingTask
          const recordingTask = await this.convertToRecordingTask(storedTask);
          console.log('✅ [RecordingSubTaskManager] Converted task:', {
            id: recordingTask.id,
            state: recordingTask.state,
            recordingState: recordingTask.recordingState,
            metadata: recordingTask.metadata,
            recordingMetadata: recordingTask.recordingMetadata
          });
          this.tasks.set(recordingTask.id, recordingTask);
        }
      }
      console.log(`✅ [RecordingSubTaskManager] Restored ${this.tasks.size} historical recording tasks`);
    } catch (error) {
      console.error('❌ [RecordingSubTaskManager] Failed to restore historical tasks:', error);
    }
  }

  /**
   * Convert BaseTask to RecordingTask
   */
  private async convertToRecordingTask(baseTask: any): Promise<RecordingTask> {
    // Extract extended data if available
    const extendedData = baseTask.extendedData || {};
    
    // Extract recording-specific metadata
    const recordingMetadata: RecordingMetadata = {
      deviceId: extendedData.recordingMetadata?.deviceId || 'default',
      deviceName: extendedData.recordingMetadata?.deviceName || 'Default Device',
      sampleRate: extendedData.recordingMetadata?.sampleRate || this.defaultConfig.sampleRate,
      channels: extendedData.recordingMetadata?.channels || this.defaultConfig.channels,
      format: extendedData.recordingMetadata?.format || this.defaultConfig.format,
      duration: extendedData.recordingMetadata?.duration || 0,
      fileSize: extendedData.recordingMetadata?.fileSize,
      outputPath: extendedData.recordingMetadata?.outputPath
    };

    // Create config from extended data or use defaults
    const config: RecordingConfig = {
      ...this.defaultConfig,
      ...(extendedData.config && {
        sampleRate: extendedData.config.sampleRate,
        channels: extendedData.config.channels,
        format: extendedData.config.format,
        outputDirectory: extendedData.config.outputDirectory,
        silenceThreshold: extendedData.config.silenceThreshold,
        autoStopOnSilence: extendedData.config.autoStopOnSilence,
        silenceDuration: extendedData.config.silenceDuration
      })
    };

    // Map TaskState to RecordingState
    let recordingState: RecordingState;
    if (extendedData.recordingState) {
      recordingState = extendedData.recordingState;
    } else {
      // Fallback to mapping from TaskState
      switch (baseTask.state) {
        case TaskState.RUNNING:
          recordingState = RecordingState.RECORDING;
          break;
        case TaskState.PAUSED:
          recordingState = RecordingState.PAUSED;
          break;
        case TaskState.COMPLETED:
          recordingState = RecordingState.SAVED;
          break;
        case TaskState.FAILED:
          recordingState = RecordingState.FAILED;
          break;
        case TaskState.CANCELLED:
          recordingState = RecordingState.STOPPED;
          break;
        default:
          recordingState = RecordingState.READY;
      }
    }

    return {
      id: baseTask.id,
      type: 'RECORDING',
      state: baseTask.state,
      recordingState,
      progress: baseTask.progress,
      metadata: baseTask.metadata,
      config,
      recordingMetadata,
      error: baseTask.error
    };
  }
} 