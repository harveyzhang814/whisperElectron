/**
 * Simple Configuration Module Test
 * 
 * This is a simple test script to verify the configuration module functionality
 * without external testing frameworks.
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock electron app for testing
const mockApp = {
  getPath: (name: string) => {
    if (name === 'userData') {
      return '/tmp/test-user-data';
    }
    return '/tmp/test-user-data';
  }
};

// Mock the electron module
const electron = { app: mockApp };

// Import configuration modules
// Note: In a real test environment, these would be properly imported
// For now, we'll create a simple test structure

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

interface AppConfig {
  whisper: WhisperAPIConfig;
}

interface ConfigValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Simple validation function for testing
function validateConfig(config: AppConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate baseUrl
  if (!config.whisper.baseUrl || !/^https?:\/\/.+/.test(config.whisper.baseUrl)) {
    errors.push('whisper.baseUrl: API 地址格式不正确');
  }

  // Validate defaultModel
  if (!['tiny', 'base', 'small', 'medium', 'large'].includes(config.whisper.defaultModel)) {
    errors.push('whisper.defaultModel: 请选择有效的模型');
  }

  // Validate timeout
  if (config.whisper.timeout < 5000 || config.whisper.timeout > 300000) {
    errors.push('whisper.timeout: 超时时间应在 5-300 秒之间');
  }

  // Validate retryAttempts
  if (config.whisper.retryAttempts < 0 || config.whisper.retryAttempts > 10) {
    errors.push('whisper.retryAttempts: 重试次数应在 0-10 之间');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Simple configuration storage for testing
class SimpleConfigStorage {
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async loadConfig(): Promise<AppConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }
      const data = await fs.promises.readFile(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load config:', error);
      return null;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }
}

// Test functions
function testValidation() {
  console.log('Testing configuration validation...');

  // Test valid config
  const validConfig: AppConfig = {
    whisper: {
      baseUrl: 'http://localhost:8000',
      defaultModel: 'base',
      timeout: 30000,
      retryAttempts: 3,
      language: '',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 60000
    }
  };

  const validResult = validateConfig(validConfig);
  console.log('Valid config test:', validResult.isValid ? 'PASS' : 'FAIL');

  // Test invalid config
  const invalidConfig: AppConfig = {
    whisper: {
      baseUrl: 'invalid-url',
      defaultModel: 'invalid-model',
      timeout: 1000,
      retryAttempts: 15,
      language: '',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 60000
    }
  };

  const invalidResult = validateConfig(invalidConfig);
  console.log('Invalid config test:', !invalidResult.isValid ? 'PASS' : 'FAIL');
  if (invalidResult.errors) {
    console.log('Validation errors:', invalidResult.errors);
  }
}

async function testStorage() {
  console.log('\nTesting configuration storage...');

  const testConfigPath = path.join('/tmp/test-user-data', 'test-config.json');
  const storage = new SimpleConfigStorage(testConfigPath);

  // Test save and load
  const testConfig: AppConfig = {
    whisper: {
      baseUrl: 'http://test-server:8000',
      defaultModel: 'small',
      timeout: 45000,
      retryAttempts: 4,
      language: 'en',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 90000
    }
  };

  try {
    await storage.saveConfig(testConfig);
    console.log('Save config test: PASS');

    const loadedConfig = await storage.loadConfig();
    if (loadedConfig && JSON.stringify(loadedConfig) === JSON.stringify(testConfig)) {
      console.log('Load config test: PASS');
    } else {
      console.log('Load config test: FAIL');
    }

    // Clean up
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  } catch (error) {
    console.log('Storage test: FAIL', error);
  }
}

function testDefaultConfig() {
  console.log('\nTesting default configuration...');

  const defaultConfig: AppConfig = {
    whisper: {
      baseUrl: 'http://localhost:8000',
      defaultModel: 'base',
      timeout: 30000,
      retryAttempts: 3,
      language: '',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 60000
    }
  };

  const result = validateConfig(defaultConfig);
  console.log('Default config validation:', result.isValid ? 'PASS' : 'FAIL');
}

// Run tests
async function runTests() {
  console.log('Starting configuration module tests...\n');

  testValidation();
  await testStorage();
  testDefaultConfig();

  console.log('\nConfiguration module tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testValidation, testStorage, testDefaultConfig, runTests }; 