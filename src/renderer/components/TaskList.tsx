import React, { useState, useEffect } from 'react';
import { Task } from '../types/task';
import { useTasks } from '../hooks/useTasks';
import { useRecordingTask } from '../hooks/useRecordingTask';

interface RecordingStatus {
  isRecording: boolean;
}

export const TaskList: React.FC = () => {
  const { tasks, isLoading, error, refreshTasks } = useTasks();
  const { setCurrentRecordingTask, loadCurrentTask, getCurrentRecordingTaskId } = useRecordingTask();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({ isRecording: false });

  // 添加日志以追踪任务列表变化
  useEffect(() => {
    console.log('Tasks updated:', tasks);
  }, [tasks]);

  const handleStartRecording = async (task: Task) => {
    try {
      console.log('Starting recording for task:', task);
      // 先开始录音
      const result = await window.electron.startRecording();
      console.log('Start recording result:', result);
      if (!result.success) {
        // 如果录音失败，将任务状态改回backlog
        await window.electron.updateTask(task.id, { status: 'backlog' });
        await setCurrentRecordingTask(null);
        refreshTasks();
        console.error('Failed to start recording:', result.error);
      } else {
        // 更新任务状态为录音中
        await window.electron.updateTask(task.id, { status: 'recording' });
        await setCurrentRecordingTask(task.id);
        refreshTasks();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      refreshTasks();
    }
  };

  const handleStopRecording = async (task: Task) => {
    try {
      const result = await window.electron.stopRecording();
      console.log('Stop recording result:', result);
      
      // 重新获取最新的任务状态
      await loadCurrentTask();
      const currentTaskId = getCurrentRecordingTaskId();
      
      if (result.success && currentTaskId) {
        // 如果停止成功，更新任务状态
        await window.electron.updateTask(currentTaskId, { 
          status: 'completed',
          audioPath: result.path
        });
        await setCurrentRecordingTask(null);
        refreshTasks();
      } else {
        console.error('Failed to stop recording:', result.error);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancelRecording = async (task: Task) => {
    try {
      const result = await window.electron.cancelRecording();
      
      // 重新获取最新的任务状态
      await loadCurrentTask();
      const currentTaskId = getCurrentRecordingTaskId();
      
      if (currentTaskId) {
        await window.electron.updateTask(currentTaskId, { status: 'backlog' });
        await setCurrentRecordingTask(null);
      }
      if (!result.success) {
        console.error('Failed to cancel recording:', result.error);
      }
      refreshTasks();
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const handleOpenAudio = (task: Task) => {
    if (task.audioPath) {
      window.electron.openAudioFile(task.audioPath);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      // 删除任务记录（taskManager 会自动处理音频文件的删除）
      await window.electron.deleteTask(task.id);
      // 重新加载任务列表
      refreshTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTitleClick = (task: Task) => {
    if (task.status === 'backlog' || task.status === 'completed') {
      setEditingTaskId(task.id);
      setEditingTitle(task.title);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleBlur = async () => {
    if (editingTaskId && editingTitle.trim()) {
      await window.electron.updateTask(editingTaskId, { title: editingTitle.trim() });
      refreshTasks();
    }
    setEditingTaskId(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'backlog':
        return '待录音';
      case 'recording':
        return '录音中';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  if (isLoading) {
    return <div className="loading-state">Loading tasks...</div>;
  }

  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        暂无录音任务。点击"Create Memo Task"创建新任务。
      </div>
    );
  }

  return (
    <div className="task-items">
      {tasks.map(task => (
        <div key={task.id} className="task-item">
          <div className="task-info">
            {editingTaskId === task.id ? (
              <input
                type="text"
                className="task-title-input"
                value={editingTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
              />
            ) : (
              <div 
                className="task-title"
                onClick={() => handleTitleClick(task)}
                style={{ cursor: (task.status === 'backlog' || task.status === 'completed') ? 'text' : 'default' }}
              >
                {task.title}
              </div>
            )}
            <div className="task-id">{task.id}</div>
            <div className="task-status">
              <span className="task-status-text">
                Created at：{formatDate(task.createdAt)}
              </span>
              <span className="task-status-text">
                Status：{getStatusText(task.status)}
              </span>
            </div>
          </div>
          <div className="task-actions">
            {task.status === 'backlog' && (
              <button 
                className="task-button start"
                onClick={() => handleStartRecording(task)}
              >
                Start
              </button>
            )}
            {task.status === 'recording' && (
              <>
                <button 
                  className="task-button stop"
                  onClick={() => handleStopRecording(task)}
                >
                  End
                </button>
                <button 
                  className="task-button cancel"
                  onClick={() => handleCancelRecording(task)}
                >
                  Cancel
                </button>
              </>
            )}
            {task.status === 'completed' && task.audioPath && (
              <button 
                className="task-button open"
                onClick={() => handleOpenAudio(task)}
              >
                Open File
              </button>
            )}
            <button 
              className="task-button delete"
              onClick={() => handleDeleteTask(task)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}; 