import React, { useState, useEffect } from 'react';
import { ShortcutSettings } from './components/ShortcutSettings';
import { ApiSettings } from './components/ApiSettings';
import { WhisperTest } from './components/WhisperTest';
import { TaskList } from './components/TaskList';
import { useRecordingTask } from './hooks/useRecordingTask';
import './App.css';

type SettingsType = 'shortcuts' | 'api' | 'test' | null;

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState<SettingsType>(null);
  const { currentTask } = useRecordingTask();

  useEffect(() => {
    // 监听托盘菜单事件
    window.electron.onRecordingStart(() => {
      handleStartRecording();
    });
    window.electron.onRecordingStop(() => {
      handleStopRecording();
    });
    window.electron.onRecordingCancel(() => {
      handleCancelRecording();
    });

    return () => {
      // 清理事件监听
      window.electron.removeTrayListeners();
    };
  }, []);

  const handleQuit = async () => {
    await window.electron.quitApp();
  };

  const handleStartRecording = async () => {
    try {
      const result = await window.electron.startRecording();
      if (!result.success) {
        console.error('Failed to start recording:', result.error);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electron.stopRecording();
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
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  const getStatusText = () => {
    if (currentTask) {
      return 'Recording...';
    }
    return 'Ready to record';
  };

  return (
    <div className="app">
      <div className="main-panel">
      {/* Top Toolbar */}
        <div className="panel-section toolbar-section">
      <header className="toolbar">
        <div className="recording-controls">
          {!currentTask ? (
            <button 
              className="record-button"
              onClick={handleStartRecording}
            >
              Start
            </button>
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
          <div className="settings-buttons">
            <button 
              className={`settings-button ${showSettings === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setShowSettings(showSettings === 'shortcuts' ? null : 'shortcuts')}
            >
              Shortcuts
            </button>
            <button 
              className={`settings-button ${showSettings === 'api' ? 'active' : ''}`}
              onClick={() => setShowSettings(showSettings === 'api' ? null : 'api')}
            >
              API
            </button>
            <button 
              className={`settings-button ${showSettings === 'test' ? 'active' : ''}`}
              onClick={() => setShowSettings(showSettings === 'test' ? null : 'test')}
            >
              Test
            </button>
          </div>
          <button 
            className="minimize-button"
            onClick={() => window.electron.minimizeToTray()}
          >
            Mini
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
        </div>
      {/* Task List */}
        <div className="panel-section tasklist-section">
      <main className="task-list">
        <div className="task-list-header">
          <h2>Recent</h2>
        </div>
        <div className="task-items">
          <TaskList />
        </div>
      </main>
        </div>
      </div>
      {/* Settings Modals */}
      {showSettings === 'shortcuts' && (
        <ShortcutSettings onClose={() => setShowSettings(null)} />
      )}
      {showSettings === 'api' && (
        <ApiSettings onClose={() => setShowSettings(null)} />
      )}
      {showSettings === 'test' && (
        <WhisperTest onClose={() => setShowSettings(null)} />
      )}
    </div>
  );
};

export default App; 