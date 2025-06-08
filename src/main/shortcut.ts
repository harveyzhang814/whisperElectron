import { globalShortcut, Notification } from 'electron';

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
  private isRecording: boolean = false;

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

  private handleShortcut(action: ShortcutAction) {
    switch (action) {
      case ShortcutAction.START_RECORDING:
        if (!this.isRecording) {
          this.isRecording = true;
          new Notification({ title: '快捷键触发', body: '开始录音快捷键已触发！' }).show();
          console.log('开始录音');
        }
        break;
      case ShortcutAction.STOP_RECORDING:
        if (this.isRecording) {
          this.isRecording = false;
          new Notification({ title: '快捷键触发', body: '停止录音快捷键已触发！' }).show();
          console.log('停止录音');
        }
        break;
      case ShortcutAction.CANCEL_RECORDING:
        if (this.isRecording) {
          this.isRecording = false;
          new Notification({ title: '快捷键触发', body: '取消录音快捷键已触发！' }).show();
          console.log('取消录音');
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