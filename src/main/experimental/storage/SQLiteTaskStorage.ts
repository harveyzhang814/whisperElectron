import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { TaskStorageInterface } from '../types/storage';
import { BaseTask, TaskState } from '../types/task';

/**
 * Database row type
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
 * SQLite implementation of task storage
 */
export class SQLiteTaskStorage implements TaskStorageInterface {
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
   * Save a task to the database
   */
  public async saveTask(task: BaseTask): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    
    // Prepare extended data for recording tasks
    let extendedData = null;
    if (task.type === 'RECORDING') {
      const recordingTask = task as any;
      extendedData = {
        recordingMetadata: recordingTask.recordingMetadata,
        config: recordingTask.config,
        recordingState: recordingTask.recordingState
      };
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO tasks (
          id, type, state, metadata, progress, error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.type,
          task.state,
          JSON.stringify({
            ...task.metadata,
            extendedData // Include extended data in metadata
          }),
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
   * Load a task from the database
   */
  public async loadTask(taskId: string): Promise<BaseTask | null> {
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
            const parsedMetadata = JSON.parse(row.metadata);
            const { extendedData, ...baseMetadata } = parsedMetadata;
            
            const task: BaseTask = {
              id: row.id,
              type: row.type,
              state: row.state as TaskState,
              metadata: baseMetadata,
              progress: row.progress,
              error: row.error ? JSON.parse(row.error) : undefined,
              // Include extended data if available
              ...(extendedData && { extendedData })
            };
            resolve(task);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Load all tasks from the database
   */
  public async loadAllTasks(): Promise<BaseTask[]> {
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

            const tasks: BaseTask[] = rows.map(row => {
              const parsedMetadata = JSON.parse(row.metadata);
              const { extendedData, ...baseMetadata } = parsedMetadata;
              
              return {
                id: row.id,
                type: row.type,
                state: row.state as TaskState,
                metadata: baseMetadata,
                progress: row.progress,
                error: row.error ? JSON.parse(row.error) : undefined,
                // Include extended data if available
                ...(extendedData && { extendedData })
              };
            });

            console.log('✅ [SQLiteTaskStorage] Parsed tasks:', {
              count: tasks.length,
              tasks: tasks.map(task => ({
                id: task.id,
                type: task.type,
                state: task.state,
                progress: task.progress,
                metadata: task.metadata,
                extendedData: task.extendedData
              }))
            });

            resolve(tasks);
          } catch (error) {
            console.error('❌ [SQLiteTaskStorage] Parse error:', error);
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Delete a task from the database
   */
  public async deleteTask(taskId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        'DELETE FROM tasks WHERE id = ?',
        [taskId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Delete multiple tasks from the database
   */
  public async deleteTasks(taskIds: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        'DELETE FROM tasks WHERE id IN (' + taskIds.map(() => '?').join(',') + ')',
        taskIds,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Create a backup of the database
   */
  public async backup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `tasks-backup-${timestamp}.db`);

    await fs.promises.copyFile(this.dbPath, backupPath);
    return backupPath;
  }

  /**
   * Restore from a backup
   */
  public async restore(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Close current connection
    await this.close();

    // Restore backup
    await fs.promises.copyFile(backupPath, this.dbPath);

    // Reinitialize database
    await this.initialize();
  }

  /**
   * Clean up old backups
   */
  public async cleanBackups(keepCount: number): Promise<void> {
    const backups = await fs.promises.readdir(this.backupDir);
    const sortedBackups = backups
      .filter(file => file.startsWith('tasks-backup-') && file.endsWith('.db'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(this.backupDir, a));
        const statB = fs.statSync(path.join(this.backupDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    const backupsToDelete = sortedBackups.slice(keepCount);
    for (const backup of backupsToDelete) {
      await fs.promises.unlink(path.join(this.backupDir, backup));
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) reject(err);
        else {
          this.db = null;
          resolve();
        }
      });
    });
  }
} 