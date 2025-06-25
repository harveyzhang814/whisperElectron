/**
 * Configuration Types
 * 
 * This file defines all configuration-related types and interfaces for the WhisperElectron application.
 */

/**
 * Whisper API configuration
 */
export interface WhisperAPIConfig {
  /** API service base URL */
  baseUrl: string;
  /** Default model for transcription */
  defaultModel: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Default language for transcription (empty for auto-detection) */
  language: string;
  /** Output format for transcription results */
  outputFormat: 'text' | 'json' | 'json_metadata';
  /** Enable health check */
  enableHealthCheck: boolean;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
}

/**
 * Transcription task configuration
 */
export interface TranscriptionConfig {
  /** Default model for transcription tasks */
  defaultModel: string;
  /** Default language for transcription (empty for auto-detection) */
  defaultLanguage?: string;
  /** Maximum number of concurrent transcription tasks */
  maxConcurrentTranscriptions: number;
  /** Whether to automatically transcribe recordings after completion */
  autoTranscribeRecordings: boolean;
  /** Output directory for transcription results */
  outputDirectory: string;
  /** Default output format for transcription results */
  defaultOutputFormat: 'txt' | 'json' | 'srt' | 'vtt';
  /** Default temperature for transcription */
  defaultTemperature: number;
  /** Enable transcription result caching */
  enableCaching: boolean;
  /** Cache directory for transcription results */
  cacheDirectory: string;
  /** Maximum cache size in MB */
  maxCacheSize: number;
  /** Enable automatic cleanup of old transcription results */
  enableAutoCleanup: boolean;
  /** Retention period for transcription results in days */
  retentionPeriod: number;
}

/**
 * Main application configuration structure
 */
export interface AppConfig {
  /** Whisper API configuration */
  whisper: WhisperAPIConfig;
  /** Transcription task configuration */
  transcription: TranscriptionConfig;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors?: string[];
  /** Validation warnings if any */
  warnings?: string[];
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  /** Previous configuration */
  oldConfig: AppConfig;
  /** New configuration */
  newConfig: AppConfig;
  /** Changed configuration keys */
  changes: (keyof AppConfig)[];
}

/**
 * Configuration storage interface
 */
export interface ConfigStorageInterface {
  /** Load configuration from storage */
  loadConfig(): Promise<AppConfig | null>;
  /** Save configuration to storage */
  saveConfig(config: AppConfig): Promise<void>;
  /** Check if configuration exists */
  exists(): Promise<boolean>;
  /** Delete configuration */
  delete(): Promise<void>;
  /** Backup configuration */
  backup(): Promise<string>;
  /** Restore configuration from backup */
  restore(backupPath: string): Promise<void>;
}

/**
 * Configuration validation rule
 */
export interface ConfigValidationRule {
  /** Whether the field is required */
  required?: boolean;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Regular expression pattern (for strings) */
  pattern?: RegExp;
  /** Custom validation function */
  validator?: (value: any) => boolean | string;
  /** Error message */
  message?: string;
}

/**
 * Configuration validation rules
 */
export interface ConfigValidationRules {
  [key: string]: ConfigValidationRule;
}

/**
 * Configuration migration interface
 */
export interface ConfigMigration {
  /** Migration version */
  version: string;
  /** Migration function */
  migrate: (config: any) => any;
  /** Rollback function */
  rollback: (config: any) => any;
}

/**
 * Configuration export/import format
 */
export interface ConfigExport {
  /** Configuration version */
  version: string;
  /** Export timestamp */
  timestamp: string;
  /** Configuration data */
  config: AppConfig;
  /** Export metadata */
  metadata?: {
    appVersion?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Configuration error types
 */
export enum ConfigErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  IMPORT_ERROR = 'IMPORT_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR'
}

/**
 * Configuration error
 */
export interface ConfigError {
  /** Error type */
  type: ConfigErrorType;
  /** Error message */
  message: string;
  /** Error details */
  details?: any;
  /** Error timestamp */
  timestamp: string;
}

/**
 * Configuration health check result
 */
export interface ConfigHealthResult {
  /** Overall health status */
  healthy: boolean;
  /** Health check details */
  details: {
    /** Configuration validity */
    valid: boolean;
    /** Storage accessibility */
    storage: boolean;
    /** Required fields presence */
    required: boolean;
    /** Configuration format */
    format: boolean;
  };
  /** Health check timestamp */
  timestamp: string;
  /** Issues found */
  issues?: string[];
}

/**
 * Configuration statistics
 */
export interface ConfigStats {
  /** Total configuration size in bytes */
  size: number;
  /** Last modification time */
  lastModified: string;
  /** Number of configuration sections */
  sections: number;
  /** Configuration version */
  version: string;
  /** Backup count */
  backupCount: number;
} 