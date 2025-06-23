import React, { useState } from 'react';
import './Modal.css';

interface WhisperTestProps {
  onClose: () => void;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
}

export const WhisperTest: React.FC<WhisperTestProps> = ({ onClose }) => {
  const [results, setResults] = useState<Record<string, TestResult>>({
    health: { status: 'idle', message: '' },
    models: { status: 'idle', message: '' },
    connection: { status: 'idle', message: '' },
    tasks: { status: 'idle', message: '' }
  });

  const updateResult = (key: string, status: TestResult['status'], message: string) => {
    setResults(prev => ({
      ...prev,
      [key]: { status, message }
    }));
  };

  const testHealth = async () => {
    try {
      updateResult('health', 'testing', 'Checking health...');
      const result = await window.electron.whisperCheckHealth();
      if (result.success) {
        updateResult('health', 'success', 'Health check passed');
      } else {
        updateResult('health', 'error', result.error || 'Health check failed');
      }
    } catch (error) {
      updateResult('health', 'error', 'Health check failed');
    }
  };

  const testModels = async () => {
    try {
      updateResult('models', 'testing', 'Fetching models...');
      const result = await window.electron.whisperGetModels();
      if (result.success) {
        const models = result.models?.map(m => m.name).join(', ') || 'None';
        updateResult('models', 'success', `Available models: ${models}`);
      } else {
        updateResult('models', 'error', result.error || 'Failed to fetch models');
      }
    } catch (error) {
      updateResult('models', 'error', 'Failed to fetch models');
    }
  };

  const testConnection = async () => {
    try {
      updateResult('connection', 'testing', 'Testing connection...');
      const result = await window.electron.whisperTestConnection();
      if (result.success) {
        updateResult('connection', 'success', 'Connection successful');
      } else {
        updateResult('connection', 'error', result.error || 'Connection failed');
      }
    } catch (error) {
      updateResult('connection', 'error', 'Connection test failed');
    }
  };

  const testTasks = async () => {
    try {
      updateResult('tasks', 'testing', 'Fetching tasks...');
      const result = await window.electron.whisperGetAllTasks();
      if (result.success) {
        const taskCount = result.tasks?.length || 0;
        updateResult('tasks', 'success', `Found ${taskCount} tasks`);
      } else {
        updateResult('tasks', 'error', result.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      updateResult('tasks', 'error', 'Failed to fetch tasks');
    }
  };

  return (
    <div className="modal-container">
      <div className="modal-header">
        <h2>Whisper API 测试</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="modal-content">
        <div className="settings-section">
          <h3>API 健康检查</h3>
          <button 
            className="btn" 
            onClick={testHealth} 
            disabled={results.health.status === 'testing'}
          >
            {results.health.status === 'testing' ? '检查中...' : '检查健康状态'}
          </button>
          {results.health.status !== 'idle' && (
            <div className={`message ${results.health.status === 'success' ? 'message-success' : 'message-error'}`}>
              {results.health.message}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>可用模型</h3>
          <button 
            className="btn" 
            onClick={testModels} 
            disabled={results.models.status === 'testing'}
          >
            {results.models.status === 'testing' ? '获取中...' : '获取可用模型'}
          </button>
          {results.models.status !== 'idle' && (
            <div className={`message ${results.models.status === 'success' ? 'message-success' : 'message-error'}`}>
              {results.models.message}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>连接测试</h3>
          <button 
            className="btn" 
            onClick={testConnection} 
            disabled={results.connection.status === 'testing'}
          >
            {results.connection.status === 'testing' ? '测试中...' : '测试连接'}
          </button>
          {results.connection.status !== 'idle' && (
            <div className={`message ${results.connection.status === 'success' ? 'message-success' : 'message-error'}`}>
              {results.connection.message}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>任务管理</h3>
          <button 
            className="btn" 
            onClick={testTasks} 
            disabled={results.tasks.status === 'testing'}
          >
            {results.tasks.status === 'testing' ? '获取中...' : '获取所有任务'}
          </button>
          {results.tasks.status !== 'idle' && (
            <div className={`message ${results.tasks.status === 'success' ? 'message-success' : 'message-error'}`}>
              {results.tasks.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 