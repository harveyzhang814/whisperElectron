/**
 * This module defines error types and error handling utilities for Whisper Docker API integration.
 */

// 基础错误类
export class WhisperAPIError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string, statusCode?: number, isRetryable = false) {
    super(message);
    this.name = 'WhisperAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

// 网络连接错误
export class NetworkError extends WhisperAPIError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode, true);
    this.name = 'NetworkError';
  }
}

// API 服务错误
export class APIError extends WhisperAPIError {
  constructor(message: string, statusCode: number) {
    const isRetryable = statusCode >= 500 || statusCode === 429;
    super(message, 'API_ERROR', statusCode, isRetryable);
    this.name = 'APIError';
  }
}

// 文件错误
export class FileError extends WhisperAPIError {
  constructor(message: string) {
    super(message, 'FILE_ERROR', undefined, false);
    this.name = 'FileError';
  }
}

// 配置错误
export class ConfigError extends WhisperAPIError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', undefined, false);
    this.name = 'ConfigError';
  }
}

// 验证错误
export class ValidationError extends WhisperAPIError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', undefined, false);
    this.name = 'ValidationError';
  }
}

// 超时错误
export class TimeoutError extends WhisperAPIError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR', undefined, true);
    this.name = 'TimeoutError';
  }
}

// 取消错误
export class CancellationError extends WhisperAPIError {
  constructor(message: string) {
    super(message, 'CANCELLATION_ERROR', undefined, false);
    this.name = 'CancellationError';
  }
}

// 错误代码常量
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CANCELLATION_ERROR: 'CANCELLATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
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
} as const;

// 错误处理工具函数
export class ErrorHandler {
  /**
   * 创建网络错误
   */
  static createNetworkError(message: string, statusCode?: number): NetworkError {
    return new NetworkError(message, statusCode);
  }

  /**
   * 创建API错误
   */
  static createAPIError(message: string, statusCode: number): APIError {
    return new APIError(message, statusCode);
  }

  /**
   * 创建文件错误
   */
  static createFileError(message: string): FileError {
    return new FileError(message);
  }

  /**
   * 创建配置错误
   */
  static createConfigError(message: string): ConfigError {
    return new ConfigError(message);
  }

  /**
   * 创建验证错误
   */
  static createValidationError(message: string): ValidationError {
    return new ValidationError(message);
  }

  /**
   * 创建超时错误
   */
  static createTimeoutError(message: string): TimeoutError {
    return new TimeoutError(message);
  }

  /**
   * 创建取消错误
   */
  static createCancellationError(message: string): CancellationError {
    return new CancellationError(message);
  }

  /**
   * 判断错误是否可重试
   */
  static isRetryableError(error: Error): boolean {
    if (error instanceof WhisperAPIError) {
      return error.isRetryable;
    }
    return false;
  }

  /**
   * 获取错误类型
   */
  static getErrorType(error: Error): string {
    if (error instanceof WhisperAPIError) {
      return error.code;
    }
    return ERROR_CODES.UNKNOWN_ERROR;
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserFriendlyMessage(error: Error): string {
    if (error instanceof WhisperAPIError) {
      switch (error.code) {
        case ERROR_CODES.NETWORK_ERROR:
          return ERROR_MESSAGES.NETWORK_CONNECTION_FAILED;
        case ERROR_CODES.TIMEOUT_ERROR:
          return ERROR_MESSAGES.NETWORK_TIMEOUT;
        case ERROR_CODES.API_ERROR:
          if (error.statusCode === 503) {
            return ERROR_MESSAGES.API_SERVICE_UNAVAILABLE;
          } else if (error.statusCode === 429) {
            return ERROR_MESSAGES.API_RATE_LIMIT;
          }
          return ERROR_MESSAGES.API_INVALID_RESPONSE;
        case ERROR_CODES.FILE_ERROR:
          return ERROR_MESSAGES.FILE_READ_ERROR;
        case ERROR_CODES.CONFIG_ERROR:
          return ERROR_MESSAGES.CONFIG_INVALID;
        case ERROR_CODES.VALIDATION_ERROR:
          return ERROR_MESSAGES.VALIDATION_FAILED;
        case ERROR_CODES.CANCELLATION_ERROR:
          return ERROR_MESSAGES.TASK_CANCELLED;
        default:
          return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
      }
    }
    return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * 记录错误日志
   */
  static logError(error: Error, context?: string): void {
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
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logError(error as Error, context);
      throw error;
    }
  }
}

// 错误重试工具
export class RetryHandler {
  /**
   * 带重试的异步操作
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!ErrorHandler.isRetryableError(error as Error) || attempt === maxRetries) {
          throw error;
        }

        ErrorHandler.logError(error as Error, `${context} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        if (attempt < maxRetries) {
          await this.delay(delay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }

    throw lastError!;
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 