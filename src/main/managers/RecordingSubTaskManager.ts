import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as record from 'node-record-lpcm16';
import { BaseSubTaskManager, SubTaskStageOptions } from './BaseSubTaskManager';
import {
  RecordingStageState,
  RecordingConfig,
  RecordingMetadata,
} from '../types/recording';
import { 
  UnifiedTask, 
  TaskStage, 
  StageState, 
  AudioSourceType 
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';

interface RecordingInstance {
  taskId: string;
  recorder: any; // node-record-lpcm16 instance
  fileStream: fs.WriteStream;
  outputPath: string;
}

/**
 * Manager for handling recording stage of unified tasks
 */
export class RecordingSubTaskManager extends BaseSubTaskManager {
  private activeRecordings: Map<string, RecordingInstance>;
  private defaultConfig: RecordingConfig;

  constructor(taskManager: EventEmitter, storage: TaskStorageInterface) {
    super(taskManager, TaskStage.AUDIO_SOURCE, storage);
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

  protected async onInitializeTaskStage(task: UnifiedTask, options: SubTaskStageOptions): Promise<void> {
    // Set audio source type to RECORDING
    if (!task.audioSourceData) {
      task.audioSourceData = {
        audioSourceType: AudioSourceType.RECORDING
      };
    } else {
      task.audioSourceData.audioSourceType = AudioSourceType.RECORDING;
    }

    // Create recording configuration
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

    // Store recording metadata in stage metadata
    task.stages[this.stage].metadata = {
      recordingState: RecordingStageState.READY,
      config,
      recordingMetadata: metadata
    };

    // Add task to managed tasks
    this.addManagedTask(task);
  }

  protected async onStartTaskStage(task: UnifiedTask): Promise<void> {
    console.log('🎯 [RecordingManager] onStartTaskStage called for task:', task.id);
    console.log('📋 [RecordingManager] Current stage state:', task.stages[this.stage].state);
    
    // 允许 CANCELLED 状态的任务重新开始
    if (
      task.stages[this.stage].state !== StageState.PENDING &&
      task.stages[this.stage].state !== StageState.CANCELLED
    ) {
      console.error('❌ [RecordingManager] Cannot start recording for task with stage state:', task.stages[this.stage].state);
      throw new Error(`Cannot start recording for task with audio source stage in ${task.stages[this.stage].state} state. Only PENDING or CANCELLED stages can be started.`);
    }
    
    console.log('🚀 [RecordingManager] Starting recording for task:', task.id);
    await this.startRecording(task.id);
    console.log('✅ [RecordingManager] Recording started successfully for task:', task.id);
  }

  protected async onPauseTaskStage(task: UnifiedTask): Promise<void> {
    await this.pauseRecording(task.id);
  }

  protected async onResumeTaskStage(task: UnifiedTask): Promise<void> {
    await this.resumeRecording(task.id);
  }

  protected async onCompleteTaskStage(task: UnifiedTask): Promise<void> {
    // Recording stage is completed when recording is saved
    const recordingMetadata = task.stages[this.stage].metadata?.recordingMetadata as RecordingMetadata;
    if (recordingMetadata?.outputPath) {
      // Update audio source data with file information
      if (task.audioSourceData) {
        task.audioSourceData.audioFilePath = recordingMetadata.outputPath;
        task.audioSourceData.fileSize = recordingMetadata.fileSize;
        task.audioSourceData.duration = recordingMetadata.duration;
        task.audioSourceData.format = recordingMetadata.format;
        task.audioSourceData.sampleRate = recordingMetadata.sampleRate;
        task.audioSourceData.channels = recordingMetadata.channels;
        task.audioSourceData.recordingDeviceId = recordingMetadata.deviceId;
        task.audioSourceData.recordingDeviceName = recordingMetadata.deviceName;
      }
    }
  }

  protected async onFailTaskStage(task: UnifiedTask, error?: Error): Promise<void> {
    // Handle recording failure
    if (error) {
      console.error(`Recording failed for task ${task.id}:`, error);
    }
  }

  /**
   * BaseSubTaskManager要求的onCancelTaskStage实现，直接调用cancelTaskStage
   */
  protected async onCancelTaskStage(task: UnifiedTask): Promise<void> {
    await this.cancelTaskStage(task.id);
  }

  /**
   * Stop a recording stage. If taskId is not provided, use the current recording task.
   */
  public async stopTaskStage(taskId?: string): Promise<void> {
    let targetTaskId: string | undefined = taskId;
    if (!targetTaskId) {
      targetTaskId = this.getCurrentRecordingTaskId() || undefined;
      if (!targetTaskId) {
        throw new Error('No active recording task to stop');
      }
    }
    await this.stopRecording(targetTaskId);
  }

  /**
   * Cancel a recording stage. If taskId is not provided, use the current recording task.
   */
  public async cancelTaskStage(taskId?: string): Promise<void> {
    let targetTaskId: string | undefined = taskId;
    if (!targetTaskId) {
      targetTaskId = this.getCurrentRecordingTaskId() || undefined;
      if (!targetTaskId) {
        throw new Error('No active recording task to cancel');
      }
    }
    await this.cancelRecording(targetTaskId);
  }

  protected async handleStageStateChange(taskId: string, newState: StageState): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    
    // Map StageState to RecordingStageState
    let newRecordingState: RecordingStageState;
    switch (newState) {
      case StageState.IN_PROGRESS:
        newRecordingState = RecordingStageState.RECORDING;
        break;
      case StageState.COMPLETED:
        newRecordingState = RecordingStageState.SAVED;
        break;
      case StageState.FAILED:
        newRecordingState = RecordingStageState.FAILED;
        break;
      default:
        newRecordingState = RecordingStageState.READY;
    }

    // Update the recording state in stage metadata
    if (task.stages[this.stage].metadata) {
      (task.stages[this.stage].metadata as any).recordingState = newRecordingState;
    }
  }

  /**
   * Start recording for a specific task
   */
  private async startRecording(taskId: string): Promise<void> {
    console.log('🎯 [RecordingManager] startRecording called for taskId:', taskId);
    
    const task = this.getTaskOrThrow(taskId);
    console.log('📋 [RecordingManager] Task found:', {
      id: task.id,
      state: task.state,
      stageState: task.stages[this.stage].state
    });
    
    if (this.activeRecordings.has(taskId)) {
      console.error('❌ [RecordingManager] Recording already in progress for task:', taskId);
      throw new Error('Recording already in progress for this task');
    }

    try {
      const stageMetadata = task.stages[this.stage].metadata as any;
      const config: RecordingConfig = stageMetadata.config;
      const metadata: RecordingMetadata = stageMetadata.recordingMetadata;

      console.log('📝 [RecordingManager] Recording config:', config);
      console.log('📝 [RecordingManager] Recording metadata:', metadata);

      // Create output file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${taskId}-${timestamp}.${config.format}`;
      const outputPath = path.join(config.outputDirectory, filename);

      console.log('📁 [RecordingManager] Output file path:', outputPath);

      // Create file stream
      const fileStream = fs.createWriteStream(outputPath, { encoding: 'binary' });

      // Start recording
      console.log('🎤 [RecordingManager] Starting node-record-lpcm16...');
      const recorder = record.record({
        sampleRate: config.sampleRate,
        channels: config.channels,
        threshold: config.silenceThreshold || 0,
        verbose: false,
        recordProgram: 'sox',
        audioType: config.format
      });

      // Store recording instance
      this.activeRecordings.set(taskId, {
        taskId,
        recorder,
        fileStream,
        outputPath
      });

      console.log('💾 [RecordingManager] Recording instance stored');

      // Update metadata
      metadata.outputPath = outputPath;

      // Start recording
      console.log('🎵 [RecordingManager] Starting recording stream...');
      recorder.stream()
        .on('error', (error) => this.handleRecordingError(taskId, error))
        .pipe(fileStream);

      console.log('✅ [RecordingManager] Recording stream started successfully');

      // Update progress
      await this.updateStageProgress(taskId, 0, 'Recording started');
      console.log('📊 [RecordingManager] Stage progress updated');

    } catch (error) {
      console.error('❌ [RecordingManager] Error in startRecording:', error);
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  private async pauseRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      // Note: node-record-lpcm16 doesn't support pause, so we'll just update the state
      await this.updateStageProgress(taskId, 50, 'Recording paused');
    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Resume recording
   */
  private async resumeRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      await this.updateStageProgress(taskId, 50, 'Recording resumed');
    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  private async stopRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      throw new Error('No active recording found for this task');
    }

    try {
      // Stop recording
      recording.recorder.stop();
      recording.fileStream.end();

      // Wait for file to be written
      await new Promise<void>((resolve, reject) => {
        recording.fileStream.on('finish', () => resolve());
        recording.fileStream.on('error', reject);
      });

      // Get file stats
      const stats = await fs.promises.stat(recording.outputPath);
      const task = this.getTaskOrThrow(taskId);
      const stageMetadata = task.stages[this.stage].metadata as any;
      const metadata: RecordingMetadata = stageMetadata.recordingMetadata;

      // Update metadata
      metadata.fileSize = stats.size;
      metadata.duration = 0; // TODO: Calculate actual duration

      // === 修复：写入 audioFilePath 等信息到 audioSourceData ===
      if (task.audioSourceData) {
        task.audioSourceData.audioFilePath = recording.outputPath;
        task.audioSourceData.fileSize = stats.size;
        task.audioSourceData.duration = metadata.duration;
        task.audioSourceData.format = metadata.format;
        task.audioSourceData.sampleRate = metadata.sampleRate;
        task.audioSourceData.channels = metadata.channels;
        task.audioSourceData.recordingDeviceId = metadata.deviceId;
        task.audioSourceData.recordingDeviceName = metadata.deviceName;
      }
      // 保存任务
      await this.storage.saveTask(task);
      // === END 修复 ===

      // Remove from active recordings
      this.activeRecordings.delete(taskId);

      // Update progress
      await this.updateStageProgress(taskId, 100, 'Recording saved');

      // 补充：更新阶段状态为 COMPLETED
      await this.updateStageState(taskId, StageState.COMPLETED);

    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Cancel recording
   */
  private async cancelRecording(taskId: string): Promise<void> {
    const recording = this.activeRecordings.get(taskId);
    if (!recording) {
      return; // No active recording to cancel
    }

    try {
      // Stop recording
      recording.recorder.stop();
      recording.fileStream.end();

      // Delete the file
      try {
        await fs.promises.unlink(recording.outputPath);
      } catch (error) {
        console.warn(`Failed to delete recording file: ${error}`);
      }

      // Remove from active recordings
      this.activeRecordings.delete(taskId);

      // Update progress
      await this.updateStageProgress(taskId, 0, 'Recording cancelled');

      // 设置阶段状态为 CANCELLED
      await this.updateStageState(taskId, StageState.CANCELLED);

    } catch (error) {
      await this.handleRecordingError(taskId, error);
      throw error;
    }
  }

  /**
   * Handle recording errors
   */
  private async handleRecordingError(taskId: string, error: any): Promise<void> {
    console.error(`Recording error for task ${taskId}:`, error);
    
    // Clean up active recording
    const recording = this.activeRecordings.get(taskId);
    if (recording) {
      try {
        recording.recorder.stop();
        recording.fileStream.end();
        this.activeRecordings.delete(taskId);
      } catch (cleanupError) {
        console.warn('Error during recording cleanup:', cleanupError);
      }
    }

    // Fail the stage
    await this.failTaskStage(taskId, error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * Check if currently recording
   */
  public isRecording(): boolean {
    return this.activeRecordings.size > 0;
  }

  /**
   * Get current recording task ID
   */
  public getCurrentRecordingTaskId(): string | null {
    if (this.activeRecordings.size === 0) {
      return null;
    }
    return Array.from(this.activeRecordings.keys())[0];
  }

  /**
   * Get recording status
   */
  public getRecordingStatus(): { isRecording: boolean } {
    return {
      isRecording: this.isRecording()
    };
  }

  /**
   * Update recording configuration
   */
  public updateConfig(config: Partial<RecordingConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Stop recording for adapter compatibility
   */
  public async stopRecordingForAdapter(taskId: string): Promise<void> {
    await this.stopRecording(taskId);
  }

  /**
   * Restore historical tasks from storage
   */
  private async restoreHistoricalTasks(): Promise<void> {
    try {
      const allTasks = await this.storage.loadAllTasks();
      
      for (const task of allTasks) {
        // Only manage tasks that have recording as audio source
        if (task.audioSourceData?.audioSourceType === AudioSourceType.RECORDING) {
          this.addManagedTask(task);
        }
      }
    } catch (error) {
      console.error('Error restoring historical recording tasks:', error);
    }
  }

  /**
   * Extract task ID from error for better error handling
   */
  protected extractTaskIdFromError(error: any): string | undefined {
    if (error && typeof error === 'object' && error.taskId) {
      return error.taskId;
    }
    return undefined;
  }
} 