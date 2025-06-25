import React, { useState } from 'react';
import { Task, StageState, AudioSourceType, TaskStage } from '../types/task';
import { useTasks } from '../hooks/useTasks';
import { useTranscription } from '../hooks/useTranscription';
import { TaskStateTag } from './TaskStateTag';
import { TranscriptionModal } from './TranscriptionModal';

export const TaskList: React.FC = () => {
  const { tasks, isLoading, error, deleteTask, updateTask } = useTasks();
  const { isTranscribing, activeTaskIds, startTranscription, cancelTranscription } = useTranscription();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false);
  const [selectedTaskForTranscription, setSelectedTaskForTranscription] = useState<Task | null>(null);

  // Add logging for tasks
  React.useEffect(() => {
    console.log('📋 [TaskList] Unified tasks updated:', {
      count: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        type: task.type,
        state: task.state,
        progress: task.progress,
        name: task.metadata?.name,
        createdAt: task.metadata?.createdAt,
        stages: task.stages,
        audioSourceData: task.audioSourceData,
        transcriptionData: task.transcriptionData
      }))
    });
  }, [tasks]);

  const handleStartRecording = async (taskId: string) => {
    try {
      const result = await window.electron.startTaskStage(taskId, 'AUDIO_SOURCE');
      if (!result.success) {
        console.error('Failed to start recording:', result.error);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async (taskId: string) => {
    try {
      const result = await window.electron.stopTaskStage(taskId, 'AUDIO_SOURCE');
      if (!result.success) {
        console.error('Failed to stop recording:', result.error);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancelRecording = async (taskId?: string) => {
    try {
      if (!taskId) return;
      const result = await window.electron.cancelTaskStage(taskId, 'AUDIO_SOURCE');
      if (!result.success) {
        console.error('Failed to cancel recording:', result.error);
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleNameClick = (task: Task) => {
    const audioSourceStage = task.stages?.AUDIO_SOURCE;
    const transcriptionStage = task.stages?.TRANSCRIPTION;
    
    // 只有在任务完成或取消时才允许编辑
    if ((audioSourceStage?.state === 'COMPLETED' || audioSourceStage?.state === 'CANCELLED') &&
        (transcriptionStage?.state === 'PENDING' || transcriptionStage?.state === 'COMPLETED' || transcriptionStage?.state === 'CANCELLED')) {
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
        await updateTask(editingTaskId, { 
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

  // 处理转录按钮点击
  const handleTranscribeClick = (task: Task) => {
    setSelectedTaskForTranscription(task);
    setTranscriptionModalOpen(true);
  };

  // 处理转录弹窗关闭
  const handleTranscriptionModalClose = () => {
    setTranscriptionModalOpen(false);
    setSelectedTaskForTranscription(null);
  };

  // 处理转录完成
  const handleTranscriptionComplete = (taskId: string, result: any) => {
    console.log('Transcription completed for task:', taskId, result);
    // 可以在这里添加完成后的处理逻辑，比如显示通知或刷新任务列表
    // 暂时保持弹窗打开以显示结果
  };

  // 处理转录错误
  const handleTranscriptionError = (taskId: string, error: any) => {
    console.error('Transcription error for task:', taskId, error);
    // 可以在这里添加错误处理逻辑，比如显示错误通知
  };

  // 获取音频文件路径
  const getAudioFilePath = (task: Task): string | undefined => {
    console.log('[TaskList] getAudioFilePath called:', {
      taskId: task.id,
      audioSourceData: task.audioSourceData,
      audioSourceDataType: typeof task.audioSourceData,
      audioFilePath: task.audioSourceData?.audioFilePath,
      audioFilePathType: typeof task.audioSourceData?.audioFilePath,
      fullTaskStages: task.stages
    });
    return task.audioSourceData?.audioFilePath;
  };

  // 检查任务是否可以转录
  const canTranscribe = (task: Task): boolean => {
    const audioSourceStage = task.stages?.AUDIO_SOURCE;
    const transcriptionStage = task.stages?.TRANSCRIPTION;
    
    // 音频源阶段必须完成，转录阶段必须是待处理或失败状态
    return audioSourceStage?.state === 'COMPLETED' && 
           (transcriptionStage?.state === 'PENDING' || transcriptionStage?.state === 'FAILED') &&
           !!getAudioFilePath(task);
  };

  // 检查任务是否正在转录
  const isTaskTranscribing = (task: Task): boolean => {
    return activeTaskIds.includes(task.id);
  };

  // 获取音频源阶段状态
  const getAudioSourceStageState = (task: Task): string => {
    const state = task.stages?.AUDIO_SOURCE?.state || 'PENDING';
    console.log('[TaskList] getAudioSourceStageState:', {
      taskId: task.id,
      state,
      fullStages: task.stages,
      audioSourceStage: task.stages?.AUDIO_SOURCE
    });
    return state;
  };

  // 获取转录阶段状态
  const getTranscriptionStageState = (task: Task): string => {
    return task.stages?.TRANSCRIPTION?.state || 'PENDING';
  };

  // 获取音频源类型
  const getAudioSourceType = (task: Task): string => {
    return task.audioSourceData?.audioSourceType || 'RECORDING';
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

  const getStageStateText = (state: string) => {
    switch (state) {
      case 'PENDING':
        return '待处理';
      case 'RUNNING':
        return '进行中';
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

  const getStageStateClass = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'state-pending';
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
        {tasks.map(task => {
          const audioSourceState = getAudioSourceStageState(task);
          const transcriptionState = getTranscriptionStageState(task);
          const audioSourceType = getAudioSourceType(task);
          const isTranscribingTask = isTaskTranscribing(task);
          const audioFilePath = getAudioFilePath(task);
          
          console.log('[TaskList] Render task details:', {
            id: task.id,
            audioSourceState,
            transcriptionState,
            audioSourceType,
            isTranscribingTask,
            audioFilePath,
            taskStages: task.stages,
            audioSourceData: task.audioSourceData,
            taskState: task.state,
            taskProgress: task.progress
          });
          
          return (
            <div key={task.id} className={`task-item ${getStageStateClass(audioSourceState)}`}>
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
                    style={{ cursor: (audioSourceState === 'COMPLETED' || audioSourceState === 'CANCELLED') ? 'text' : 'default' }}
                  >
                    {task.metadata.name}
                  </div>
                )}
                <div className="task-meta-row">
                  <span className="task-date">
                    {formatDate(task.metadata.createdAt)}
                  </span>
                  <span className="task-type">
                    {audioSourceType === 'RECORDING' ? '录音' : '导入'}
                  </span>
                  <TaskStateTag state={audioSourceState} />
                  {task.progress > 0 && (
                    <span className="task-progress">
                      {Math.round(task.progress * 100)}%
                    </span>
                  )}
                </div>
                
                {/* 阶段状态显示 */}
                <div className="task-stages">
                  <div className={`stage-info ${getStageStateClass(audioSourceState)}`}>
                    <span className="stage-label">音频源:</span>
                    <span className="stage-state">{getStageStateText(audioSourceState)}</span>
                    {audioSourceState === 'IN_PROGRESS' && (
                      <span className="stage-progress">
                        {Math.round((task.stages?.AUDIO_SOURCE?.progress || 0) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={`stage-info ${getStageStateClass(transcriptionState)}`}>
                    <span className="stage-label">转录:</span>
                    <span className="stage-state">{getStageStateText(transcriptionState)}</span>
                    {transcriptionState === 'IN_PROGRESS' && (
                      <span className="stage-progress">
                        {Math.round((task.stages?.TRANSCRIPTION?.progress || 0) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {task.error && (
                  <div className="task-error">
                    Error: {task.error}
                  </div>
                )}
              </div>
              <div className="task-actions">
                {/* 音频源阶段操作 */}
                {audioSourceType === 'RECORDING' && (
                  <>
                    {(audioSourceState === 'PENDING' || audioSourceState === 'FAILED' || audioSourceState === 'CANCELLED') && (
                      <button
                        className="task-button start"
                        onClick={() => handleStartRecording(task.id)}
                      >
                        Start
                      </button>
                    )}
                    {audioSourceState === 'IN_PROGRESS' && (
                      <>
                        <button
                          className="task-button stop"
                          onClick={() => handleStopRecording(task.id)}
                        >
                          Stop
                        </button>
                        <button
                          className="task-button cancel"
                          onClick={() => handleCancelRecording(task.id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </>
                )}
                
                {/* 音频文件操作 */}
                {(() => {
                  console.log('[TaskList] Open button condition check:', {
                    taskId: task.id,
                    audioSourceState,
                    audioFilePath,
                    condition1: audioSourceState === 'COMPLETED',
                    condition2: !!getAudioFilePath(task),
                    getAudioFilePathResult: getAudioFilePath(task)
                  });
                  
                  const shouldShowOpenButton = audioSourceState === 'COMPLETED' && getAudioFilePath(task);
                  
                  console.log('[TaskList] Open button should show:', {
                    taskId: task.id,
                    shouldShowOpenButton,
                    audioSourceState,
                    audioFilePath
                  });
                  
                  if (shouldShowOpenButton) {
                    console.log('[TaskList] Rendering Open button for task:', task.id);
                    return (
                      <button
                        className="task-button open"
                        onClick={() => handleOpenAudio(getAudioFilePath(task)!)}
                      >
                        Open
                      </button>
                    );
                  } else {
                    console.log('[TaskList] NOT rendering Open button for task:', task.id, {
                      reason: audioSourceState !== 'COMPLETED' ? 'audioSourceState not COMPLETED' : 'no audioFilePath'
                    });
                    return null;
                  }
                })()}
                
                {/* 转录操作
                {canTranscribe(task) && !isTranscribingTask && (
                  <button
                    className="task-button transcribe"
                    onClick={() => handleTranscribeClick(task)}
                  >
                    Transcribe
                  </button>
                )}
                
                {isTranscribingTask && (
                  <button
                    className="task-button cancel"
                    onClick={() => cancelTranscription(task.id)}
                  >
                    Cancel Transcribe
                  </button>
                )} */}
                
                <button
                  className="task-button delete"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 转录弹窗 */}
      <TranscriptionModal
        isOpen={transcriptionModalOpen}
        onClose={handleTranscriptionModalClose}
        recordingTaskId={selectedTaskForTranscription?.id}
        audioFilePath={selectedTaskForTranscription ? getAudioFilePath(selectedTaskForTranscription) : undefined}
        taskName={selectedTaskForTranscription?.metadata.name}
        onTranscriptionComplete={handleTranscriptionComplete}
        onTranscriptionError={handleTranscriptionError}
      />
    </div>
  );
}; 