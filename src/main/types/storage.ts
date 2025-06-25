import { UnifiedTask } from './task';

/**
 * Interface for unified task storage operations
 */
export interface TaskStorageInterface {
  /**
   * Initialize the storage
   */
  initialize(): Promise<void>;

  /**
   * Save a unified task to storage
   */
  saveTask(task: UnifiedTask): Promise<void>;

  /**
   * Load a unified task from storage
   */
  loadTask(taskId: string): Promise<UnifiedTask | null>;

  /**
   * Load all unified tasks from storage
   */
  loadAllTasks(): Promise<UnifiedTask[]>;

  /**
   * Delete a unified task from storage
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Delete multiple unified tasks from storage
   */
  deleteTasks(taskIds: string[]): Promise<void>;

  /**
   * Get tasks by audio source type
   */
  getTasksByAudioSourceType(audioSourceType: string): Promise<UnifiedTask[]>;

  /**
   * Get tasks by stage state
   */
  getTasksByStageState(stage: string, state: string): Promise<UnifiedTask[]>;

  /**
   * Get tasks by audio file path
   */
  getTasksByAudioFilePath(audioFilePath: string): Promise<UnifiedTask[]>;

  /**
   * Create a backup of the storage
   */
  backup(): Promise<string>;

  /**
   * Restore from a backup
   */
  restore(backupPath: string): Promise<void>;

  /**
   * Clean up old backups
   */
  cleanBackups(keepCount: number): Promise<void>;

  /**
   * Close the storage connection
   */
  close(): Promise<void>;
}

/**
 * Interface for unified task storage with advanced query capabilities
 */
export interface UnifiedTaskStorageInterface extends TaskStorageInterface {
  /**
   * Get tasks by filter criteria
   */
  getTasksByFilter(filter: {
    states?: string[];
    audioSourceTypes?: string[];
    stageStates?: { [key: string]: string };
    tags?: string[];
    fromDate?: number;
    toDate?: number;
  }): Promise<UnifiedTask[]>;

  /**
   * Get tasks by tag
   */
  getTasksByTag(tag: string): Promise<UnifiedTask[]>;

  /**
   * Get tasks created within a date range
   */
  getTasksByDateRange(fromDate: number, toDate: number): Promise<UnifiedTask[]>;

  /**
   * Get tasks that have completed transcription
   */
  getTasksWithCompletedTranscription(): Promise<UnifiedTask[]>;

  /**
   * Get tasks that have failed transcription
   */
  getTasksWithFailedTranscription(): Promise<UnifiedTask[]>;

  /**
   * Get tasks that are ready for transcription
   */
  getTasksReadyForTranscription(): Promise<UnifiedTask[]>;

  /**
   * Clean up old task data
   */
  cleanupOldTasks(retentionDays: number): Promise<number>;

  /**
   * Get storage statistics
   */
  getStorageStats(): Promise<{
    totalTasks: number;
    recordingTasks: number;
    importTasks: number;
    completedTranscriptions: number;
    failedTranscriptions: number;
    totalStorageSize: number;
    averageProcessingTime: number;
  }>;

  /**
   * Migrate old task data to new unified format
   */
  migrateOldTaskData(): Promise<{
    migratedCount: number;
    failedCount: number;
    errors: string[];
  }>;
} 