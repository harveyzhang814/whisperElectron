/**
 * This module provides a TranscriptionSubTaskManager for handling transcription stage of unified tasks.
 * It manages the lifecycle of transcription stages and integrates with the Whisper API.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { BaseSubTaskManager, SubTaskStageOptions } from './BaseSubTaskManager';
import {
  TranscriptionStageState,
  TranscriptionConfig,
  TranscriptionMetadata,
  TranscriptionResult
} from '../types/transcription';
import { 
  UnifiedTask, 
  TaskStage, 
  StageState
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';
import { whisperManager } from '../whisper/manager';
import { configManager } from '../config';

interface TranscriptionInstance {
  taskId: string;
  whisperJobId: string;
  startTime: number;
  audioFilePath: string;
}

/**
 * Manager for handling transcription stage of unified tasks
 */
export class TranscriptionSubTaskManager extends BaseSubTaskManager {
  private activeTranscriptions: Map<string, TranscriptionInstance>;
  private defaultConfig: TranscriptionConfig;

  constructor(taskManager: EventEmitter, storage: TaskStorageInterface) {
    super(taskManager, TaskStage.TRANSCRIPTION, storage);
    this.activeTranscriptions = new Map();
    
    // Get default transcription configuration
    this.defaultConfig = configManager.getConfigSection('transcription');

    // Listen to whisper manager events
    this.setupWhisperEventListeners();
  }

  protected async onInitialize(): Promise<void> {
    // Ensure output directory exists
    await fs.promises.mkdir(this.defaultConfig.outputDirectory, { recursive: true });
    await fs.promises.mkdir(this.defaultConfig.cacheDirectory, { recursive: true });
    
    // Restore historical tasks from storage
    await this.restoreHistoricalTasks();
  }

  protected async onCleanup(): Promise<void> {
    // Cancel all active transcriptions
    for (const [taskId] of this.activeTranscriptions) {
      await this.cancelTranscription(taskId);
    }
  }

  protected async onInitializeTaskStage(task: UnifiedTask, options: SubTaskStageOptions): Promise<void> {
    const baseConfig = configManager.getConfigSection('transcription');
    const config: TranscriptionConfig = {
      ...baseConfig,
      ...options.config
    } as TranscriptionConfig;

    // Create transcription metadata
    const metadata: TranscriptionMetadata = {
      modelUsed: config.defaultModel
    };

    // Get audio file path from audio source data
    if (task.audioSourceData?.audioFilePath) {
      metadata.audioFilePath = task.audioSourceData.audioFilePath;
    }

    // Store transcription metadata in stage metadata
    task.stages[this.stage].metadata = {
      transcriptionState: TranscriptionStageState.READY,
      config,
      transcriptionMetadata: metadata
    };

    // Add task to managed tasks
    this.addManagedTask(task);
  }

  protected async onStartTaskStage(task: UnifiedTask): Promise<void> {
    await this.startTranscription(task.id);
  }

  protected async onPauseTaskStage(task: UnifiedTask): Promise<void> {
    // Transcription doesn't support pausing, so we'll cancel instead
    await this.cancelTranscription(task.id);
  }

  protected async onResumeTaskStage(task: UnifiedTask): Promise<void> {
    // Transcription doesn't support resuming, so we'll restart
    await this.startTranscription(task.id);
  }

  protected async onCompleteTaskStage(task: UnifiedTask): Promise<void> {
    // Transcription stage is completed when transcription is finished
    const stageMetadata = task.stages[this.stage].metadata as any;
    const transcriptionResult = stageMetadata.transcriptionResult as TranscriptionResult;
    
    if (transcriptionResult) {
      // Update transcription data with result information
      if (task.transcriptionData) {
        task.transcriptionData.modelUsed = stageMetadata.transcriptionMetadata.modelUsed;
        task.transcriptionData.language = transcriptionResult.language;
        task.transcriptionData.processingTime = stageMetadata.transcriptionMetadata.processingTime;
        task.transcriptionData.wordCount = transcriptionResult.text.split(' ').length;
        task.transcriptionData.confidence = 0; // TODO: Calculate confidence
        task.transcriptionData.transcriptionResult = transcriptionResult.text;
        task.transcriptionData.transcriptionFilePath = this.getTranscriptionOutputPath(task);
        task.transcriptionData.segments = transcriptionResult.segments;
      }
    }
  }

  protected async onFailTaskStage(task: UnifiedTask, error?: Error): Promise<void> {
    // Handle transcription failure
    if (error) {
      console.error(`Transcription failed for task ${task.id}:`, error);
    }
  }

