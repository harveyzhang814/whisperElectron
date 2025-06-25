import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { 
  UnifiedTask, 
  TaskStage, 
  StageState,
  AudioSourceType,
  UNIFIED_TASK_TYPE 
} from '../types/task';
import { UnifiedTaskStorageInterface } from '../types/storage';

/**
 * Database row type for unified tasks
 */
interface TaskRow {
  id: string;
  type: string;
  state: string;
  metadata: string;
  progress: number;
  error: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * SQLite implementation of unified task storage
 */
export class SQLiteTaskStorage implements UnifiedTaskStorageInterface {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;
  private readonly backupDir: string;

  constructor(dbName: string = 'tasks.db') {
    this.dbPath = path.join(app.getPath('userData'), dbName);
    this.backupDir = path.join(app.getPath('userData'), 'task-backups');
  }

  /**
   * Initialize the database
   */
  public async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.promises.mkdir(this.backupDir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.db!.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            state TEXT NOT NULL,
            metadata TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            error TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Save a unified task to the database
   */
  public async saveTask(task: UnifiedTask): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    
    // Serialize the complete unified task structure
    const serializedTask = {
      ...task,
      // Ensure type is always AUDIO_PROCESSING
      type: UNIFIED_TASK_TYPE
    };

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO tasks (
          id, type, state, metadata, progress, error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          UNIFIED_TASK_TYPE,
          task.state,
          JSON.stringify(serializedTask),
          task.progress,
          task.error ? JSON.stringify(task.error) : null,
          task.metadata.createdAt,
          now
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Load a unified task from the database
   */
  public async loadTask(taskId: string): Promise<UnifiedTask | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.get<TaskRow>(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }

          try {
            const task = this.deserializeTask(row);
            resolve(task);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Load all unified tasks from the database
   */
  public async loadAllTasks(): Promise<UnifiedTask[]> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 [SQLiteTaskStorage] Loading all tasks from database...');

    return new Promise((resolve, reject) => {
      this.db!.all<TaskRow>(
        'SELECT * FROM tasks ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) {
            console.error('❌ [SQLiteTaskStorage] Database error:', err);
            reject(err);
            return;
          }

          try {
            console.log('📊 [SQLiteTaskStorage] Raw database rows:', {
              count: rows.length,
              rows: rows.map(row => ({
                id: row.id,
                type: row.type,
                state: row.state,
                metadata: row.metadata,
                progress: row.progress,
                error: row.error,
                created_at: row.created_at,
                updated_at: row.updated_at
              }))
            });

            const tasks: UnifiedTask[] = rows.map(row => this.deserializeTask(row));

            console.log('✅ [SQLiteTaskStorage] Parsed tasks:', {
              count: tasks.length,
              tasks: tasks.map(task => ({
                id: task.id,
                type: task.type,
                state: task.state,
                progress: task.progress,
                metadata: task.metadata,
                audioSourceData: task.audioSourceData,
                transcriptionData: task.transcriptionData
              }))
            });

            resolve(tasks);
          } catch (error) {
            console.error('❌ [SQLiteTaskStorage] Error parsing tasks:', error);
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Get tasks by audio source type
   */
  public async getTasksByAudioSourceType(audioSourceType: string): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.audioSourceData?.audioSourceType === audioSourceType
    );
  }

  /**
   * Get tasks by stage state
   */
  public async getTasksByStageState(stage: string, state: string): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.stages[stage as TaskStage]?.state === state
    );
  }

  /**
   * Get tasks by audio file path
   */
  public async getTasksByAudioFilePath(audioFilePath: string): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.audioSourceData?.audioFilePath === audioFilePath
    );
  }

  /**
   * Get tasks by filter criteria
   */
  public async getTasksByFilter(filter: {
    states?: string[];
    audioSourceTypes?: string[];
    stageStates?: { [key: string]: string };
    tags?: string[];
    fromDate?: number;
    toDate?: number;
  }): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    
    return allTasks.filter(task => {
      // Filter by states
      if (filter.states && !filter.states.includes(task.state)) {
        return false;
      }

      // Filter by audio source types
      if (filter.audioSourceTypes && 
          !filter.audioSourceTypes.includes(task.audioSourceData?.audioSourceType || '')) {
        return false;
      }

      // Filter by stage states
      if (filter.stageStates) {
        for (const [stage, state] of Object.entries(filter.stageStates)) {
          if (task.stages[stage as TaskStage]?.state !== state) {
            return false;
          }
        }
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        const taskTags = task.metadata.tags || [];
        if (!filter.tags.some(tag => taskTags.includes(tag))) {
          return false;
        }
      }

      // Filter by date range
      if (filter.fromDate && task.metadata.createdAt < filter.fromDate) {
        return false;
      }
      if (filter.toDate && task.metadata.createdAt > filter.toDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get tasks by tag
   */
  public async getTasksByTag(tag: string): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.metadata.tags?.includes(tag)
    );
  }

  /**
   * Get tasks created within a date range
   */
  public async getTasksByDateRange(fromDate: number, toDate: number): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.metadata.createdAt >= fromDate && task.metadata.createdAt <= toDate
    );
  }

