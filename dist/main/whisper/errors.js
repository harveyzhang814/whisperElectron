"use strict";
/**
 * This module defines error types and error handling utilities for Whisper Docker API integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHandler = exports.ErrorHandler = exports.ERROR_MESSAGES = exports.ERROR_CODES = exports.CancellationError = exports.TimeoutError = exports.ValidationError = exports.ConfigError = exports.FileError = exports.APIError = exports.NetworkError = exports.WhisperAPIError = void 0;
// 基础错误类
class WhisperAPIError extends Error {
    constructor(message, code, statusCode, isRetryable = false) {
        super(message);
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isRetryable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'WhisperAPIError';
        this.code = code;
        this.statusCode = statusCode;
        this.isRetryable = isRetryable;
    }
}
exports.WhisperAPIError = WhisperAPIError;
// 网络连接错误
class NetworkError extends WhisperAPIError {
    constructor(message, statusCode) {
        super(message, 'NETWORK_ERROR', statusCode, true);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
// API 服务错误
class APIError extends WhisperAPIError {
    constructor(message, statusCode) {
        const isRetryable = statusCode >= 500 || statusCode === 429;
        super(message, 'API_ERROR', statusCode, isRetryable);
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
// 文件错误
class FileError extends WhisperAPIError {
    constructor(message) {
        super(message, 'FILE_ERROR', undefined, false);
        this.name = 'FileError';
    }
}
exports.FileError = FileError;
// 配置错误
class ConfigError extends WhisperAPIError {
    constructor(message) {
        super(message, 'CONFIG_ERROR', undefined, false);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
// 验证错误
class ValidationError extends WhisperAPIError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', undefined, false);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// 超时错误
class TimeoutError extends WhisperAPIError {
    constructor(message) {
        super(message, 'TIMEOUT_ERROR', undefined, true);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
// 取消错误
class CancellationError extends WhisperAPIError {
    constructor(message) {
        super(message, 'CANCELLATION_ERROR', undefined, false);
        this.name = 'CancellationError';
    }
}
exports.CancellationError = CancellationError;
// 错误代码常量
exports.ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    FILE_ERROR: 'FILE_ERROR',
    CONFIG_ERROR: 'CONFIG_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    CANCELLATION_ERROR: 'CANCELLATION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};
// 错误消息常量
exports.ERROR_MESSAGES = {
    NETWORK_CONNECTION_FAILED: '网络连接失败，请检查API地址和网络连接',
    NETWORK_TIMEOUT: '网络请求超时，请检查网络连接或增加超时时间',
    API_SERVICE_UNAVAILABLE: 'API服务不可用，请检查服务状态',
    API_RATE_LIMIT: 'API请求频率过高，请稍后重试',
    API_INVALID_RESPONSE: 'API响应格式无效',
    FILE_NOT_FOUND: '音频文件不存在',
    FILE_READ_ERROR: '音频文件读取失败',
    FILE_FORMAT_NOT_SUPPORTED: '音频格式不支持',
    FILE_TOO_LARGE: '音频文件过大',
    CONFIG_INVALID: '配置参数无效',
    CONFIG_MISSING: '缺少必要的配置参数',
    VALIDATION_FAILED: '参数验证失败',
    TIMEOUT_EXCEEDED: '操作超时',
    TASK_CANCELLED: '任务已取消',
    UNKNOWN_ERROR: '未知错误'
};
// 错误处理工具函数
class ErrorHandler {
    /**
     * 创建网络错误
     */
    static createNetworkError(message, statusCode) {
        return new NetworkError(message, statusCode);
    }
    /**
     * 创建API错误
     */
    static createAPIError(message, statusCode) {
        return new APIError(message, statusCode);
    }
    /**
     * 创建文件错误
     */
    static createFileError(message) {
        return new FileError(message);
    }
    /**
     * 创建配置错误
     */
    static createConfigError(message) {
        return new ConfigError(message);
    }
    /**
     * 创建验证错误
     */
    static createValidationError(message) {
        return new ValidationError(message);
    }
    /**
     * 创建超时错误
     */
    static createTimeoutError(message) {
        return new TimeoutError(message);
    }
    /**
     * 创建取消错误
     */
    static createCancellationError(message) {
        return new CancellationError(message);
    }
    /**
     * 判断错误是否可重试
     */
    static isRetryableError(error) {
        if (error instanceof WhisperAPIError) {
            return error.isRetryable;
        }
        return false;
    }
    /**
     * 获取错误类型
     */
    static getErrorType(error) {
        if (error instanceof WhisperAPIError) {
            return error.code;
        }
        return exports.ERROR_CODES.UNKNOWN_ERROR;
    }
    /**
     * 获取用户友好的错误消息
     */
    static getUserFriendlyMessage(error) {
        if (error instanceof WhisperAPIError) {
            switch (error.code) {
                case exports.ERROR_CODES.NETWORK_ERROR:
                    return exports.ERROR_MESSAGES.NETWORK_CONNECTION_FAILED;
                case exports.ERROR_CODES.TIMEOUT_ERROR:
                    return exports.ERROR_MESSAGES.NETWORK_TIMEOUT;
                case exports.ERROR_CODES.API_ERROR:
                    if (error.statusCode === 503) {
                        return exports.ERROR_MESSAGES.API_SERVICE_UNAVAILABLE;
                    }
                    else if (error.statusCode === 429) {
                        return exports.ERROR_MESSAGES.API_RATE_LIMIT;
                    }
                    return exports.ERROR_MESSAGES.API_INVALID_RESPONSE;
                case exports.ERROR_CODES.FILE_ERROR:
                    return exports.ERROR_MESSAGES.FILE_READ_ERROR;
                case exports.ERROR_CODES.CONFIG_ERROR:
                    return exports.ERROR_MESSAGES.CONFIG_INVALID;
                case exports.ERROR_CODES.VALIDATION_ERROR:
                    return exports.ERROR_MESSAGES.VALIDATION_FAILED;
                case exports.ERROR_CODES.CANCELLATION_ERROR:
                    return exports.ERROR_MESSAGES.TASK_CANCELLED;
                default:
                    return error.message || exports.ERROR_MESSAGES.UNKNOWN_ERROR;
            }
        }
        return error.message || exports.ERROR_MESSAGES.UNKNOWN_ERROR;
    }
    /**
     * 记录错误日志
     */
    static logError(error, context) {
        const timestamp = new Date().toISOString();
        const errorType = this.getErrorType(error);
        const contextInfo = context ? ` [${context}]` : '';
        console.error(`[${timestamp}]${contextInfo} ${errorType}: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
    }
    /**
     * 包装异步函数，统一错误处理
     */
    static async wrapAsync(fn, context) {
        try {
            return await fn();
        }
        catch (error) {
            this.logError(error, context);
            throw error;
        }
    }
}
exports.ErrorHandler = ErrorHandler;
// 错误重试工具
class RetryHandler {
    /**
     * 带重试的异步操作
     */
    static async withRetry(operation, maxRetries, delay, context) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (!ErrorHandler.isRetryableError(error) || attempt === maxRetries) {
                    throw error;
                }
                ErrorHandler.logError(error, `${context} (attempt ${attempt + 1}/${maxRetries + 1})`);
                if (attempt < maxRetries) {
                    await this.delay(delay * Math.pow(2, attempt)); // 指数退避
                }
            }
        }
        throw lastError;
    }
    /**
     * 延迟函数
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryHandler = RetryHandler;