  /**
   * Stop a transcription stage. If taskId is not provided, use the first active transcription task.
   */
  public async stopTaskStage(taskId?: string): Promise<void> {
    let targetTaskId: string | undefined = taskId;
    if (!targetTaskId) {
      const ids = this.getCurrentTranscriptionTaskIds();
      targetTaskId = ids.length > 0 ? ids[0] : undefined;
      if (!targetTaskId) {
        throw new Error('No active transcription task to stop');
      }
    }
    // 假设 stop 行为等价于 cancel
    await this.cancelTranscription(targetTaskId);
  }

  /**
   * Cancel a transcription stage. If taskId is not provided, use the first active transcription task.
   */
  public async cancelTaskStage(taskId?: string): Promise<void> {
    let targetTaskId: string | undefined = taskId;
    if (!targetTaskId) {
      const ids = this.getCurrentTranscriptionTaskIds();
      targetTaskId = ids.length > 0 ? ids[0] : undefined;
      if (!targetTaskId) {
        throw new Error('No active transcription task to cancel');
      }
    }
    await this.cancelTranscription(targetTaskId);
  }

  /**
   * BaseSubTaskManager要求的onCancelTaskStage实现，直接调用cancelTaskStage
   */
  protected async onCancelTaskStage(task: UnifiedTask): Promise<void> {
    await this.cancelTaskStage(task.id);
  }

  protected async handleStageStateChange(taskId: string, newState: StageState): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    
    // Map StageState to TranscriptionStageState
    let newTranscriptionState: TranscriptionStageState;
    switch (newState) {
      case StageState.IN_PROGRESS:
        newTranscriptionState = TranscriptionStageState.TRANSCRIBING;
        break;
      case StageState.COMPLETED:
        newTranscriptionState = TranscriptionStageState.COMPLETED;
        break;
      case StageState.FAILED:
        newTranscriptionState = TranscriptionStageState.FAILED;
        break;
      default:
        newTranscriptionState = TranscriptionStageState.READY;
    }

