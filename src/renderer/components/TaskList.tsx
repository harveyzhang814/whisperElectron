import React, { useState } from 'react';
import { Task } from '../types/task';
import { useTasks } from '../hooks/useTasks';
import { TaskStateTag } from './TaskStateTag';

export const TaskList: React.FC = () => {
  const { tasks, isLoading, error, deleteTask, loadTasks } = useTasks();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Add logging for tasks
  React.useEffect(() => {
    console.log('📋 [TaskList] Tasks updated:', {
      count: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        type: task.type,
        state: task.state,
        progress: task.progress,
        name: task.metadata?.name,
        createdAt: task.metadata?.createdAt,
        extendedData: task.extendedData
      }))
    });
  }, [tasks]);

  const handleStartRecording = async (taskId: string) => {
    try {
      const result = await window.electron.startRecording(taskId);
      if (!result.success) {
        console.error('Failed to start recording:', result.error);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async (taskId: string) => {
    try {
      const result = await window.electron.stopRecording(taskId);
      if (!result.success) {
        console.error('Failed to stop recording:', result.error);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancelRecording = async () => {
    try {
      const result = await window.electron.cancelRecording();
      if (!result.success) {
        console.error('Failed to cancel recording:', result.error);
      }
      await loadTasks();
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleNameClick = (task: Task) => {
    if (task.state === 'CREATED' || task.state === 'COMPLETED' || task.state === 'CANCELLED') {
      setEditingTaskId(task.id);
      setEditingName(task.metadata.name);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameBlur = async () => {
    if (editingTaskId && editingName.trim()) {
      try {
        await window.electron.updateTask(editingTaskId, { 
          metadata: { name: editingName.trim() }
        });
      } catch (error) {
        console.error('Error updating task name:', error);
      }
    }
    setEditingTaskId(null);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
    }
  };

  const handleOpenAudio = (audioPath: string) => {
    window.electron.openAudioFile(audioPath);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStateText = (state: string) => {
    switch (state) {
      case 'CREATED':
        return '待录音';
      case 'RUNNING':
        return '录音中';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELLED':
        return '已取消';
      case 'FAILED':
        return '失败';
      default:
        return state;
    }
  };

  const getStateClass = (state: string) => {
    switch (state) {
      case 'CREATED':
        return 'state-created';
      case 'RUNNING':
        return 'state-running';
      case 'COMPLETED':
        return 'state-completed';
      case 'CANCELLED':
        return 'state-cancelled';
      case 'FAILED':
        return 'state-failed';
      default:
        return 'state-unknown';
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
        点击"Start Recording"开始录音。
      </div>
    );
  }

  return (
    <div className="task-list">
      {/* 任务列表 */}
      <div className="task-items">
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${getStateClass(task.state)}`}>
            <div className="task-info">
              {editingTaskId === task.id ? (
                <input
                  type="text"
                  className="task-name-input"
                  value={editingName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                />
              ) : (
                <div 
                  className="task-name"
                  onClick={() => handleNameClick(task)}
                  style={{ cursor: (task.state === 'CREATED' || task.state === 'COMPLETED' || task.state === 'CANCELLED') ? 'text' : 'default' }}
                >
                  {task.metadata.name}
                </div>
              )}
              <div className="task-meta-row">
                <span className="task-date">
                  {formatDate(task.metadata.createdAt)}
                </span>
                <TaskStateTag state={task.state} />
                {task.progress > 0 && (
                  <span className="task-progress">
                    {Math.round(task.progress * 100)}%
                  </span>
                )}
              </div>
              {/* <div className="task-id">{task.id}</div> */}
              {task.error && (
                <div className="task-error">
                  Error: {task.error}
                </div>
              )}
            </div>
            <div className="task-actions">
              {(task.state === 'CREATED' || task.state === 'CANCELLED') && (
                <button
                  className="task-button start"
                  onClick={() => handleStartRecording(task.id)}
                >
                  Start
                </button>
              )}
              {task.state === 'RUNNING' && (
                <>
                  <button
                    className="task-button stop"
                    onClick={() => handleStopRecording(task.id)}
                  >
                    Stop
                  </button>
                  <button
                    className="task-button cancel"
                    onClick={() => handleCancelRecording()}
                  >
                    Cancel
                  </button>
                </>
              )}
              {task.recordingMetadata?.outputPath && (
                <button
                  className="task-button open"
                  onClick={() => handleOpenAudio(task.recordingMetadata!.outputPath!)}
                >
                  Open
                </button>
              )}
              <button
                className="task-button delete"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 