import React, { useEffect, useState } from 'react';
import './ApiSettings.css';

interface WhisperAPIConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
  retryAttempts: number;
  language: string;
  outputFormat: 'text' | 'json' | 'json_metadata';
  enableHealthCheck: boolean;
  healthCheckInterval: number;
}

interface ApiSettingsProps {
  onClose: () => void;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({ onClose }) => {
  const [config, setConfig] = useState<WhisperAPIConfig>({
    baseUrl: 'http://localhost:8000',
    defaultModel: 'base',
    timeout: 30000,
    retryAttempts: 3,
    language: '',
    outputFormat: 'json',
    enableHealthCheck: true,
    healthCheckInterval: 60000
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const currentConfig = await window.electron.getWhisperConfig();
      if (currentConfig) {
        setConfig(currentConfig);
      }
    } catch (error) {
      setErrors(['Failed to load configuration']);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setIsLoading(true);
      setErrors([]);
      setWarnings([]);
      const result = await window.electron.updateWhisperConfig(config);
      if (result.isValid) {
        if (result.warnings) setWarnings(result.warnings);
        setTestStatus('success');
        setTestMessage('Configuration saved successfully');
        setTimeout(() => setTestStatus('idle'), 2000);
      } else {
        setErrors(result.errors || ['Unknown validation error']);
      }
    } catch (error) {
      setErrors(['Failed to save configuration']);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestStatus('testing');
      setTestMessage('Testing connection...');
      const result = await window.electron.testWhisperConnection();
      if (result.success) {
        setTestStatus('success');
        setTestMessage(`Connection successful! Available models: ${result.models?.join(', ') || 'None'}`);
      } else {
        setTestStatus('error');
        setTestMessage(result.error || 'Connection failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Connection test failed');
    }
  };

  const resetToDefaults = () => {
    setConfig({
      baseUrl: 'http://localhost:8000',
      defaultModel: 'base',
      timeout: 30000,
      retryAttempts: 3,
      language: '',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 60000
    });
  };

  const handleInputChange = (field: keyof WhisperAPIConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="api-settings">
      <div className="api-settings-header">
        <h2>Whisper API 配置</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="api-settings-content">
        <div className="settings-section">
          <h3>连接设置</h3>
          <div className="form-group">
            <label>API 服务地址</label>
            <input type="url" value={config.baseUrl} onChange={e => handleInputChange('baseUrl', e.target.value)} />
          </div>
          <div className="form-group">
            <label>请求超时时间 (毫秒)</label>
            <input type="number" value={config.timeout} onChange={e => handleInputChange('timeout', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label>重试次数</label>
            <input type="number" value={config.retryAttempts} onChange={e => handleInputChange('retryAttempts', parseInt(e.target.value))} />
          </div>
          <button onClick={testConnection} disabled={testStatus === 'testing'}>
            {testStatus === 'testing' ? '测试中...' : '测试连接'}
          </button>
          {testStatus !== 'idle' && <div>{testMessage}</div>}
        </div>
        <div className="settings-section">
          <h3>模型设置</h3>
          <div className="form-group">
            <label>默认模型</label>
            <select value={config.defaultModel} onChange={e => handleInputChange('defaultModel', e.target.value)}>
              <option value="tiny">Tiny</option>
              <option value="base">Base</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div className="form-group">
            <label>默认语言</label>
            <input type="text" value={config.language} onChange={e => handleInputChange('language', e.target.value)} placeholder="留空为自动检测" />
          </div>
          <div className="form-group">
            <label>输出格式</label>
            <select value={config.outputFormat} onChange={e => handleInputChange('outputFormat', e.target.value)}>
              <option value="text">纯文本</option>
              <option value="json">JSON</option>
              <option value="json_metadata">JSON (含元数据)</option>
            </select>
          </div>
        </div>
        <div className="settings-section">
          <h3>高级设置</h3>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={config.enableHealthCheck} onChange={e => handleInputChange('enableHealthCheck', e.target.checked)} />
              启用健康检查
            </label>
          </div>
          {config.enableHealthCheck && (
            <div className="form-group">
              <label>健康检查间隔 (毫秒)</label>
              <input type="number" value={config.healthCheckInterval} onChange={e => handleInputChange('healthCheckInterval', parseInt(e.target.value))} />
            </div>
          )}
        </div>
        {errors.length > 0 && <div className="error-messages">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
        {warnings.length > 0 && <div className="warning-messages">{warnings.map((w, i) => <div key={i}>{w}</div>)}</div>}
        <div className="settings-actions">
          <button onClick={resetToDefaults} disabled={isLoading}>重置为默认值</button>
          <button onClick={onClose} disabled={isLoading}>取消</button>
          <button onClick={saveConfig} disabled={isLoading}>保存配置</button>
        </div>
      </div>
    </div>
  );
}; 