    // Update the transcription state in stage metadata
    if (task.stages[this.stage].metadata) {
      (task.stages[this.stage].metadata as any).transcriptionState = newTranscriptionState;
    }
  }

  /**
   * Start transcription for a specific task
   */
  private async startTranscription(taskId: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    const stageMetadata = task.stages[this.stage].metadata as any;
    const metadata: TranscriptionMetadata = stageMetadata.transcriptionMetadata;

    if (!metadata.audioFilePath) {
      throw new Error('No audio file path specified for transcription');
    }

    try {
      // Check audio file exists
      await fs.promises.access(metadata.audioFilePath);
      
      // Get audio file stats
      const stats = await fs.promises.stat(metadata.audioFilePath);
      metadata.audioFileSize = stats.size;

      // Start transcription using whisper manager
      const whisperOptions = {
        model: stageMetadata.config.model || stageMetadata.config.defaultModel,
        language: stageMetadata.config.language || stageMetadata.config.defaultLanguage || '',
        output_format: stageMetadata.config.outputFormat || stageMetadata.config.defaultOutputFormat,
        temperature: stageMetadata.config.temperature || stageMetadata.config.defaultTemperature
      };

      const whisperJobId = await whisperManager.transcribe(metadata.audioFilePath, whisperOptions);

      // Store transcription instance
      this.activeTranscriptions.set(taskId, {
        taskId,
        whisperJobId,
        startTime: Date.now(),
        audioFilePath: metadata.audioFilePath
      });

      // Update progress
      await this.updateStageProgress(taskId, 0, 'Transcription started');

    } catch (error) {
      await this.handleTranscriptionError(taskId, error);
      throw error;
    }
  }

  /**
   * Handle transcription completion
   */
  private async handleTranscriptionComplete(taskId: string, result: any): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    const stageMetadata = task.stages[this.stage].metadata as any;
    const metadata: TranscriptionMetadata = stageMetadata.transcriptionMetadata;

    try {
      // Calculate processing time
      const instance = this.activeTranscriptions.get(taskId);
      if (instance) {
        metadata.processingTime = Date.now() - instance.startTime;
      }

      // Save transcription result
      const transcriptionResult: TranscriptionResult = {
        text: result.text,
        segments: result.segments,
        language: result.language,
        duration: result.duration
      };

      // Store result in stage metadata
      stageMetadata.transcriptionResult = transcriptionResult;

      // Save to file
      await this.saveTranscriptionResult(task, transcriptionResult);

      // Remove from active transcriptions
      this.activeTranscriptions.delete(taskId);

      // Update progress
      await this.updateStageProgress(taskId, 100, 'Transcription completed');

    } catch (error) {
      await this.handleTranscriptionError(taskId, error);
    }
  }

  /**
   * Handle transcription error
   */
  private async handleTranscriptionError(taskId: string, error: any): Promise<void> {
    console.error(`Transcription error for task ${taskId}:`, error);
    
    // Clean up active transcription
    this.activeTranscriptions.delete(taskId);

    // Fail the stage
    await this.failTaskStage(taskId, error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * Cancel transcription
   */
  private async cancelTranscription(taskId: string): Promise<void> {
    const instance = this.activeTranscriptions.get(taskId);
    if (!instance) {
      return; // No active transcription to cancel
    }

    try {
      // Cancel whisper job
      await whisperManager.cancelTranscribe(instance.whisperJobId);
      
      // Remove from active transcriptions
      this.activeTranscriptions.delete(taskId);

      // Update progress
      await this.updateStageProgress(taskId, 0, 'Transcription cancelled');

    } catch (error) {
      console.error(`Error cancelling transcription for task ${taskId}:`, error);
    }
  }

  /**
   * Save transcription result to file
   */
  private async saveTranscriptionResult(task: UnifiedTask, result: TranscriptionResult): Promise<void> {
    const stageMetadata = task.stages[this.stage].metadata as any;
    const config: TranscriptionConfig = stageMetadata.config;
    const outputPath = this.getTranscriptionOutputPath(task);

    let content: string;
    switch (config.outputFormat || config.defaultOutputFormat) {
      case 'json':
        content = JSON.stringify(result, null, 2);
        break;
      case 'srt':
        content = this.convertToSRT(result);
        break;
      case 'vtt':
        content = this.convertToVTT(result);
        break;
      default:
        content = result.text;
    }

    await fs.promises.writeFile(outputPath, content, 'utf8');
  }

  /**
   * Get transcription output file path
   */
  private getTranscriptionOutputPath(task: UnifiedTask): string {
    const stageMetadata = task.stages[this.stage].metadata as any;
    const config: TranscriptionConfig = stageMetadata.config;
    const format = config.outputFormat || config.defaultOutputFormat;
    const filename = `transcription-${task.id}.${format}`;
    return path.join(config.outputDirectory, filename);
  }

  /**
   * Convert transcription result to SRT format
   */
  private convertToSRT(result: TranscriptionResult): string {
    if (!result.segments) {
      return result.text;
    }

    return result.segments.map((segment, index) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
    }).join('\n');
  }

  /**
   * Convert transcription result to VTT format
   */
  private convertToVTT(result: TranscriptionResult): string {
    if (!result.segments) {
      return `WEBVTT\n\n${result.text}`;
    }

    const header = 'WEBVTT\n\n';
    const segments = result.segments.map((segment, index) => {
      const startTime = this.formatTime(segment.start, true);
      const endTime = this.formatTime(segment.end, true);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}`;
    }).join('\n\n');

    return header + segments;
  }

  /**
   * Format time for SRT/VTT
   */
  private formatTime(seconds: number, vtt: boolean = false): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (vtt) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }
  }

  /**
   * Setup whisper event listeners
   */
  private setupWhisperEventListeners(): void {
    whisperManager.on('transcriptionComplete', async (data: { jobId: string; result: any }) => {
      const instance = this.findInstanceByWhisperJobId(data.jobId);
      if (instance) {
        await this.handleTranscriptionComplete(instance.taskId, data.result);
      }
    });

    whisperManager.on('transcriptionError', async (data: { jobId: string; error: any }) => {
      const instance = this.findInstanceByWhisperJobId(data.jobId);
      if (instance) {
        await this.handleTranscriptionError(instance.taskId, data.error);
      }
    });

    whisperManager.on('transcriptionProgress', async (data: { jobId: string; progress: number }) => {
      const instance = this.findInstanceByWhisperJobId(data.jobId);
      if (instance) {
        await this.updateStageProgress(instance.taskId, data.progress, 'Transcribing...');
      }
    });
  }

  /**
   * Find transcription instance by whisper job ID
   */
  private findInstanceByWhisperJobId(whisperJobId: string): TranscriptionInstance | undefined {
    return Array.from(this.activeTranscriptions.values()).find(
      instance => instance.whisperJobId === whisperJobId
    );
  }

  /**
   * Get active transcription count
   */
  public getActiveTranscriptionCount(): number {
    return this.activeTranscriptions.size;
  }

  /**
   * Check if currently transcribing
   */
  public isTranscribing(): boolean {
    return this.activeTranscriptions.size > 0;
  }

  /**
   * Get current transcription task IDs
   */
  public getCurrentTranscriptionTaskIds(): string[] {
    return Array.from(this.activeTranscriptions.keys());
  }

  /**
   * Restore historical tasks from storage
   */
  private async restoreHistoricalTasks(): Promise<void> {
    try {
      const allTasks = await this.storage.loadAllTasks();
      
      for (const task of allTasks) {
        // Only manage tasks that have completed audio source stage
        if (task.audioSourceData?.audioFilePath && 
            task.stages[TaskStage.AUDIO_SOURCE].state === StageState.COMPLETED) {
          this.addManagedTask(task);
        }
      }
    } catch (error) {
      console.error('Error restoring historical transcription tasks:', error);
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