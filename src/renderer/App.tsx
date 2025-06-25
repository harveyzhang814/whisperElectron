import React, { useState, useEffect } from 'react';
import { ShortcutSettings } from './components/ShortcutSettings';
import { ApiSettings } from './components/ApiSettings';
import { WhisperTest } from './components/WhisperTest';
import { TaskList } from './components/TaskList';
import { useTasks } from './hooks/useTasks';
import './App.css';

type SettingsType = 'shortcuts' | 'api' | 'test' | null;

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState<SettingsType>(null);
  const { tasks, createTask, loadTasks } = useTasks();
  const [currentTask, setCurrentTask] = useState<any>(null);

  useEffect(() => {
    // 只注册一次事件监听器，负责刷新 tasks
    window.electron.onTaskRefresh(loadTasks);
    return () => {
      window.electron.removeTaskRefreshListener();
    };
  }, [loadTasks]);

  useEffect(() => {
    // 每次 tasks 变化都刷新 currentTask
    console.log('[App] updateCurrent, tasks:', tasks.map(t => ({
      id: t.id,
      audioSourceState: t.stages?.AUDIO_SOURCE?.state
    })));
    const running = tasks.find(
      t => t.stages?.AUDIO_SOURCE?.state === 'IN_PROGRESS'
    );
    setCurrentTask(running || null);
    console.log('[App] setCurrentTask:', running);
  }, [tasks]);

  const handleQuit = async () => {
    await window.electron.quitApp();
  };

  // 新建并自动启动录音
  const handleStartRecording = async () => {
    try {
      console.log('🎯 [App] Starting recording process...');
      
      // 不传递任何参数，后端会自动生成默认值
      console.log('📝 [App] Creating task without parameters...');
      const task = await createTask();
      
      console.log('✅ [App] Task created:', {
        id: task?.id,
        name: task?.metadata?.name,
        state: task?.state,
        stages: task?.stages
      });
      
      if (task && task.id) {
        console.log('🚀 [App] Starting AUDIO_SOURCE stage for task:', task.id);
        await window.electron.startTaskStage(task.id, 'AUDIO_SOURCE');
        console.log('✅ [App] AUDIO_SOURCE stage started successfully');
        
        console.log('🔄 [App] Reloading tasks...');
        await loadTasks();
        console.log('✅ [App] Tasks reloaded');
      } else {
        console.error('❌ [App] Failed to create task or task has no ID');
      }
    } catch (error) {
      console.error('❌ [App] Error starting unified recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (currentTask && currentTask.id) {
        await window.electron.stopTaskStage(currentTask.id, 'AUDIO_SOURCE');
        await loadTasks();
      }
    } catch (error) {
      console.error('Error stopping unified recording:', error);
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (currentTask && currentTask.id) {
        await window.electron.cancelTaskStage(currentTask.id, 'AUDIO_SOURCE');
        await loadTasks();
      }
    } catch (error) {
      console.error('Error canceling unified recording:', error);
    }
  };

  const getStatusText = () => {
    if (currentTask) {
      const audioSourceStage = currentTask.stages?.AUDIO_SOURCE;
      if (audioSourceStage?.state === 'IN_PROGRESS') {
        return 'Recording...';
      }
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
          {!currentTask || currentTask.stages?.AUDIO_SOURCE?.state !== 'IN_PROGRESS' ? (
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