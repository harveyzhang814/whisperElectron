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
      console.log(' [useTasks] Loading unified tasks...');
      
      const result = await window.electron.getAllUnifiedTasks();
      
      if (result.success) {
        const tasks = result.tasks || [];
        console.log('✅ [useTasks] Unified tasks loaded successfully:', {
          count: tasks.length,
          tasks: tasks.map(task => ({
            id: task.id,
            type: task.type,
            state: task.state,
            progress: task.progress,
            metadata: task.metadata,
            stages: task.stages,
            audioSourceState: task.stages?.AUDIO_SOURCE?.state
          }))
        });
        console.log('[useTasks] setTasks before:', tasks.map(t => ({
          id: t.id,
          audioSourceState: t.stages?.AUDIO_SOURCE?.state
        })));
        setTasks(tasks);
        console.log('[useTasks] setTasks after:', tasks.map(t => ({
          id: t.id,
          audioSourceState: t.stages?.AUDIO_SOURCE?.state
        })));
      } else {
        console.error('❌ [useTasks] Failed to load unified tasks:', result.error);
        setError(result.error || 'Failed to load tasks');
        setTasks([]);
      }
    } catch (err) {
      console.error('❌ [useTasks] Error loading unified tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const result = await window.electron.deleteUnifiedTask(taskId);
      
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

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      const result = await window.electron.updateUnifiedTask(taskId, updates);
      
      if (result.success) {
        // 重新加载任务列表
        await loadTasks();
      } else {
        setError(result.error || 'Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [loadTasks]);

  const createTask = useCallback(async (options?: any) => {
    try {
      console.log('🔄 [useTasks] Creating task with options:', options);
      
      // 如果不提供 options，则传递 undefined，后端会自动生成默认值
      const result = await window.electron.createUnifiedTask(options);
      
      console.log('📋 [useTasks] Create task result:', {
        success: result.success,
        taskId: result.task?.id,
        taskState: result.task?.state,
        error: result.error
      });
      
      if (result.success) {
        // 重新加载任务列表
        console.log('🔄 [useTasks] Reloading tasks after creation...');
        await loadTasks();
        console.log('✅ [useTasks] Tasks reloaded successfully');
        return result.task;
      } else {
        console.error('❌ [useTasks] Failed to create task:', result.error);
        setError(result.error || 'Failed to create task');
        return null;
      }
    } catch (err) {
      console.error('❌ [useTasks] Error creating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
      return null;
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
    deleteTask,
    updateTask,
    createTask
  };
}; 