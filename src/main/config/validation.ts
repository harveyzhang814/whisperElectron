/**
 * Configuration Validation Module
 * 
 * This module provides validation logic for configuration values.
 */

import { AppConfig, ConfigValidationResult, ConfigValidationRules } from './types';

/**
 * Validation rules for configuration
 */
const VALIDATION_RULES: ConfigValidationRules = {
  'whisper.baseUrl': {
    required: true,
    pattern: /^https?:\/\/.+/,
    message: 'API 地址格式不正确，必须以 http:// 或 https:// 开头'
  },
  'whisper.defaultModel': {
    required: true,
    pattern: /^(tiny|base|small|medium|large)$/,
    message: '请选择有效的模型：tiny, base, small, medium, large'
  },
  'whisper.timeout': {
    required: true,
    min: 5000,
    max: 300000,
    message: '超时时间应在 5-300 秒之间'
  },
  'whisper.retryAttempts': {
    required: true,
    min: 0,
    max: 10,
    message: '重试次数应在 0-10 之间'
  },
  'whisper.language': {
    required: false,
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
    message: '语言代码格式不正确，应为 ISO 639-1 格式（如：en, zh-CN）'
  },
  'whisper.outputFormat': {
    required: true,
    validator: (value) => ['text', 'json', 'json_metadata'].includes(value),
    message: '输出格式必须是：text, json, json_metadata'
  },
  'whisper.enableHealthCheck': {
    required: true,
    validator: (value) => typeof value === 'boolean',
    message: '健康检查开关必须是布尔值'
  },
  'whisper.healthCheckInterval': {
    required: true,
    min: 10000,
    max: 300000,
    message: '健康检查间隔应在 10-300 秒之间'
  },
  'transcription.defaultModel': {
    required: true,
    pattern: /^(tiny|base|small|medium|large)$/,
    message: '请选择有效的转录模型：tiny, base, small, medium, large'
  },
  'transcription.defaultLanguage': {
    required: false,
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
    message: '语言代码格式不正确，应为 ISO 639-1 格式（如：en, zh-CN）'
  },
  'transcription.maxConcurrentTranscriptions': {
    required: true,
    min: 1,
    max: 10,
    message: '最大并发转录数应在 1-10 之间'
  },
  'transcription.autoTranscribeRecordings': {
    required: true,
    validator: (value) => typeof value === 'boolean',
    message: '自动转录开关必须是布尔值'
  },
  'transcription.outputDirectory': {
    required: true,
    pattern: /^.+$/,
    message: '输出目录不能为空'
  },
  'transcription.defaultOutputFormat': {
    required: true,
    validator: (value) => ['txt', 'json', 'srt', 'vtt'].includes(value),
    message: '输出格式必须是：txt, json, srt, vtt'
  },
  'transcription.defaultTemperature': {
    required: true,
    min: 0.0,
    max: 1.0,
    message: '温度值应在 0.0-1.0 之间'
  },
  'transcription.enableCaching': {
    required: true,
    validator: (value) => typeof value === 'boolean',
    message: '缓存开关必须是布尔值'
  },
  'transcription.cacheDirectory': {
    required: true,
    pattern: /^.+$/,
    message: '缓存目录不能为空'
  },
  'transcription.maxCacheSize': {
    required: true,
    min: 10,
    max: 1000,
    message: '最大缓存大小应在 10-1000 MB 之间'
  },
  'transcription.enableAutoCleanup': {
    required: true,
    validator: (value) => typeof value === 'boolean',
    message: '自动清理开关必须是布尔值'
  },
  'transcription.retentionPeriod': {
    required: true,
    min: 1,
    max: 365,
    message: '保留期应在 1-365 天之间'
  }
};

/**
 * Get nested object value by path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Validate a single configuration value
 */
function validateValue(value: any, rule: any): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return rule.message || '此字段是必填的';
  }

  // Skip validation if value is empty and not required
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Check minimum value
  if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
    return rule.message || `值不能小于 ${rule.min}`;
  }

  // Check maximum value
  if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
    return rule.message || `值不能大于 ${rule.max}`;
  }

  // Check pattern
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return rule.message || '格式不正确';
  }

  // Check custom validator
  if (rule.validator) {
    const result = rule.validator(value);
    if (result === false) {
      return rule.message || '验证失败';
    }
    if (typeof result === 'string') {
      return result;
    }
  }

  return null;
}

/**
 * Validate configuration object
 */
