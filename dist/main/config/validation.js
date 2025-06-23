"use strict";
/**
 * Configuration Validation Module
 *
 * This module provides validation logic for configuration values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
exports.validateConfigSection = validateConfigSection;
exports.validateConfigPath = validateConfigPath;
exports.getValidationRule = getValidationRule;
exports.getAllValidationRules = getAllValidationRules;
exports.hasValidationRule = hasValidationRule;
exports.getValidationError = getValidationError;
exports.validateConfigStructure = validateConfigStructure;
/**
 * Validation rules for configuration
 */
const VALIDATION_RULES = {
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
    }
};
/**
 * Get nested object value by path
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}
/**
 * Validate a single configuration value
 */
function validateValue(value, rule) {
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
function validateConfig(config) {
    const errors = [];
    const warnings = [];
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
function validateConfigConsistency(config, _errors, warnings) {
    const { whisper } = config;
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
}
/**
 * Validate specific configuration section
 */
function validateConfigSection(section, value) {
    // Create a temporary config with the section value
    const tempConfig = { whisper: {} };
    if (section === 'whisper') {
        tempConfig.whisper = value;
    }
    return validateConfig(tempConfig);
}
/**
 * Validate configuration value by path
 */
function validateConfigPath(path, value) {
    const rule = VALIDATION_RULES[path];
    if (!rule) {
        return null; // No validation rule for this path
    }
    return validateValue(value, rule);
}
/**
 * Get validation rules for a specific path
 */
function getValidationRule(path) {
    return VALIDATION_RULES[path];
}
/**
 * Get all validation rules
 */
function getAllValidationRules() {
    return { ...VALIDATION_RULES };
}
/**
 * Check if a configuration path has validation rules
 */
function hasValidationRule(path) {
    return path in VALIDATION_RULES;
}
/**
 * Get validation error message for a specific path and value
 */
function getValidationError(path, value) {
    return validateConfigPath(path, value);
}
/**
 * Validate configuration structure
 */
function validateConfigStructure(config) {
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
