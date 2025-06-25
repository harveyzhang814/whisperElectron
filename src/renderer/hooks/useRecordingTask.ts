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

  const startRecording = useCallback(async (taskId?: string) => {
    try {
      const result = await window.electron.startRecording(taskId);
      if (result.success) {
        await loadCurrentTask();
      } else {
        setError(result.error || 'Failed to start recording');
      }
      return result;
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadCurrentTask]);

  const stopRecording = useCallback(async (taskId?: string) => {
    try {
      const result = await window.electron.stopRecording(taskId);
      if (result.success) {
        await loadCurrentTask();
      } else {
        setError(result.error || 'Failed to stop recording');
      }
      return result;
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadCurrentTask]);

  const cancelRecording = useCallback(async (taskId?: string) => {
    try {
      const result = await window.electron.cancelRecording(taskId);
      if (result.success) {
        await loadCurrentTask();
      } else {
        setError(result.error || 'Failed to cancel recording');
      }
      return result;
    } catch (err) {
      console.error('Error canceling recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadCurrentTask]);

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
    loadCurrentTask,
    startRecording,
    stopRecording,
    cancelRecording
  };
}; 