export function validateConfig(config: AppConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each configuration path
  for (const [path, rule] of Object.entries(VALIDATION_RULES)) {
    const value = getNestedValue(config, path);
    const error = validateValue(value, rule);
    
    if (error) {
      errors.push(`${path}: ${error}`);
    }
  }

  // Additional validation logic
  validateConfigConsistency(config, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate configuration consistency
 */
function validateConfigConsistency(config: AppConfig, _errors: string[], warnings: string[]): void {
  const { whisper, transcription } = config;

  // Check if health check interval is reasonable compared to timeout
  if (whisper.enableHealthCheck && whisper.healthCheckInterval < whisper.timeout) {
    warnings.push('健康检查间隔小于超时时间，可能导致频繁的超时');
  }

  // Check if retry attempts are reasonable
  if (whisper.retryAttempts > 5) {
    warnings.push('重试次数较多，可能影响性能');
  }

  // Check if language is specified but not in common languages
  if (whisper.language && !['en', 'zh', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de'].includes(whisper.language)) {
    warnings.push(`语言代码 "${whisper.language}" 可能不是常用语言`);
  }

  // Check if base URL is localhost in production-like environment
  if (whisper.baseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    warnings.push('生产环境中使用 localhost，请确认配置正确');
  }

  // 检查 Whisper API 配置一致性
  if (config.whisper) {
    const apiConfig = config.whisper;
    
    // 检查模型和语言的一致性
    if (apiConfig.defaultModel && apiConfig.language) {
      // 这里可以添加模型和语言的兼容性检查
      // 例如：某些模型可能不支持某些语言
    }
    
    // 检查输出格式和单词时间戳的一致性
    if (apiConfig.outputFormat === 'text') {
      // 纯文本格式不支持复杂功能
      warnings.push('纯文本格式功能有限，建议使用 JSON 格式以获得更多信息');
    }
  }

  // 检查转录配置一致性
  if (transcription) {
    // 检查模型一致性
    if (whisper.defaultModel !== transcription.defaultModel) {
      warnings.push('Whisper API 默认模型与转录默认模型不一致，可能导致混淆');
    }

    // 检查语言一致性
    if (whisper.language && transcription.defaultLanguage && 
        whisper.language !== transcription.defaultLanguage) {
      warnings.push('Whisper API 语言与转录默认语言不一致，可能导致混淆');
    }

    // 检查并发数合理性
    if (transcription.maxConcurrentTranscriptions > 5) {
      warnings.push('并发转录数较多，可能影响系统性能');
    }

    // 检查缓存配置
    if (transcription.enableCaching && transcription.maxCacheSize > 500) {
      warnings.push('缓存大小较大，可能占用过多磁盘空间');
    }

    // 检查自动转录配置
    if (transcription.autoTranscribeRecordings && transcription.maxConcurrentTranscriptions < 2) {
      warnings.push('启用自动转录时，建议设置更高的并发数');
    }
  }
}

/**
 * Validate specific configuration section
 */
export function validateConfigSection<K extends keyof AppConfig>(
  section: K,
  value: AppConfig[K]
): ConfigValidationResult {
  // Create a temporary config with the section value
  const tempConfig = { whisper: {} } as AppConfig;
  if (section === 'whisper') {
    tempConfig.whisper = value as AppConfig['whisper'];
  }
  return validateConfig(tempConfig);
}

/**
 * Validate configuration value by path
 */
export function validateConfigPath(path: string, value: any): string | null {
  const rule = VALIDATION_RULES[path];
  if (!rule) {
    return null; // No validation rule for this path
  }
  return validateValue(value, rule);
}

/**
 * Get validation rules for a specific path
 */
export function getValidationRule(path: string) {
  return VALIDATION_RULES[path];
}

/**
 * Get all validation rules
 */
export function getAllValidationRules(): ConfigValidationRules {
  return { ...VALIDATION_RULES };
}

/**
 * Check if a configuration path has validation rules
 */
export function hasValidationRule(path: string): boolean {
  return path in VALIDATION_RULES;
}

/**
 * Get validation error message for a specific path and value
 */
export function getValidationError(path: string, value: any): string | null {
  return validateConfigPath(path, value);
}

/**
 * Validate configuration structure
 */
export function validateConfigStructure(config: any): boolean {
  // Check if config has required top-level properties
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!config.whisper || typeof config.whisper !== 'object') {
    return false;
  }

  // Check if whisper config has required properties
  const requiredWhisperProps = ['baseUrl', 'defaultModel', 'timeout', 'retryAttempts'];
  for (const prop of requiredWhisperProps) {
    if (!(prop in config.whisper)) {
      return false;
    }
  }

  return true;
} 