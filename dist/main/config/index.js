"use strict";
/**
 * Configuration Management Module
 *
 * This module provides centralized configuration management for the WhisperElectron application.
 * It handles configuration loading, saving, validation, and change notifications.
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
exports.configManager = exports.ConfigManager = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const events_1 = require("events");
const validation_1 = require("./validation");
const storage_1 = require("./storage");
class ConfigManager extends events_1.EventEmitter {
    constructor() {
        super();
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "storage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "configPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
        this.storage = new storage_1.ConfigStorage(this.configPath);
        this.config = this.getDefaultConfig();
    }
    /**
     * Get singleton instance of ConfigManager
     */
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Initialize the configuration manager
     */
    async initialize() {
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
            const validation = (0, validation_1.validateConfig)(this.config);
            if (!validation.isValid) {
                console.warn('Configuration validation failed:', validation.errors);
                // Use default config for invalid configurations
                this.config = this.getDefaultConfig();
            }
            this.isInitialized = true;
            console.log('Configuration manager initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize configuration manager:', error);
            // Use default config on initialization failure
            this.config = this.getDefaultConfig();
            this.isInitialized = true;
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get specific configuration section
     */
    getConfigSection(section) {
        return this.config[section];
    }
    /**
     * Update configuration
     */
    async updateConfig(updates) {
        const newConfig = { ...this.config, ...updates };
        const validation = (0, validation_1.validateConfig)(newConfig);
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
                changes: Object.keys(updates)
            });
            return { isValid: true };
        }
        catch (error) {
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
    async updateConfigSection(section, value) {
        return this.updateConfig({ [section]: value });
    }
    /**
     * Reset configuration to defaults
     */
    async resetConfig() {
        const oldConfig = { ...this.config };
        this.config = this.getDefaultConfig();
        try {
            await this.storage.saveConfig(this.config);
            this.emit('configChanged', {
                oldConfig,
                newConfig: this.config,
                changes: Object.keys(this.config)
            });
        }
        catch (error) {
            // Revert on save failure
            this.config = oldConfig;
            throw error;
        }
    }
    /**
     * Validate current configuration
     */
    validateConfig() {
        return (0, validation_1.validateConfig)(this.config);
    }
    /**
     * Export configuration
     */
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    /**
     * Import configuration
     */
    async importConfig(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            const validation = (0, validation_1.validateConfig)(importedConfig);
            if (!validation.isValid) {
                return validation;
            }
            return await this.updateConfig(importedConfig);
        }
        catch (error) {
            return {
                isValid: false,
                errors: ['Invalid configuration format']
            };
        }
    }
    /**
     * Get configuration file path
     */
    getConfigPath() {
        return this.configPath;
    }
    /**
     * Check if configuration manager is initialized
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
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
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.configManager = ConfigManager.getInstance();
