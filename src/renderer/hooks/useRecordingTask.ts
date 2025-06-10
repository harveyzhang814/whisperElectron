import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';

// 创建全局事件总线
const listeners = new Set<() => void>();

// 全局状态
let globalCurrentTaskId: string | null = null;

export const useRecordingTask = () => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 等待主进程就绪
    window.electron.onReady(() => {
      setIsReady(true);
    });
  }, []);

  const loadCurrentTask = useCallback(async () => {
    if (!isReady) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const task = await window.electron.getCurrentRecordingTask();
      console.log('Current recording task loaded:', task);
      setCurrentTask(task);
      globalCurrentTaskId = task?.id || null;
    } catch (err) {
      console.error('Error loading current recording task:', err);
      setError(err instanceof Error ? err.message : 'Failed to load current recording task');
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    // 初始加载
    if (isReady) {
      loadCurrentTask();
    }

    // 添加监听器
    const listener = () => {
      if (isReady) {
        console.log('Recording task refresh triggered');
        loadCurrentTask();
      }
    };
    listeners.add(listener);

    // 清理监听器
    return () => {
      listeners.delete(listener);
    };
  }, [loadCurrentTask, isReady]);

  const setCurrentRecordingTask = useCallback(async (taskId: string | null) => {
    try {
      console.log('Setting current recording task:', taskId);
      globalCurrentTaskId = taskId;
      // 通知所有监听器更新
      listeners.forEach(listener => listener());
    } catch (error) {
      console.error('Error setting current recording task:', error);
      throw error;
    }
  }, []);

  const getCurrentRecordingTaskId = useCallback(() => {
    return globalCurrentTaskId;
  }, []);

  return {
    currentTask,
    isLoading,
    error,
    setCurrentRecordingTask,
    getCurrentRecordingTaskId,
    loadCurrentTask
  };
}; 