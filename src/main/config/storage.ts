/**
 * Configuration Storage Module
 * 
 * This module handles configuration persistence, backup, and restoration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, ConfigExport } from './types';

export class ConfigStorage {
  private configPath: string;
  private backupDir: string;
  private readonly CONFIG_VERSION = '1.0.0';

  constructor(configPath: string) {
    this.configPath = configPath;
    this.backupDir = path.join(path.dirname(configPath), 'config-backups');
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Load configuration from storage
   */
  public async loadConfig(): Promise<AppConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.log('Configuration file does not exist, using defaults');
        return null;
      }

      const configData = await fs.promises.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData) as AppConfig;

      // Validate configuration structure
      if (!this.validateConfigStructure(config)) {
        console.warn('Configuration structure is invalid, using defaults');
        return null;
      }

      console.log('Configuration loaded successfully');
      return config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  /**
   * Save configuration to storage
   */
  public async saveConfig(config: AppConfig): Promise<void> {
    try {
      // Create backup before saving
      await this.createBackup();

      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Save configuration
      const configData = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(this.configPath, configData, 'utf8');

      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Check if configuration exists
   */
  public async exists(): Promise<boolean> {
    try {
      return fs.existsSync(this.configPath);
    } catch (error) {
      console.error('Failed to check configuration existence:', error);
      return false;
    }
  }

  /**
   * Delete configuration
   */
  public async delete(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        await fs.promises.unlink(this.configPath);
        console.log('Configuration deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      throw error;
    }
  }

  /**
   * Create backup of current configuration
   */
  public async backup(): Promise<string> {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error('No configuration file to backup');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `config-backup-${timestamp}.json`);

      // Read current config
      const configData = await fs.promises.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData) as AppConfig;

      // Create backup with metadata
      const backup: ConfigExport = {
        version: this.CONFIG_VERSION,
        timestamp: new Date().toISOString(),
        config,
        metadata: {
          appVersion: process.env.npm_package_version || 'unknown',
          description: 'Configuration backup',
          tags: ['backup', 'auto']
        }
      };

      // Save backup
      const backupData = JSON.stringify(backup, null, 2);
      await fs.promises.writeFile(backupPath, backupData, 'utf8');

      console.log(`Configuration backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore configuration from backup
   */
  public async restore(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file does not exist');
      }

      // Read backup file
      const backupData = await fs.promises.readFile(backupPath, 'utf8');
      const backup = JSON.parse(backupData) as ConfigExport;

      // Validate backup structure
      if (!backup.config || !backup.version) {
        throw new Error('Invalid backup format');
      }

      // Check version compatibility
      if (backup.version !== this.CONFIG_VERSION) {
        console.warn(`Backup version ${backup.version} differs from current version ${this.CONFIG_VERSION}`);
      }

      // Validate configuration structure
      if (!this.validateConfigStructure(backup.config)) {
        throw new Error('Backup configuration structure is invalid');
      }

      // Save restored configuration
      await this.saveConfig(backup.config);

      console.log('Configuration restored successfully');
    } catch (error) {
      console.error('Failed to restore configuration:', error);
      throw error;
    }
  }

  /**
   * Get list of available backups
   */
  public async getBackups(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = await fs.promises.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
        .map(file => path.join(this.backupDir, file))
        .sort((a, b) => {
          // Sort by modification time, newest first
          const statA = fs.statSync(a);
          const statB = fs.statSync(b);
          return statB.mtime.getTime() - statA.mtime.getTime();
        });

      return backupFiles;
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Clean old backups (keep only the latest N backups)
   */
  public async cleanOldBackups(keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.getBackups();
      
      if (backups.length <= keepCount) {
        return;
      }

      const backupsToDelete = backups.slice(keepCount);
      
      for (const backupPath of backupsToDelete) {
        try {
          await fs.promises.unlink(backupPath);
          console.log(`Deleted old backup: ${backupPath}`);
        } catch (error) {
          console.error(`Failed to delete backup ${backupPath}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  /**
   * Export configuration with metadata
   */
  public async exportConfig(config: AppConfig, description?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportPath = path.join(this.backupDir, `config-export-${timestamp}.json`);

      const exportData: ConfigExport = {
        version: this.CONFIG_VERSION,
        timestamp: new Date().toISOString(),
        config,
        metadata: {
          appVersion: process.env.npm_package_version || 'unknown',
          description: description || 'Configuration export',
          tags: ['export', 'manual']
        }
      };

      const exportJson = JSON.stringify(exportData, null, 2);
      await fs.promises.writeFile(exportPath, exportJson, 'utf8');

      console.log(`Configuration exported to: ${exportPath}`);
      return exportPath;
    } catch (error) {
      console.error('Failed to export configuration:', error);
      throw error;
    }
  }

  /**
   * Import configuration from export file
   */
  public async importConfig(exportPath: string): Promise<AppConfig> {
    try {
      if (!fs.existsSync(exportPath)) {
        throw new Error('Export file does not exist');
      }

      const exportData = await fs.promises.readFile(exportPath, 'utf8');
      const exportConfig = JSON.parse(exportData) as ConfigExport;

      if (!exportConfig.config || !exportConfig.version) {
        throw new Error('Invalid export format');
      }

      if (!this.validateConfigStructure(exportConfig.config)) {
        throw new Error('Export configuration structure is invalid');
      }

      return exportConfig.config;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  public async getStats(): Promise<{
    size: number;
    lastModified: string;
    backupCount: number;
    configPath: string;
  }> {
    try {
      const stats = {
        size: 0,
        lastModified: '',
        backupCount: 0,
        configPath: this.configPath
      };

      if (fs.existsSync(this.configPath)) {
        const fileStats = fs.statSync(this.configPath);
        stats.size = fileStats.size;
        stats.lastModified = fileStats.mtime.toISOString();
      }

      const backups = await this.getBackups();
      stats.backupCount = backups.length;

      return stats;
    } catch (error) {
      console.error('Failed to get configuration stats:', error);
      throw error;
    }
  }

  /**
   * Create automatic backup before saving
   */
  private async createBackup(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        await this.backup();
      }
    } catch (error) {
      console.warn('Failed to create automatic backup:', error);
      // Don't throw error for automatic backup failure
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfigStructure(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    if (!config.whisper || typeof config.whisper !== 'object') {
      return false;
    }

    // Check required whisper properties
    const requiredWhisperProps = ['baseUrl', 'defaultModel', 'timeout', 'retryAttempts'];
    for (const prop of requiredWhisperProps) {
      if (!(prop in config.whisper)) {
        return false;
      }
    }

    return true;
  }
} 