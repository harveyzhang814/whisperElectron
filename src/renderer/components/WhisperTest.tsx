import React, { useState } from 'react';
import './Modal.css';
import { ElectronAPI } from '../types/electron';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

interface TestResults {
  models: { status: string; message: string };
  connection: { status: string; message: string };
  jobs: { status: string; message: string };
  health: { status: string; message: string };
}

interface WhisperTestProps {
  onClose: () => void;
}

export const WhisperTest: React.FC<WhisperTestProps> = ({ onClose }) => {
  const [results, setResults] = useState<TestResults>({
    models: { status: 'idle', message: '' },
    connection: { status: 'idle', message: '' },
    jobs: { status: 'idle', message: '' },
    health: { status: 'idle', message: '' }
  });

  const updateResult = (key: keyof TestResults, status: string, message: string) => {
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
        const modelNames = result.models?.map((m: { name: string }) => m.name).join(', ');
        updateResult('models', 'success', `Available models: ${modelNames}`);
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

  const testJobs = async () => {
    try {
      updateResult('jobs', 'testing', 'Fetching jobs...');
      const result = await window.electron.whisperGetAllJobs();
      if (result.success) {
        const jobCount = result.jobs?.length || 0;
        updateResult('jobs', 'success', `Found ${jobCount} jobs`);
      } else {
        updateResult('jobs', 'error', result.error || 'Failed to fetch jobs');
      }
    } catch (error) {
      updateResult('jobs', 'error', 'Failed to fetch jobs');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Whisper API 测试</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content-wrapper">
          <div className="modal-content">
          <div className="settings-section">
            <h3>健康检查</h3>
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
            <h3>模型列表</h3>
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
            <h3>作业管理</h3>
            <button 
              className="btn" 
              onClick={testJobs} 
              disabled={results.jobs.status === 'testing'}
            >
              {results.jobs.status === 'testing' ? '获取中...' : '获取所有作业'}
            </button>
            {results.jobs.status !== 'idle' && (
              <div className={`message ${results.jobs.status === 'success' ? 'message-success' : 'message-error'}`}>
                {results.jobs.message}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 