  /**
   * Get tasks that have completed transcription
   */
  public async getTasksWithCompletedTranscription(): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.stages[TaskStage.TRANSCRIPTION]?.state === StageState.COMPLETED
    );
  }

  /**
   * Get tasks that have failed transcription
   */
  public async getTasksWithFailedTranscription(): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.stages[TaskStage.TRANSCRIPTION]?.state === StageState.FAILED
    );
  }

  /**
   * Get tasks that are ready for transcription
   */
  public async getTasksReadyForTranscription(): Promise<UnifiedTask[]> {
    const allTasks = await this.loadAllTasks();
    return allTasks.filter(task => 
      task.stages[TaskStage.AUDIO_SOURCE]?.state === StageState.COMPLETED &&
      task.stages[TaskStage.TRANSCRIPTION]?.state === StageState.PENDING
    );
  }

  /**
   * Delete a task from the database
   */
  public async deleteTask(taskId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM tasks WHERE id = ?', [taskId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Delete multiple tasks from the database
   */
  public async deleteTasks(taskIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const placeholders = taskIds.map(() => '?').join(',');
    
    return new Promise((resolve, reject) => {
      this.db!.run(`DELETE FROM tasks WHERE id IN (${placeholders})`, taskIds, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Clean up old task data
   */
  public async cleanupOldTasks(retentionDays: number): Promise<number> {
    const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const allTasks = await this.loadAllTasks();
    const oldTasks = allTasks.filter(task => task.metadata.createdAt < cutoffDate);
    
    if (oldTasks.length > 0) {
      const taskIds = oldTasks.map(task => task.id);
      await this.deleteTasks(taskIds);
    }
    
    return oldTasks.length;
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalTasks: number;
    recordingTasks: number;
    importTasks: number;
    completedTranscriptions: number;
    failedTranscriptions: number;
    totalStorageSize: number;
    averageProcessingTime: number;
  }> {
    const allTasks = await this.loadAllTasks();
    
    const recordingTasks = allTasks.filter(task => 
      task.audioSourceData?.audioSourceType === AudioSourceType.RECORDING
    ).length;
    
    const importTasks = allTasks.filter(task => 
      task.audioSourceData?.audioSourceType === AudioSourceType.IMPORT
    ).length;
    
    const completedTranscriptions = allTasks.filter(task => 
      task.stages[TaskStage.TRANSCRIPTION]?.state === StageState.COMPLETED
    ).length;
    
    const failedTranscriptions = allTasks.filter(task => 
      task.stages[TaskStage.TRANSCRIPTION]?.state === StageState.FAILED
    ).length;
    
    // Calculate total storage size (simplified)
    const totalStorageSize = allTasks.reduce((total, task) => {
      return total + (task.audioSourceData?.fileSize || 0);
    }, 0);
    
    // Calculate average processing time (simplified)
    const processingTimes = allTasks
      .filter(task => task.transcriptionData?.processingTime)
      .map(task => task.transcriptionData!.processingTime!);
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    return {
      totalTasks: allTasks.length,
      recordingTasks,
      importTasks,
      completedTranscriptions,
      failedTranscriptions,
      totalStorageSize,
      averageProcessingTime
    };
  }

  /**
   * Migrate old task data to new unified format
   */
  public async migrateOldTaskData(): Promise<{
    migratedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    // 不再需要迁移，直接返回空结果
    return { migratedCount: 0, failedCount: 0, errors: [] };
  }

  /**
   * Create a backup of the storage
   */
  public async backup(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `tasks-backup-${timestamp}.db`);

    return new Promise((resolve, reject) => {
      (this.db as any).backup(backupPath, (err: Error | null) => {
        if (err) reject(err);
        else resolve(backupPath);
      });
    });
  }

  /**
   * Restore from a backup
   */
  public async restore(backupPath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      (this.db as any).backup(backupPath, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Clean up old backups
   */
  public async cleanBackups(keepCount: number): Promise<void> {
    const files = await fs.promises.readdir(this.backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('tasks-backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(this.backupDir, file),
        mtime: fs.statSync(path.join(this.backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Keep only the most recent backups
    const filesToDelete = backupFiles.slice(keepCount);
    for (const file of filesToDelete) {
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        console.warn(`Failed to delete backup file: ${file.path}`, error);
      }
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Deserialize task from database row
   */
  private deserializeTask(row: TaskRow): UnifiedTask {
    try {
      const taskData = JSON.parse(row.metadata);
      
      // 直接返回统一任务格式
      return taskData as UnifiedTask;
    } catch (error) {
      throw new Error(`Failed to deserialize task ${row.id}: ${error}`);
    }
  }
} 