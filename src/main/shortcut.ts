import { globalShortcut, Notification, BrowserWindow } from 'electron';
import { audioRecorder } from './audio';
import { TaskManager } from './taskManager';

// 快捷键动作类型
export enum ShortcutAction {
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  CANCEL_RECORDING = 'CANCEL_RECORDING',
}

// 快捷键配置类型
export interface ShortcutConfig {
  action: ShortcutAction;
  key: string;
  description: string;
  enabled: boolean;
}

// 默认快捷键配置
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    action: ShortcutAction.START_RECORDING,
    key: 'CommandOrControl+Shift+R',
    description: '开始录音',
    enabled: true,
  },
  {
    action: ShortcutAction.STOP_RECORDING,
    key: 'CommandOrControl+Shift+S',
    description: '停止录音',
    enabled: true,
  },
  {
    action: ShortcutAction.CANCEL_RECORDING,
    key: 'CommandOrControl+Shift+C',
    description: '取消录音',
    enabled: true,
  },
];

export class ShortcutManager {
  private shortcuts: Map<ShortcutAction, ShortcutConfig>;

  constructor() {
    this.shortcuts = new Map();
    this.initializeShortcuts();
  }

  private initializeShortcuts() {
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      this.shortcuts.set(shortcut.action, shortcut);
    });
    this.registerAllShortcuts();
  }

  private registerAllShortcuts() {
    globalShortcut.unregisterAll();
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.enabled) {
        this.registerShortcut(shortcut);
      }
    }
  }

  private registerShortcut(shortcut: ShortcutConfig) {
    if (!shortcut.key) return;
    const success = globalShortcut.register(shortcut.key, () => {
      this.handleShortcut(shortcut.action);
    });
    if (!success) {
      console.log('注册快捷键失败:', shortcut.key);
    } else {
      console.log('已注册快捷键:', shortcut.key);
    }
  }

  private unregisterShortcut(key: string) {
    globalShortcut.unregister(key);
    console.log('已注销快捷键:', key);
  }

  private async handleShortcut(action: ShortcutAction) {
    if (!audioRecorder) {
      console.error('Audio recorder not initialized');
      return;
    }

    const status = audioRecorder.getStatus();
    
    switch (action) {
      // 快捷键触发开始录音
      case ShortcutAction.START_RECORDING:
        if (!status.isRecording) {
          try {
            // 创建新任务
            const now = new Date().toISOString();
            const title = `Recording-${now}`;
            const task = await TaskManager.createTask(title, 'recording');
            console.log('Created new task:', task);
            
            // 开始录音
            const result = await audioRecorder.startRecording();
            if (!result.success) {
              // 如果录音失败，将任务状态改回 backlog
              await TaskManager.updateTask(task.id, { status: 'backlog' });
              console.error('Failed to start recording:', result.error);
            }
            // 发送刷新事件
            BrowserWindow.getAllWindows()[0]?.webContents.send('task:refresh');
            // 发送录音状态更新
            BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: true });
          } catch (error) {
            console.error('Error in START_RECORDING:', error);
          }
        }
        break;
      
      // 快捷键触发停止录音
      case ShortcutAction.STOP_RECORDING:
        if (status.isRecording) {
          try {
            // 获取当前录音任务
            const currentTask = await TaskManager.getCurrentRecordingTask();
            if (!currentTask) {
              console.error('未找到当前录音任务');
              return;
            }

            // 停止录音
            const result = await audioRecorder.stopRecording();
            if (result.success) {
              // 更新任务状态和音频路径
              await TaskManager.updateTask(currentTask.id, {
                status: 'completed',
                audioPath: result.path
              });
              // 发送刷新事件
              BrowserWindow.getAllWindows()[0]?.webContents.send('task:refresh');
              // 发送录音状态更新
              BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });
            } else {
              console.error('Error in STOP_RECORDING:', result.error);
            }
          } catch (error) {
            console.error('Error in STOP_RECORDING:', error);
          }
        }
        break;

      // 快捷键触发取消录音
      case ShortcutAction.CANCEL_RECORDING:
        if (status.isRecording) {
          try {
            // 获取当前录音任务
            const currentTask = await TaskManager.getCurrentRecordingTask();
            if (!currentTask) {
              console.error('未找到当前录音任务');
              return;
            }

            // 取消录音
            const result = await audioRecorder.cancelRecording();
            if (result.success) {
              // 更新任务状态
              await TaskManager.updateTask(currentTask.id, { status: 'backlog' });
              // 发送刷新事件
              BrowserWindow.getAllWindows()[0]?.webContents.send('task:refresh');
              // 发送录音状态更新
              BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });
            } else {
              console.error('Error in CANCEL_RECORDING:', result.error);
            }
          } catch (error) {
            console.error('Error in CANCEL_RECORDING:', error);
          }
        }
        break;
    }
  }

  // 获取所有快捷键配置
  public getShortcuts(): ShortcutConfig[] {
    const arr = Array.from(this.shortcuts.values());
    console.log('当前所有快捷键:', arr);
    return arr;
  }

  // 更新快捷键配置
  public updateShortcut(action: ShortcutAction, config: Partial<ShortcutConfig>) {
    const existingShortcut = this.shortcuts.get(action);
    if (existingShortcut) {
      const newKey = config.key || existingShortcut.key;
      const updatedShortcut = { ...existingShortcut, ...config, key: newKey };
      const conflict = Array.from(this.shortcuts.entries()).find(
        ([a, v]) => v.key === newKey && a !== action
      );
      if (conflict) {
        console.log('快捷键冲突，已被其他功能占用:', newKey);
        return;
      }
      if (newKey !== existingShortcut.key) {
        this.unregisterShortcut(existingShortcut.key);
      }
      this.shortcuts.set(action, updatedShortcut);
      if (updatedShortcut.enabled) {
        this.registerShortcut(updatedShortcut);
      } else {
        this.unregisterShortcut(newKey);
      }
      console.log('主进程已更新快捷键:', action, updatedShortcut);
    } else {
      console.log('主进程未找到快捷键:', action);
    }
  }

  // 清理资源
  public cleanup() {
    globalShortcut.unregisterAll();
    console.log('已注销所有全局快捷键');
  }
} 