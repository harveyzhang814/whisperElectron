"use strict";
/**
 * Configuration Storage Module
 *
 * This module handles configuration persistence, backup, and restoration.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ConfigStorage {
    constructor(configPath) {
        Object.defineProperty(this, "configPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "backupDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "CONFIG_VERSION", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: '1.0.0'
        });
        this.configPath = configPath;
        this.backupDir = path.join(path.dirname(configPath), 'config-backups');
        this.ensureBackupDir();
    }
    /**
     * Ensure backup directory exists
     */
    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    /**
     * Load configuration from storage
     */
    async loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log('Configuration file does not exist, using defaults');
                return null;
            }
            const configData = await fs.promises.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            // Validate configuration structure
            if (!this.validateConfigStructure(config)) {
                console.warn('Configuration structure is invalid, using defaults');
                return null;
            }
            console.log('Configuration loaded successfully');
            return config;
        }
        catch (error) {
            console.error('Failed to load configuration:', error);
            return null;
        }
    }
    /**
     * Save configuration to storage
     */
    async saveConfig(config) {
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
        }
        catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }
    /**
     * Check if configuration exists
     */
    async exists() {
        try {
            return fs.existsSync(this.configPath);
        }
        catch (error) {
            console.error('Failed to check configuration existence:', error);
            return false;
        }
    }
    /**
     * Delete configuration
     */
    async delete() {
        try {
            if (fs.existsSync(this.configPath)) {
                await fs.promises.unlink(this.configPath);
                console.log('Configuration deleted successfully');
            }
        }
        catch (error) {
            console.error('Failed to delete configuration:', error);
            throw error;
        }
    }
    /**
     * Create backup of current configuration
     */
    async backup() {
        try {
            if (!fs.existsSync(this.configPath)) {
                throw new Error('No configuration file to backup');
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `config-backup-${timestamp}.json`);
            // Read current config
            const configData = await fs.promises.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            // Create backup with metadata
            const backup = {
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
        }
        catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }
    /**
     * Restore configuration from backup
     */
    async restore(backupPath) {
        try {
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file does not exist');
            }
            // Read backup file
            const backupData = await fs.promises.readFile(backupPath, 'utf8');
            const backup = JSON.parse(backupData);
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
        }
        catch (error) {
            console.error('Failed to restore configuration:', error);
            throw error;
        }
    }
    /**
     * Get list of available backups
     */
    async getBackups() {
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
        }
        catch (error) {
            console.error('Failed to get backups:', error);
            return [];
        }
    }
    /**
     * Clean old backups (keep only the latest N backups)
     */
    async cleanOldBackups(keepCount = 10) {
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
                }
                catch (error) {
                    console.error(`Failed to delete backup ${backupPath}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Failed to clean old backups:', error);
        }
    }
    /**
     * Export configuration with metadata
     */
    async exportConfig(config, description) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const exportPath = path.join(this.backupDir, `config-export-${timestamp}.json`);
            const exportData = {
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
        }
        catch (error) {
            console.error('Failed to export configuration:', error);
            throw error;
        }
    }
    /**
     * Import configuration from export file
     */
    async importConfig(exportPath) {
        try {
            if (!fs.existsSync(exportPath)) {
                throw new Error('Export file does not exist');
            }
            const exportData = await fs.promises.readFile(exportPath, 'utf8');
            const exportConfig = JSON.parse(exportData);
            if (!exportConfig.config || !exportConfig.version) {
                throw new Error('Invalid export format');
            }
            if (!this.validateConfigStructure(exportConfig.config)) {
                throw new Error('Export configuration structure is invalid');
            }
            return exportConfig.config;
        }
        catch (error) {
            console.error('Failed to import configuration:', error);
            throw error;
        }
    }
    /**
     * Get configuration statistics
     */
    async getStats() {
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
        }
        catch (error) {
            console.error('Failed to get configuration stats:', error);
            throw error;
        }
    }
    /**
     * Create automatic backup before saving
     */
    async createBackup() {
        try {
            if (fs.existsSync(this.configPath)) {
                await this.backup();
            }
        }
        catch (error) {
            console.warn('Failed to create automatic backup:', error);
            // Don't throw error for automatic backup failure
        }
    }
    /**
     * Validate configuration structure
     */
    validateConfigStructure(config) {
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
exports.ConfigStorage = ConfigStorage;
