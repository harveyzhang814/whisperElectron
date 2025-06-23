/**
 * Configuration Module Tests
 * 
 * This file contains tests for the configuration management module.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ConfigManager } from '../src/main/config';
import { validateConfig } from '../src/main/config/validation';
import { ConfigStorage } from '../src/main/config/storage';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-user-data')
  }
}));

describe('Configuration Module', () => {
  let configManager: ConfigManager;
  let testConfigPath: string;

  beforeEach(() => {
    // Create test directory
    testConfigPath = path.join('/tmp/test-user-data', 'config.json');
    const testDir = path.dirname(testConfigPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Reset singleton instance
    (ConfigManager as any).instance = null;
    configManager = ConfigManager.getInstance();
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath);
      }
      const backupDir = path.join('/tmp/test-user-data', 'config-backups');
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('ConfigManager', () => {
    it('should be a singleton', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default config', async () => {
      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config).toHaveProperty('whisper');
      expect(config.whisper.baseUrl).toBe('http://localhost:8000');
      expect(config.whisper.defaultModel).toBe('base');
      expect(config.whisper.timeout).toBe(30000);
      expect(config.whisper.retryAttempts).toBe(3);
    });

    it('should load saved configuration', async () => {
      const testConfig = {
        whisper: {
          baseUrl: 'http://test-server:9000',
          defaultModel: 'small',
          timeout: 60000,
          retryAttempts: 5,
          language: 'en',
          outputFormat: 'json' as const,
          enableHealthCheck: false,
          healthCheckInterval: 120000
        }
      };

      // Save test config
      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

      await configManager.initialize();
      const config = configManager.getConfig();
      
      expect(config.whisper.baseUrl).toBe('http://test-server:9000');
      expect(config.whisper.defaultModel).toBe('small');
      expect(config.whisper.timeout).toBe(60000);
    });

    it('should update configuration', async () => {
      await configManager.initialize();
      
      const updateResult = await configManager.updateConfig({
        whisper: {
          baseUrl: 'http://new-server:8000',
          defaultModel: 'medium',
          timeout: 45000,
          retryAttempts: 3,
          language: 'zh-CN',
          outputFormat: 'json',
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      });

      expect(updateResult.isValid).toBe(true);
      
      const config = configManager.getConfig();
      expect(config.whisper.baseUrl).toBe('http://new-server:8000');
      expect(config.whisper.defaultModel).toBe('medium');
    });

    it('should validate configuration updates', async () => {
      await configManager.initialize();
      
      const updateResult = await configManager.updateConfig({
        whisper: {
          baseUrl: 'invalid-url',
          defaultModel: 'invalid-model',
          timeout: -1000,
          retryAttempts: 15,
          language: 'invalid-language',
          outputFormat: 'json',
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      });

      expect(updateResult.isValid).toBe(false);
      expect(updateResult.errors).toBeDefined();
      expect(updateResult.errors!.length).toBeGreaterThan(0);
    });

    it('should emit config change events', async () => {
      await configManager.initialize();
      
      const changeEvents: any[] = [];
      configManager.on('configChanged', (event) => {
        changeEvents.push(event);
      });

      await configManager.updateConfig({
        whisper: {
          baseUrl: 'http://event-test:8000',
          defaultModel: 'base',
          timeout: 30000,
          retryAttempts: 3,
          language: '',
          outputFormat: 'json',
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      });

      expect(changeEvents).toHaveLength(1);
      expect(changeEvents[0].changes).toContain('whisper');
    });

    it('should reset configuration to defaults', async () => {
      await configManager.initialize();
      
      // Update config first
      await configManager.updateConfig({
        whisper: {
          baseUrl: 'http://test-server:8000',
          defaultModel: 'large',
          timeout: 60000,
          retryAttempts: 5,
          language: 'en',
          outputFormat: 'json',
          enableHealthCheck: false,
          healthCheckInterval: 120000
        }
      });

      // Reset to defaults
      await configManager.resetConfig();
      
      const config = configManager.getConfig();
      expect(config.whisper.baseUrl).toBe('http://localhost:8000');
      expect(config.whisper.defaultModel).toBe('base');
      expect(config.whisper.timeout).toBe(30000);
    });

    it('should export and import configuration', async () => {
      await configManager.initialize();
      
      const exportedConfig = configManager.exportConfig();
      const parsedConfig = JSON.parse(exportedConfig);
      
      expect(parsedConfig).toHaveProperty('whisper');
      expect(parsedConfig.whisper.baseUrl).toBe('http://localhost:8000');

      // Test import
      const importResult = await configManager.importConfig(exportedConfig);
      expect(importResult.isValid).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        whisper: {
          baseUrl: 'http://localhost:8000',
          defaultModel: 'base',
          timeout: 30000,
          retryAttempts: 3,
          language: '',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      const result = validateConfig(validConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid base URL', () => {
      const invalidConfig = {
        whisper: {
          baseUrl: 'invalid-url',
          defaultModel: 'base',
          timeout: 30000,
          retryAttempts: 3,
          language: '',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      const result = validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('whisper.baseUrl: API 地址格式不正确，必须以 http:// 或 https:// 开头');
    });

    it('should reject invalid model', () => {
      const invalidConfig = {
        whisper: {
          baseUrl: 'http://localhost:8000',
          defaultModel: 'invalid-model',
          timeout: 30000,
          retryAttempts: 3,
          language: '',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      const result = validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('whisper.defaultModel: 请选择有效的模型：tiny, base, small, medium, large');
    });

    it('should reject invalid timeout', () => {
      const invalidConfig = {
        whisper: {
          baseUrl: 'http://localhost:8000',
          defaultModel: 'base',
          timeout: 1000, // Too low
          retryAttempts: 3,
          language: '',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      const result = validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('whisper.timeout: 超时时间应在 5-300 秒之间');
    });

    it('should provide warnings for configuration consistency', () => {
      const configWithWarnings = {
        whisper: {
          baseUrl: 'http://localhost:8000',
          defaultModel: 'base',
          timeout: 30000,
          retryAttempts: 8, // High retry count
          language: 'xx', // Uncommon language
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      const result = validateConfig(configWithWarnings);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Storage', () => {
    it('should save and load configuration', async () => {
      const storage = new ConfigStorage(testConfigPath);
      const testConfig = {
        whisper: {
          baseUrl: 'http://storage-test:8000',
          defaultModel: 'small',
          timeout: 45000,
          retryAttempts: 4,
          language: 'en',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 90000
        }
      };

      await storage.saveConfig(testConfig);
      
      const loadedConfig = await storage.loadConfig();
      expect(loadedConfig).toEqual(testConfig);
    });

    it('should create backups', async () => {
      const storage = new ConfigStorage(testConfigPath);
      const testConfig = {
        whisper: {
          baseUrl: 'http://backup-test:8000',
          defaultModel: 'base',
          timeout: 30000,
          retryAttempts: 3,
          language: '',
          outputFormat: 'json' as const,
          enableHealthCheck: true,
          healthCheckInterval: 60000
        }
      };

      await storage.saveConfig(testConfig);
      const backupPath = await storage.backup();
      
      expect(fs.existsSync(backupPath)).toBe(true);
      
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      expect(backupData.config).toEqual(testConfig);
      expect(backupData.version).toBe('1.0.0');
    });

    it('should restore from backup', async () => {
      const storage = new ConfigStorage(testConfigPath);
      const testConfig = {
        whisper: {
          baseUrl: 'http://restore-test:8000',
          defaultModel: 'medium',
          timeout: 60000,
          retryAttempts: 5,
          language: 'zh-CN',
          outputFormat: 'json' as const,
          enableHealthCheck: false,
          healthCheckInterval: 120000
        }
      };

      await storage.saveConfig(testConfig);
      const backupPath = await storage.backup();
      
      // Delete original config
      await storage.delete();
      
      // Restore from backup
      await storage.restore(backupPath);
      
      const restoredConfig = await storage.loadConfig();
      expect(restoredConfig).toEqual(testConfig);
    });

    it('should handle missing configuration file', async () => {
      const storage = new ConfigStorage(testConfigPath);
      const config = await storage.loadConfig();
      expect(config).toBeNull();
    });

    it('should validate configuration structure', async () => {
      const storage = new ConfigStorage(testConfigPath);
      
      // Save invalid config
      const invalidConfig = { invalid: 'config' };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      
      const config = await storage.loadConfig();
      expect(config).toBeNull();
    });
  });
}); 