import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';

export const useRecordingTask = () => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentTask = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electron.getCurrentRecordingTask();
      
      if (result.success && result.task) {
        setCurrentTask(result.task);
      } else {
        setCurrentTask(null);
      }
    } catch (err) {
      console.error('Error loading current recording task:', err);
      setError(err instanceof Error ? err.message : 'Failed to load current recording task');
      setCurrentTask(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初始加载
    loadCurrentTask();

    // 监听任务刷新事件
    window.electron.onTaskRefresh(() => {
      loadCurrentTask();
    });
  }, [loadCurrentTask]);

  return {
    currentTask,
    isLoading,
    error,
    loadCurrentTask
  };
}; 