import { globalShortcut, BrowserWindow } from 'electron';
import { FullTaskManager } from './managers/FullTaskManager';
import { RecordingSubTaskManager } from './managers/RecordingSubTaskManager';
import { AudioSourceType } from './types/task';

// 全局任务管理器实例（在index.ts中初始化）
let fullTaskManager: FullTaskManager | null = null;
let recordingManager: RecordingSubTaskManager | null = null;

// 设置任务管理器实例（由index.ts调用）
export function setShortcutTaskManagers(
  taskManager: FullTaskManager,
  recordingTaskManager: RecordingSubTaskManager
) {
  fullTaskManager = taskManager;
  recordingManager = recordingTaskManager;
}

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
    if (!recordingManager || !fullTaskManager) {
      console.error('Task managers not initialized');
      return;
    }

    const isRecording = recordingManager.isRecording();
    
    switch (action) {
      // 快捷键触发开始录音
      case ShortcutAction.START_RECORDING:
        if (!isRecording) {
          try {
            // 统一任务参数
            const taskOptions = {
              name: 'New Recording',
              description: 'Audio recording task',
              tags: ['recording'],
              audioSourceType: AudioSourceType.RECORDING
            };
            // 创建 unified 任务
            const task = await fullTaskManager.createUnifiedTask(taskOptions);
            // 启动录音阶段
            await recordingManager.startTaskStage(task.id);
            console.log('Started recording via shortcut:', task.id);
            BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: true });
          } catch (error) {
            console.error('Error in START_RECORDING shortcut:', error);
          }
        }
        break;
      
      // 快捷键触发停止录音
      case ShortcutAction.STOP_RECORDING:
        if (isRecording) {
          try {
            const currentTaskId = recordingManager.getCurrentRecordingTaskId();
            if (currentTaskId) {
              // 统一任务流：停止录音阶段
              await recordingManager.stopTaskStage(currentTaskId);
              console.log('Stopped recording via shortcut:', currentTaskId);
              BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });
            }
          } catch (error) {
            console.error('Error in STOP_RECORDING shortcut:', error);
          }
        }
        break;

      // 快捷键触发取消录音
      case ShortcutAction.CANCEL_RECORDING:
        if (isRecording) {
          try {
            const currentTaskId = recordingManager.getCurrentRecordingTaskId();
            if (currentTaskId) {
              // 统一任务流：取消录音阶段
              await recordingManager.cancelTaskStage(currentTaskId);
              console.log('Cancelled recording via shortcut:', currentTaskId);
              BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });
            }
          } catch (error) {
            console.error('Error in CANCEL_RECORDING shortcut:', error);
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
      
      // 如果快捷键改变了，先注销旧的
      if (newKey !== existingShortcut.key) {
        this.unregisterShortcut(existingShortcut.key);
      }
      
      // 更新配置
      const updatedShortcut = { ...existingShortcut, ...config };
      this.shortcuts.set(action, updatedShortcut);
      
      // 注册新的快捷键
      if (updatedShortcut.enabled) {
        this.registerShortcut(updatedShortcut);
      }
      
      console.log('已更新快捷键:', action, updatedShortcut);
    }
  }

  // 清理所有快捷键
  public cleanup() {
    globalShortcut.unregisterAll();
    console.log('已清理所有快捷键');
  }
} 