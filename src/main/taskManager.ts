// This module manages recording tasks using SQLite for persistence.
// It provides CRUD operations and task state transitions for the WhisperElectron app.

import { app, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../renderer/types/task';

const DB_PATH = path.join(app.getPath('userData'), 'tasks.db');
let db: sqlite3.Database;

// 记录当前正在录音的任务ID
let currentRecordingTaskId: string | null = null;

// Initialize the tasks table
export function initializeTaskManager() {
  // Ensure the user data directory exists
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Initialize database
  db = new sqlite3.Database(DB_PATH);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    audioPath TEXT,
    duration INTEGER
  )`);

  // Register IPC handlers
  ipcMain.handle('task:create', async (_, title: string, status: Task['status']) => {
    return await TaskManager.createTask(title, status);
  });

  ipcMain.handle('task:update', async (_, id: string, updates: Partial<Task>) => {
    await TaskManager.updateTask(id, updates);
    return { success: true };
  });

  ipcMain.handle('task:getAll', async () => {
    return await TaskManager.getAllTasks();
  });

  ipcMain.handle('task:delete', async (_, id: string) => {
    await TaskManager.deleteTask(id);
    return { success: true };
  });

  ipcMain.handle('task:openAudioFile', async (_, audioPath: string) => {
    TaskManager.openAudioFile(audioPath);
    return { success: true };
  });

  ipcMain.handle('task:getCurrentRecording', async () => {
    return await TaskManager.getCurrentRecordingTask();
  });
}

// CRUD and task logic
export const TaskManager = {
  createTask: async (title: string, status: Task['status'] = 'backlog'): Promise<Task> => {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const id = uuidv4();
      const task: Task = {
        id,
        title: title || `录音任务-${now}`,
        status,
        createdAt: now,
        updatedAt: now,
      };

      // 如果是录音状态，先检查是否已有正在录音的任务
      if (status === 'recording' && currentRecordingTaskId) {
        reject(new Error('Another recording is already in progress'));
        return;
      }

      // 如果是录音状态，设置为当前录音任务
      if (status === 'recording') {
        currentRecordingTaskId = id;
      }

      db.run(
        `INSERT INTO tasks (id, title, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
        [task.id, task.title, task.status, task.createdAt, task.updatedAt],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve(task);
        }
      );
    });
  },

  updateTask: (id: string, updates: Partial<Task>): Promise<void> => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).filter(k => k !== 'id');
      if (fields.length === 0) return resolve();

      // 更新录音状态
      if (updates.status === 'recording') {
        currentRecordingTaskId = id;
      } else if (updates.status === 'completed' && currentRecordingTaskId === id) {
        currentRecordingTaskId = null;
      }

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      db.run(
        `UPDATE tasks SET ${setClause}, updatedAt = ? WHERE id = ?`,
        [...values, new Date().toISOString(), id],
        (err: Error | null) => (err ? reject(err) : resolve())
      );
    });
  },

  getAllTasks: (): Promise<Task[]> => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM tasks ORDER BY createdAt DESC`, [], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows as Task[]);
      });
    });
  },

  getTask: (id: string): Promise<Task | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as Task);
      });
    });
  },

  deleteTask: (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 先获取任务信息，以便删除音频文件
      db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err: Error | null, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        // 如果任务存在且有音频文件，先删除音频文件
        if (row && row.audioPath && fs.existsSync(row.audioPath)) {
          try {
            fs.unlinkSync(row.audioPath);
          } catch (error) {
            console.error('Error deleting audio file:', error);
          }
        }

        // 删除任务记录
        db.run(`DELETE FROM tasks WHERE id = ?`, [id], (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  },

  openAudioFile: (audioPath: string) => {
    if (audioPath && fs.existsSync(audioPath)) {
      shell.showItemInFolder(audioPath);
    }
  },

  getCurrentRecordingTask: (): Promise<Task | null> => {
    return new Promise((resolve, reject) => {
      if (!currentRecordingTaskId) {
        resolve(null);
        return;
      }
      
      db.get(
        `SELECT * FROM tasks WHERE id = ?`,
        [currentRecordingTaskId],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row as Task | null);
        }
      );
    });
  },

  setCurrentRecordingTask: (taskId: string | null) => {
    currentRecordingTaskId = taskId;
  },
}; 