import React, { useState, useEffect } from 'react';
import { ShortcutSettings } from './components/ShortcutSettings';
import './App.css';

interface RecordingStatus {
  isRecording: boolean;
}

const App: React.FC = () => {
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
  });

  useEffect(() => {
    // Poll recording status every second
    const statusInterval = setInterval(async () => {
      const status = await window.electron.getRecordingStatus();
      setRecordingStatus(status);
    }, 1000);

    return () => clearInterval(statusInterval);
  }, []);

  const handleQuit = async () => {
    await window.electron.quitApp();
  };

  const handleStartRecording = async () => {
    try {
      const result = await window.electron.startRecording();
      if (result.success) {
        console.log('Recording started:', result.path);
      } else {
        console.error('Failed to start recording:', result.error);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await window.electron.stopRecording();
      if (result.success) {
        console.log('Recording stopped:', result.path);
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
      if (!result.success) {
        console.error('Failed to cancel recording:', result.error);
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
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
            <button 
              className="record-button"
              onClick={handleStartRecording}
            >
              Start Recording
            </button>
          ) : (
            <>
              <button 
                className="stop-button"
                onClick={handleStopRecording}
              >
                Stop Recording
              </button>
              <button 
                className="cancel-button"
                onClick={handleCancelRecording}
              >
                Cancel Recording
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
        <div className="status-indicator">{getStatusText()}</div>
      </header>

      {/* Task List */}
      <main className="task-list">
        <div className="task-list-header">
          <h2>Recent Recordings</h2>
        </div>
        <div className="task-items">
          {/* Task items will be rendered here */}
          <div className="empty-state">
            No recordings yet. Press the record button to start.
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-text">{getStatusText()}</div>
      </footer>

      {/* Shortcut Settings Modal */}
      {showShortcutSettings && (
        <ShortcutSettings onClose={() => setShowShortcutSettings(false)} />
      )}
    </div>
  );
};

export default App; 