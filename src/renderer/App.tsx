import React, { useState, useEffect } from 'react';
import { ShortcutSettings } from './components/ShortcutSettings';
import { TaskList } from './components/TaskList';
import { useTasks } from './hooks/useTasks';
import { useRecordingTask } from './hooks/useRecordingTask';
import './App.css';

interface RecordingStatus {
  isRecording: boolean;
}

const App: React.FC = () => {
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
  });
  const { refreshTasks } = useTasks();
  const { setCurrentRecordingTask, currentTask, loadCurrentTask, getCurrentRecordingTaskId } = useRecordingTask();

  // useEffect(() => {
  //   Poll recording status every 500ms
  //   const statusInterval = setInterval(async () => {
  //     const status = await window.electron.getRecordingStatus();
  //     setRecordingStatus(status);
  //   }, 500);

  //   return () => clearInterval(statusInterval);
  // }, []);

  const handleQuit = async () => {
    await window.electron.quitApp();
  };

  const handleStartRecording = async () => {
    try {
      // First create a task
      const now = new Date().toISOString();
      const title = `Recording-${now}`;
      const taskResult = await window.electron.createTask(title, 'recording');
      console.log('Recording task created:', taskResult);
      
      // Set as current recording task
      await setCurrentRecordingTask(taskResult.id);
      refreshTasks();

      // Then start recording
      const result = await window.electron.startRecording();
      if (!result.success) {
        // If recording fails, update the task status back to backlog
        await window.electron.updateTask(taskResult.id, { status: 'backlog' });
        await setCurrentRecordingTask(null);
        refreshTasks();
        console.error('Failed to start recording:', result.error);
      } else {
        // 更新录音状态
        const status = await window.electron.getRecordingStatus();
        setRecordingStatus(status);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      refreshTasks();
    }
  };

  const handleStopRecording = async () => {
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
        const status = await window.electron.getRecordingStatus();
        setRecordingStatus(status);
        refreshTasks();
      } else {
        console.error('Failed to stop recording:', result.error);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancelRecording = async () => {
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

  const handleCreateMemoTask = async () => {
    try {
      const now = new Date().toISOString();
      const title = `备忘录-${now}`;
      const result = await window.electron.createTask(title, 'backlog');
      console.log('Memo task created:', result);
      refreshTasks();
    } catch (error) {
      console.error('Error creating memo task:', error);
    }
  };

  const getStatusText = () => {
    if (recordingStatus.isRecording) {
      return 'Recording...';
    }
    return 'Ready to record';
  };

  return (
    <div className="app">
      {/* Top Toolbar */}
      <header className="toolbar">
        <div className="recording-controls">
          {!recordingStatus.isRecording ? (
            <>
              <button 
                className="record-button"
                onClick={handleStartRecording}
              >
                Start
              </button>
              <button 
                className="memo-button"
                onClick={handleCreateMemoTask}
              >
                Create
              </button>
            </>
          ) : (
            <>
              <button 
                className="stop-button"
                onClick={handleStopRecording}
              >
                Stop
              </button>
              <button 
                className="cancel-button"
                onClick={handleCancelRecording}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <div className="toolbar-right">
          <button 
            className="settings-button"
            onClick={() => setShowShortcutSettings(true)}
          >
            Settings
          </button>
          <button 
            className="quit-button"
            onClick={handleQuit}
          >
            Quit
          </button>
        </div>
        {/* <div className="status-indicator">{getStatusText()}</div> */}
      </header>

      {/* Task List */}
      <main className="task-list">
        <div className="task-list-header">
          <h2>Recent Recordings</h2>
        </div>
        <div className="task-items">
          <TaskList />
        </div>
      </main>

      {/* Status Bar */}
      {/* <footer className="status-bar">
        <div className="status-text">{getStatusText()}</div>
      </footer> */}

      {/* Shortcut Settings Modal */}
      {showShortcutSettings && (
        <ShortcutSettings onClose={() => setShowShortcutSettings(false)} />
      )}
    </div>
  );
};

export default App; 