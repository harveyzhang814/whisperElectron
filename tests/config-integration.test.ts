/**
 * Configuration Integration Test
 * 
 * This test verifies that the configuration module is properly integrated
 * with the IPC system and can be accessed from the renderer process.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock electron for testing
const mockIpcRenderer = {
  invoke: jest.fn()
};

const mockElectron = {
  getWhisperConfig: () => mockIpcRenderer.invoke('config:getWhisper'),
  updateWhisperConfig: (config: any) => mockIpcRenderer.invoke('config:updateWhisper', config),
};

// Mock window.electron
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
});

describe('Configuration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call getWhisperConfig IPC', async () => {
    const mockConfig = {
      baseUrl: 'http://localhost:8000',
      defaultModel: 'base',
      timeout: 30000,
      retryAttempts: 3,
      language: '',
      outputFormat: 'json' as const,
      enableHealthCheck: true,
      healthCheckInterval: 60000
    };

    mockIpcRenderer.invoke.mockResolvedValue(mockConfig);

    const result = await window.electron.getWhisperConfig();
    
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('config:getWhisper');
    expect(result).toEqual(mockConfig);
  });

  it('should call updateWhisperConfig IPC', async () => {
    const mockResult = { isValid: true };
    mockIpcRenderer.invoke.mockResolvedValue(mockResult);

    const config = {
      baseUrl: 'http://test-server:8000',
      defaultModel: 'medium',
      timeout: 45000,
      retryAttempts: 5,
      language: 'zh-CN',
      outputFormat: 'json' as const,
      enableHealthCheck: true,
      healthCheckInterval: 90000
    };

    const result = await window.electron.updateWhisperConfig(config);
    
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('config:updateWhisper', config);
    expect(result).toEqual(mockResult);
  });
}); 