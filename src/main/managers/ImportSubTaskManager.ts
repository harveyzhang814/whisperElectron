/**
 * This module provides an ImportSubTaskManager for handling audio file import stage of unified tasks.
 * It manages the lifecycle of audio file import stages and supports various audio formats.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { BaseSubTaskManager, SubTaskStageOptions } from './BaseSubTaskManager';
import {
  ImportStageState,
  ImportConfig,
  ImportMetadata,
  AudioValidationResult,
  SUPPORTED_AUDIO_FORMATS,
} from '../types/import';
import { 
  UnifiedTask, 
  TaskStage, 
  StageState,
  AudioSourceType 
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';

interface ImportInstance {
  taskId: string;
  sourceFilePath: string;
  targetFilePath: string;
  startTime: number;
}

/**
 * Manager for handling audio file import stage of unified tasks
 */
export class ImportSubTaskManager extends BaseSubTaskManager {
  private activeImports: Map<string, ImportInstance>;
  private defaultConfig: ImportConfig;

  constructor(taskManager: EventEmitter, storage: TaskStorageInterface) {
    super(taskManager, TaskStage.AUDIO_SOURCE, storage);
    this.activeImports = new Map();
    
    // Set default import configuration
    this.defaultConfig = {
      sourceFilePath: '',
      outputDirectory: path.join(process.cwd(), 'recordings'),
      preserveOriginal: true,
      validateAudio: true,
      allowedFormats: [...SUPPORTED_AUDIO_FORMATS],
      maxFileSize: 100 * 1024 * 1024 // 100MB
    };
  }

  protected async onInitialize(): Promise<void> {
    // Ensure output directory exists
    await fs.promises.mkdir(this.defaultConfig.outputDirectory, { recursive: true });
    
    // Restore historical tasks from storage
    await this.restoreHistoricalTasks();
  }

  protected async onCleanup(): Promise<void> {
    // Cancel all active imports
    for (const [taskId] of this.activeImports) {
      await this.cancelImport(taskId);
    }
  }

  protected async onInitializeTaskStage(task: UnifiedTask, options: SubTaskStageOptions): Promise<void> {
    // Set audio source type to IMPORT
    if (!task.audioSourceData) {
      task.audioSourceData = {
        audioSourceType: AudioSourceType.IMPORT
      };
    } else {
      task.audioSourceData.audioSourceType = AudioSourceType.IMPORT;
    }

    // Create import configuration
    const config: ImportConfig = {
      ...this.defaultConfig,
      ...options.config
    };

    // Validate source file path
    if (!config.sourceFilePath) {
      throw new Error('Source file path is required for import');
    }

    // Create import metadata
    const metadata: ImportMetadata = {
      originalFilePath: config.sourceFilePath,
      originalFileName: path.basename(config.sourceFilePath),
      originalFileSize: 0,
      originalFormat: path.extname(config.sourceFilePath).toLowerCase().slice(1)
    };

    // Store import metadata in stage metadata
    task.stages[this.stage].metadata = {
      importState: ImportStageState.READY,
      config,
      importMetadata: metadata
    };

    // Add task to managed tasks
    this.addManagedTask(task);
  }

  protected async onStartTaskStage(task: UnifiedTask): Promise<void> {
    await this.startImport(task.id);
  }

  protected async onPauseTaskStage(task: UnifiedTask): Promise<void> {
    // Import doesn't support pausing, so we'll cancel instead
    await this.cancelImport(task.id);
  }

  protected async onResumeTaskStage(task: UnifiedTask): Promise<void> {
    // Import doesn't support resuming, so we'll restart
    await this.startImport(task.id);
  }

  protected async onCompleteTaskStage(task: UnifiedTask): Promise<void> {
    // Import stage is completed when file is successfully copied
    const stageMetadata = task.stages[this.stage].metadata as any;
    const metadata: ImportMetadata = stageMetadata.importMetadata;
    
    if (metadata.copiedFilePath) {
      // Update audio source data with file information
      if (task.audioSourceData) {
        task.audioSourceData.audioFilePath = metadata.copiedFilePath;
        task.audioSourceData.fileSize = metadata.copiedFileSize;
        task.audioSourceData.originalFilePath = metadata.originalFilePath;
        task.audioSourceData.originalFileName = metadata.originalFileName;
        
        // Get audio format from validation result or file extension
        if (metadata.validationResult?.format) {
          task.audioSourceData.format = metadata.validationResult.format;
        } else {
          task.audioSourceData.format = metadata.originalFormat;
        }
        
        // Get audio properties from validation result
        if (metadata.validationResult) {
          task.audioSourceData.duration = metadata.validationResult.duration;
          task.audioSourceData.sampleRate = metadata.validationResult.sampleRate;
          task.audioSourceData.channels = metadata.validationResult.channels;
        }
      }
    }
  }

  protected async onFailTaskStage(task: UnifiedTask, error?: Error): Promise<void> {
    // Handle import failure
    if (error) {
      console.error(`Import failed for task ${task.id}:`, error);
    }
  }

  protected async onCancelTaskStage(task: UnifiedTask): Promise<void> {
    await this.cancelImport(task.id);
  }

  protected async handleStageStateChange(taskId: string, newState: StageState): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    
    // Map StageState to ImportStageState
    let newImportState: ImportStageState;
    switch (newState) {
      case StageState.IN_PROGRESS:
        newImportState = ImportStageState.VALIDATING;
        break;
      case StageState.COMPLETED:
        newImportState = ImportStageState.COMPLETED;
        break;
      case StageState.FAILED:
        newImportState = ImportStageState.FAILED;
        break;
      default:
        newImportState = ImportStageState.READY;
    }

