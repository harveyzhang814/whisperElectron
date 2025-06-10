import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';

// 创建一个全局的事件总线来同步刷新
const listeners = new Set<() => void>();

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      console.log('Loading tasks...');
      setIsLoading(true);
      setError(null);
      const result = await window.electron.getAllTasks();
      console.log('Tasks loaded:', result);
      setTasks(result);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初始加载
    loadTasks();

    // 添加监听器
    const listener = () => {
      console.log('Refresh triggered by event bus');
      loadTasks();
    };
    listeners.add(listener);

    // 清理监听器
    return () => {
      listeners.delete(listener);
    };
  }, [loadTasks]);

  const refreshTasks = useCallback(() => {
    console.log('Broadcasting refresh event...');
    // 通知所有使用这个 hook 的组件刷新
    listeners.forEach(listener => listener());
  }, []);

  return {
    tasks,
    isLoading,
    error,
    refreshTasks
  };
}; 