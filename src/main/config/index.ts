/**
 * Configuration Management Module
 * 
 * This module provides centralized configuration management for the WhisperElectron application.
 * It handles configuration loading, saving, validation, and change notifications.
 */

import { app } from 'electron';
import * as path from 'path';
import { EventEmitter } from 'events';
import { AppConfig, ConfigValidationResult, ConfigChangeEvent } from './types';
import { validateConfig } from './validation';
import { ConfigStorage } from './storage';

export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private config: AppConfig;
  private storage: ConfigStorage;
  private configPath: string;
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.storage = new ConfigStorage(this.configPath);
    this.config = this.getDefaultConfig();
  }

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize the configuration manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration from storage
      const savedConfig = await this.storage.loadConfig();
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }

      // Validate loaded configuration
      const validation = validateConfig(this.config);
      if (!validation.isValid) {
        console.warn('Configuration validation failed:', validation.errors);
        // Use default config for invalid configurations
        this.config = this.getDefaultConfig();
      }

      this.isInitialized = true;
      console.log('Configuration manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize configuration manager:', error);
      // Use default config on initialization failure
      this.config = this.getDefaultConfig();
      this.isInitialized = true;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  public getConfigSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.config[section];
  }

  /**
   * Update configuration
   */
  public async updateConfig(updates: Partial<AppConfig>): Promise<ConfigValidationResult> {
    const newConfig = { ...this.config, ...updates };
    const validation = validateConfig(newConfig);

    if (!validation.isValid) {
      return validation;
    }

    const oldConfig = { ...this.config };
    this.config = newConfig;

    try {
      // Save configuration to storage
      await this.storage.saveConfig(this.config);

      // Emit configuration change event
      this.emit('configChanged', {
        oldConfig,
        newConfig: this.config,
        changes: Object.keys(updates) as (keyof AppConfig)[]
      } as ConfigChangeEvent);

      return { isValid: true };
    } catch (error) {
      // Revert changes on save failure
      this.config = oldConfig;
      console.error('Failed to save configuration:', error);
      return {
        isValid: false,
        errors: ['Failed to save configuration']
      };
    }
  }

  /**
   * Update specific configuration section
   */
  public async updateConfigSection<K extends keyof AppConfig>(
    section: K,
    value: AppConfig[K]
  ): Promise<ConfigValidationResult> {
    return this.updateConfig({ [section]: value } as Partial<AppConfig>);
  }

  /**
   * Reset configuration to defaults
   */
  public async resetConfig(): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = this.getDefaultConfig();

    try {
      await this.storage.saveConfig(this.config);

      this.emit('configChanged', {
        oldConfig,
        newConfig: this.config,
        changes: Object.keys(this.config) as (keyof AppConfig)[]
      } as ConfigChangeEvent);
    } catch (error) {
      // Revert on save failure
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * Validate current configuration
   */
  public validateConfig(): ConfigValidationResult {
    return validateConfig(this.config);
  }

  /**
   * Export configuration
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  public async importConfig(configJson: string): Promise<ConfigValidationResult> {
    try {
      const importedConfig = JSON.parse(configJson) as AppConfig;
      const validation = validateConfig(importedConfig);

      if (!validation.isValid) {
        return validation;
      }

      return await this.updateConfig(importedConfig);
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid configuration format']
      };
    }
  }

  /**
   * Get configuration file path
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if configuration manager is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get default configuration
   */
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
      },
      transcription: {
        defaultModel: 'base',
        defaultLanguage: '',
        maxConcurrentTranscriptions: 3,
        autoTranscribeRecordings: false,
        outputDirectory: path.join(app.getPath('userData'), 'transcriptions'),
        defaultOutputFormat: 'txt',
        defaultTemperature: 0.0,
        enableCaching: true,
        cacheDirectory: path.join(app.getPath('userData'), 'transcription-cache'),
        maxCacheSize: 100,
        enableAutoCleanup: true,
        retentionPeriod: 30
      }
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance(); 