    // Update the import state in stage metadata
    if (task.stages[this.stage].metadata) {
      (task.stages[this.stage].metadata as any).importState = newImportState;
    }
  }

  /**
   * Start import for a specific task
   */
  private async startImport(taskId: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    const stageMetadata = task.stages[this.stage].metadata as any;
    const config: ImportConfig = stageMetadata.config;
    const metadata: ImportMetadata = stageMetadata.importMetadata;

    try {
      // Update progress
      await this.updateStageProgress(taskId, 0, 'Starting import...');

      // Validate source file exists
      await this.validateSourceFile(metadata.originalFilePath);

      // Get file stats
      const stats = await fs.promises.stat(metadata.originalFilePath);
      metadata.originalFileSize = stats.size;

      // Validate file size
      if (stats.size > config.maxFileSize) {
        throw new Error(`File size ${stats.size} exceeds maximum allowed size ${config.maxFileSize}`);
      }

      // Validate file format
      if (!config.allowedFormats.includes(metadata.originalFormat)) {
        throw new Error(`File format ${metadata.originalFormat} is not supported`);
      }

      // Update progress
      await this.updateStageProgress(taskId, 20, 'Validating audio file...');

      // Validate audio file if enabled
      if (config.validateAudio) {
        const validationResult = await this.validateAudioFile(metadata.originalFilePath);
        metadata.validationResult = validationResult;
        
        if (!validationResult.isValid) {
          throw new Error(`Audio file validation failed: ${validationResult.errors?.join(', ')}`);
        }
      }

      // Update progress
      await this.updateStageProgress(taskId, 40, 'Copying file...');

      // Copy file to target directory
      const targetFileName = `import-${taskId}-${Date.now()}.${metadata.originalFormat}`;
      const targetFilePath = path.join(config.outputDirectory, targetFileName);
      
      const importInstance: ImportInstance = {
        taskId,
        sourceFilePath: metadata.originalFilePath,
        targetFilePath,
        startTime: Date.now()
      };

      this.activeImports.set(taskId, importInstance);

      // Copy file
      await this.copyFile(metadata.originalFilePath, targetFilePath);

      // Get target file stats
      const targetStats = await fs.promises.stat(targetFilePath);
      metadata.copiedFilePath = targetFilePath;
      metadata.copiedFileSize = targetStats.size;

      // Remove from active imports
      this.activeImports.delete(taskId);

      // Update progress
      await this.updateStageProgress(taskId, 100, 'Import completed');

    } catch (error) {
      await this.handleImportError(taskId, error);
      throw error;
    }
  }

  /**
   * Validate source file exists and is accessible
   */
  private async validateSourceFile(filePath: string): Promise<void> {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Source file not found or not accessible: ${filePath}`);
    }
  }

  /**
   * Validate audio file format and properties
   */
  private async validateAudioFile(filePath: string): Promise<AudioValidationResult> {
    // TODO: Implement actual audio validation using a library like ffprobe
    // For now, we'll do basic validation
    try {
      return {
        isValid: true,
        duration: 0, // TODO: Extract from audio file
        sampleRate: 0, // TODO: Extract from audio file
        channels: 0, // TODO: Extract from audio file
        format: path.extname(filePath).toLowerCase().slice(1),
        bitrate: 0, // TODO: Extract from audio file
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to validate audio file: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Copy file from source to target
   */
  private async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);

      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      readStream.pipe(writeStream);
    });
  }

  /**
   * Handle import error
   */
  private async handleImportError(taskId: string, error: any): Promise<void> {
    console.error(`Import error for task ${taskId}:`, error);
    
    // Clean up active import
    this.activeImports.delete(taskId);

    // Fail the stage
    await this.failTaskStage(taskId, error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * Cancel import
   */
  private async cancelImport(taskId: string): Promise<void> {
    const instance = this.activeImports.get(taskId);
    if (!instance) {
      return; // No active import to cancel
    }

    try {
      // Remove from active imports
      this.activeImports.delete(taskId);

      // Delete partially copied file if it exists
      try {
        await fs.promises.unlink(instance.targetFilePath);
      } catch (error) {
        // File might not exist, ignore error
      }

      // Update progress
      await this.updateStageProgress(taskId, 0, 'Import cancelled');

    } catch (error) {
      console.error(`Error cancelling import for task ${taskId}:`, error);
    }
  }

  /**
   * Get active import count
   */
  public getActiveImportCount(): number {
    return this.activeImports.size;
  }

  /**
   * Check if currently importing
   */
  public isImporting(): boolean {
    return this.activeImports.size > 0;
  }

  /**
   * Get current import task IDs
   */
  public getCurrentImportTaskIds(): string[] {
    return Array.from(this.activeImports.keys());
  }

  /**
   * Restore historical tasks from storage
   */
  private async restoreHistoricalTasks(): Promise<void> {
    try {
      const allTasks = await this.storage.loadAllTasks();
      
      for (const task of allTasks) {
        // Only manage tasks that have import as audio source
        if (task.audioSourceData?.audioSourceType === AudioSourceType.IMPORT) {
          this.addManagedTask(task);
        }
      }
    } catch (error) {
      console.error('Error restoring historical import tasks:', error);
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