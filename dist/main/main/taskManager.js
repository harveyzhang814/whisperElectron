"use strict";
// This module manages recording tasks using SQLite for persistence.
// It provides CRUD operations and task state transitions for the WhisperElectron app.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManager = void 0;
exports.initializeTaskManager = initializeTaskManager;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sqlite3 = __importStar(require("sqlite3"));
const uuid_1 = require("uuid");
const DB_PATH = path.join(electron_1.app.getPath('userData'), 'tasks.db');
let db;
// 记录当前正在录音的任务ID
let currentRecordingTaskId = null;
// Initialize the tasks table
function initializeTaskManager() {
    // Ensure the user data directory exists
    const userDataDir = electron_1.app.getPath('userData');
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
    electron_1.ipcMain.handle('task:create', async (_, title, status) => {
        return await exports.TaskManager.createTask(title, status);
    });
    electron_1.ipcMain.handle('task:update', async (_, id, updates) => {
        await exports.TaskManager.updateTask(id, updates);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:getAll', async () => {
        return await exports.TaskManager.getAllTasks();
    });
    electron_1.ipcMain.handle('task:delete', async (_, id) => {
        await exports.TaskManager.deleteTask(id);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:openAudioFile', async (_, audioPath) => {
        exports.TaskManager.openAudioFile(audioPath);
        return { success: true };
    });
    electron_1.ipcMain.handle('task:getCurrentRecording', async () => {
        return await exports.TaskManager.getCurrentRecordingTask();
    });
}
// CRUD and task logic
exports.TaskManager = {
    createTask: async (title, status = 'backlog') => {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const id = (0, uuid_1.v4)();
            const task = {
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
            db.run(`INSERT INTO tasks (id, title, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`, [task.id, task.title, task.status, task.createdAt, task.updatedAt], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(task);
            });
        });
    },
    updateTask: (id, updates) => {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates).filter(k => k !== 'id');
            if (fields.length === 0)
                return resolve();
            // 更新录音状态
            if (updates.status === 'recording') {
                currentRecordingTaskId = id;
            }
            else if (updates.status === 'completed' && currentRecordingTaskId === id) {
                currentRecordingTaskId = null;
            }
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => updates[f]);
            db.run(`UPDATE tasks SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id], (err) => (err ? reject(err) : resolve()));
        });
    },
    getAllTasks: () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM tasks ORDER BY createdAt DESC`, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    },
    getTask: (id) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    },
    deleteTask: (id) => {
        return new Promise((resolve, reject) => {
            // 先获取任务信息，以便删除音频文件
            db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                // 如果任务存在且有音频文件，先删除音频文件
                if (row && row.audioPath && fs.existsSync(row.audioPath)) {
                    try {
                        fs.unlinkSync(row.audioPath);
                    }
                    catch (error) {
                        console.error('Error deleting audio file:', error);
                    }
                }
                // 删除任务记录
                db.run(`DELETE FROM tasks WHERE id = ?`, [id], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        });
    },
    openAudioFile: (audioPath) => {
        if (audioPath && fs.existsSync(audioPath)) {
            electron_1.shell.showItemInFolder(audioPath);
        }
    },
    getCurrentRecordingTask: () => {
        return new Promise((resolve, reject) => {
            if (!currentRecordingTaskId) {
                resolve(null);
                return;
            }
            db.get(`SELECT * FROM tasks WHERE id = ?`, [currentRecordingTaskId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    },
    setCurrentRecordingTask: (taskId) => {
        currentRecordingTaskId = taskId;
    },
};
