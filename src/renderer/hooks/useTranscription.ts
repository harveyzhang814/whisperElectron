import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';

export const useTranscription = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTranscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await window.electron.getTranscriptionStatus();
      setIsTranscribing(status.isTranscribing);
      setActiveTaskIds(status.activeTaskIds);
    } catch (err) {
      console.error('Error loading transcription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcription status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startTranscription = useCallback(async (taskId: string, options?: any) => {
    try {
      setError(null);
      const result = await window.electron.startTranscription(taskId, options);
      if (result.success) {
        await loadTranscriptionStatus();
      } else {
        setError(result.error || 'Failed to start transcription');
      }
      return result;
    } catch (err) {
      console.error('Error starting transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadTranscriptionStatus]);

  const stopTranscription = useCallback(async (taskId: string) => {
    try {
      setError(null);
      const result = await window.electron.stopTranscription(taskId);
      if (result.success) {
        await loadTranscriptionStatus();
      } else {
        setError(result.error || 'Failed to stop transcription');
      }
      return result;
    } catch (err) {
      console.error('Error stopping transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop transcription');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadTranscriptionStatus]);

  const cancelTranscription = useCallback(async (taskId: string) => {
    try {
      setError(null);
      const result = await window.electron.cancelTranscription(taskId);
      if (result.success) {
        await loadTranscriptionStatus();
      } else {
        setError(result.error || 'Failed to cancel transcription');
      }
      return result;
    } catch (err) {
      console.error('Error canceling transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel transcription');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [loadTranscriptionStatus]);

  useEffect(() => {
    // 初始加载
    loadTranscriptionStatus();

    // 监听转录进度事件
    window.electron.onTranscriptionProgress((progress) => {
      console.log('Transcription progress:', progress);
    });

    // 监听转录完成事件
    window.electron.onTranscriptionComplete((result) => {
      console.log('Transcription completed:', result);
      loadTranscriptionStatus();
    });

    // 监听转录错误事件
    window.electron.onTranscriptionError((error) => {
      console.error('Transcription error:', error);
      setError(error.message || 'Transcription failed');
      loadTranscriptionStatus();
    });

    return () => {
      // 清理事件监听器
      window.electron.removeTranscriptionListeners();
    };
  }, [loadTranscriptionStatus]);

  return {
    isTranscribing,
    activeTaskIds,
    isLoading,
    error,
    loadTranscriptionStatus,
    startTranscription,
    stopTranscription,
    cancelTranscription
  };
}; 