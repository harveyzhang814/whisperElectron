import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 [useTasks] Loading tasks...');
      
      const result = await window.electron.getAllTasks();
      
      if (result.success) {
        const tasks = result.tasks || [];
        console.log('✅ [useTasks] Tasks loaded successfully:', {
          count: tasks.length,
          tasks: tasks.map(task => ({
            id: task.id,
            type: task.type,
            state: task.state,
            progress: task.progress,
            metadata: task.metadata,
            extendedData: task.extendedData,
            error: task.error
          }))
        });
        setTasks(tasks);
      } else {
        console.error('❌ [useTasks] Failed to load tasks:', result.error);
        setError(result.error || 'Failed to load tasks');
        setTasks([]);
      }
    } catch (err) {
      console.error('❌ [useTasks] Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const result = await window.electron.deleteTask(taskId);
      
      if (result.success) {
        // 重新加载任务列表
        await loadTasks();
      } else {
        setError(result.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, [loadTasks]);

  useEffect(() => {
    // 初始加载
    loadTasks();

    // 监听任务刷新事件
    window.electron.onTaskRefresh(() => {
      loadTasks();
    });
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    loadTasks,
    deleteTask
  };
}; 