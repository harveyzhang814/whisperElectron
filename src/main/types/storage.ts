import { BaseTask } from './task';

/**
 * Interface for task storage operations
 */
export interface TaskStorageInterface {
  /**
   * Initialize the storage
   */
  initialize(): Promise<void>;

  /**
   * Save a task to storage
   */
  saveTask(task: BaseTask): Promise<void>;

  /**
   * Load a task from storage
   */
  loadTask(taskId: string): Promise<BaseTask | null>;

  /**
   * Load all tasks from storage
   */
  loadAllTasks(): Promise<BaseTask[]>;

  /**
   * Delete a task from storage
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Delete multiple tasks from storage
   */
  deleteTasks(taskIds: string[]): Promise<void>;

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