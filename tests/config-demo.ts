/**
 * Configuration Module Demo
 * 
 * This script demonstrates the functionality of the configuration management module.
 */

// Note: This demo requires the TypeScript files to be compiled first
// For now, we'll create a simple demo without importing the actual module

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

// Simple mock ConfigManager for demo
class MockConfigManager {
  private config: AppConfig;
  private listeners: Array<(event: any) => void> = [];

  constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): MockConfigManager {
    if (!(MockConfigManager as any).instance) {
      (MockConfigManager as any).instance = new MockConfigManager();
    }
    return (MockConfigManager as any).instance;
  }

  async initialize(): Promise<void> {
    console.log('Mock ConfigManager initialized');
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  validateConfig(): ConfigValidationResult {
    const errors: string[] = [];
    
    if (!this.config.whisper.baseUrl || !/^https?:\/\/.+/.test(this.config.whisper.baseUrl)) {
      errors.push('whisper.baseUrl: API 地址格式不正确');
    }

    if (!['tiny', 'base', 'small', 'medium', 'large'].includes(this.config.whisper.defaultModel)) {
      errors.push('whisper.defaultModel: 请选择有效的模型');
    }

    if (this.config.whisper.timeout < 5000 || this.config.whisper.timeout > 300000) {
      errors.push('whisper.timeout: 超时时间应在 5-300 秒之间');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<ConfigValidationResult> {
    const newConfig = { ...this.config, ...updates };
    const validation = this.validateConfig();

    if (!validation.isValid) {
      return validation;
    }

    const oldConfig = { ...this.config };
    this.config = newConfig;

    // Emit change event
    this.listeners.forEach(listener => {
      listener({
        oldConfig,
        newConfig: this.config,
        changes: Object.keys(updates)
      });
    });

    return { isValid: true };
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfig(configJson: string): Promise<ConfigValidationResult> {
    try {
      const importedConfig = JSON.parse(configJson) as AppConfig;
      if (!importedConfig.whisper) {
        return {
          isValid: false,
          errors: ['Invalid configuration format']
        };
      }
      return await this.updateConfig(importedConfig);
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid configuration format']
      };
    }
  }

  async resetConfig(): Promise<void> {
    this.config = this.getDefaultConfig();
  }

  on(event: string, listener: (event: any) => void): void {
    if (event === 'configChanged') {
      this.listeners.push(listener);
    }
  }

  getConfigPath(): string {
    return '/tmp/demo-config.json';
  }

  isReady(): boolean {
    return true;
  }

  private getDefaultConfig(): AppConfig {
    return {
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
  }
}

async function demoConfigManager() {
  console.log('=== Configuration Module Demo ===\n');

  // Get singleton instance
  const configManager = MockConfigManager.getInstance();
  console.log('✓ ConfigManager singleton instance created');

  // Initialize the configuration manager
  await configManager.initialize();
  console.log('✓ Configuration manager initialized');

  // Get default configuration
  const defaultConfig = configManager.getConfig();
  console.log('\n📋 Default Configuration:');
  console.log(JSON.stringify(defaultConfig, null, 2));

  // Test configuration validation
  console.log('\n🔍 Testing Configuration Validation:');
  const validation = configManager.validateConfig();
  console.log('Validation result:', validation.isValid ? '✓ Valid' : '✗ Invalid');
  if (validation.warnings) {
    console.log('Warnings:', validation.warnings);
  }

  // Update configuration
  console.log('\n🔄 Updating Configuration:');
  const updateResult = await configManager.updateConfig({
    whisper: {
      baseUrl: 'http://demo-server:8000',
      defaultModel: 'medium',
      timeout: 45000,
      retryAttempts: 5,
      language: 'zh-CN',
      outputFormat: 'json',
      enableHealthCheck: true,
      healthCheckInterval: 90000
    }
  });

  if (updateResult.isValid) {
    console.log('✓ Configuration updated successfully');
    const updatedConfig = configManager.getConfig();
    console.log('Updated config:', JSON.stringify(updatedConfig, null, 2));
  } else {
    console.log('✗ Configuration update failed:', updateResult.errors);
  }

  // Test configuration export/import
  console.log('\n📤 Testing Configuration Export/Import:');
  const exportedConfig = configManager.exportConfig();
  console.log('Exported configuration length:', exportedConfig.length, 'characters');

  // Test invalid configuration import
  console.log('\n🚫 Testing Invalid Configuration Import:');
  const invalidImportResult = await configManager.importConfig('{"invalid": "config"}');
  console.log('Invalid import result:', invalidImportResult.isValid ? '✓ Valid' : '✗ Invalid');
  if (invalidImportResult.errors) {
    console.log('Import errors:', invalidImportResult.errors);
  }

  // Test valid configuration import
  console.log('\n✅ Testing Valid Configuration Import:');
  const validImportResult = await configManager.importConfig(exportedConfig);
  console.log('Valid import result:', validImportResult.isValid ? '✓ Valid' : '✗ Invalid');

  // Test configuration reset
  console.log('\n🔄 Testing Configuration Reset:');
  await configManager.resetConfig();
  const resetConfig = configManager.getConfig();
  console.log('Reset config:', JSON.stringify(resetConfig, null, 2));

  // Test configuration change events
  console.log('\n📡 Testing Configuration Change Events:');
  configManager.on('configChanged', (event) => {
    console.log('✓ Configuration change event received');
    console.log('Changed sections:', event.changes);
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

  // Get configuration path
  console.log('\n📁 Configuration File Path:');
  console.log('Config path:', configManager.getConfigPath());

  // Check if ready
  console.log('\n✅ Configuration Manager Status:');
  console.log('Is ready:', configManager.isReady());

  console.log('\n=== Demo Completed ===');
  console.log('\nNote: This is a mock demo. The actual configuration module');
  console.log('provides more features including file persistence, backup,');
  console.log('and advanced validation.');
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoConfigManager().catch(console.error);
}

export { demoConfigManager }; 