"use strict";
/**
 * This module provides utility functions for Whisper Docker API integration,
 * including file validation, format conversion, and helper functions.
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
exports.GeneralUtils = exports.ResponseUtils = exports.RequestUtils = exports.ConfigUtils = exports.FileUtils = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const types_1 = require("./types");
const errors_1 = require("./errors");
// 文件工具类
class FileUtils {
    /**
     * 检查文件是否存在
     */
    static async fileExists(filePath) {
        try {
            await Promise.resolve().then(() => __importStar(require('fs'))).then(fs => fs.promises.access(filePath));
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取文件大小（字节）
     */
    static getFileSize(filePath) {
        try {
            return (0, fs_1.statSync)(filePath).size;
        }
        catch (error) {
            throw errors_1.ErrorHandler.createFileError(`无法获取文件大小: ${filePath}`);
        }
    }
    /**
     * 获取文件扩展名
     */
    static getFileExtension(filePath) {
        return (0, path_1.extname)(filePath).toLowerCase().slice(1);
    }
    /**
     * 获取文件名（不含扩展名）
     */
    static getFileName(filePath) {
        return (0, path_1.basename)(filePath, (0, path_1.extname)(filePath));
    }
    /**
     * 检查音频格式是否支持
     */
    static isSupportedAudioFormat(format) {
        return types_1.SUPPORTED_AUDIO_FORMATS.includes(format);
    }
    /**
     * 检查输出格式是否支持
     */
    static isSupportedOutputFormat(format) {
        return types_1.SUPPORTED_OUTPUT_FORMATS.includes(format);
    }
    /**
     * 检查语言代码是否支持
     */
    static isSupportedLanguage(language) {
        return types_1.SUPPORTED_LANGUAGES.includes(language);
    }
    /**
     * 验证音频文件
     */
    static validateAudioFile(filePath) {
        if (!this.fileExists(filePath)) {
            throw errors_1.ErrorHandler.createFileError(`音频文件不存在: ${filePath}`);
        }
        const extension = this.getFileExtension(filePath);
        if (!this.isSupportedAudioFormat(extension)) {
            throw errors_1.ErrorHandler.createFileError(`不支持的音频格式: ${extension}。支持的格式: ${types_1.SUPPORTED_AUDIO_FORMATS.join(', ')}`);
        }
        const fileSize = this.getFileSize(filePath);
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (fileSize > maxSize) {
            throw errors_1.ErrorHandler.createFileError(`音频文件过大: ${(fileSize / 1024 / 1024).toFixed(2)}MB，最大支持: 100MB`);
        }
    }
    /**
     * 创建文件流
     */
    static createFileStream(filePath) {
        try {
            return (0, fs_1.createReadStream)(filePath);
        }
        catch (error) {
            throw errors_1.ErrorHandler.createFileError(`无法读取文件: ${filePath}`);
        }
    }
}
exports.FileUtils = FileUtils;
// 配置工具类
class ConfigUtils {
    /**
     * 验证API配置
     */
    static validateAPIConfig(config) {
        const errors = [];
        if (!config.baseUrl) {
            errors.push('API基础URL不能为空');
        }
        else if (!this.isValidUrl(config.baseUrl)) {
            errors.push('API基础URL格式无效');
        }
        if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 300000)) {
            errors.push('超时时间必须在1-300秒之间');
        }
        if (config.retryAttempts !== undefined && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
            errors.push('重试次数必须在0-10之间');
        }
        if (config.retryDelay !== undefined && (config.retryDelay < 100 || config.retryDelay > 10000)) {
            errors.push('重试延迟必须在100-10000毫秒之间');
        }
        if (config.defaultModel && !this.isValidModelName(config.defaultModel)) {
            errors.push('默认模型名称无效');
        }
        if (config.defaultLanguage && !FileUtils.isSupportedLanguage(config.defaultLanguage)) {
            errors.push(`不支持的语言代码: ${config.defaultLanguage}`);
        }
        if (config.defaultOutputFormat && !FileUtils.isSupportedOutputFormat(config.defaultOutputFormat)) {
            errors.push(`不支持的输出格式: ${config.defaultOutputFormat}`);
        }
        if (errors.length > 0) {
            throw errors_1.ErrorHandler.createValidationError(errors.join('; '));
        }
    }
    /**
     * 验证URL格式
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 验证模型名称
     */
    static isValidModelName(model) {
        // 简单的模型名称验证，可以根据实际需求调整
        return /^[a-zA-Z0-9._-]+$/.test(model) && model.length <= 50;
    }
    /**
     * 合并配置
     */
    static mergeConfig(baseConfig, overrideConfig) {
        return {
            ...baseConfig,
            ...overrideConfig
        };
    }
    /**
     * 获取默认配置
     */
    static getDefaultConfig() {
        return {
            baseUrl: 'http://localhost:9000',
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            defaultModel: 'base',
            defaultLanguage: 'auto',
            defaultOutputFormat: 'txt',
            enableWordTimestamps: false,
            enableConfidence: false
        };
    }
}
exports.ConfigUtils = ConfigUtils;
// 请求工具类
class RequestUtils {
    /**
     * 构建API请求参数
     */
    static buildTranscribeRequest(filePath, config, options = {}) {
        return {
            file: filePath,
            model: options.model || config.defaultModel,
            language: options.language || config.defaultLanguage,
            output_format: options.output_format || config.defaultOutputFormat,
            word_timestamps: options.word_timestamps ?? config.enableWordTimestamps,
            condition_on_previous_text: options.condition_on_previous_text ?? config.enableConfidence,
            initial_prompt: options.initial_prompt,
            temperature: options.temperature,
            compression_ratio_threshold: options.compression_ratio_threshold,
            logprob_threshold: options.logprob_threshold,
            no_speech_threshold: options.no_speech_threshold
        };
    }
    /**
     * 构建API URL
     */
    static buildAPIUrl(baseUrl, endpoint) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const cleanEndpoint = endpoint.replace(/^\//, '');
        return `${cleanBaseUrl}/${cleanEndpoint}`;
    }
    /**
     * 构建查询参数
     */
    static buildQueryParams(params) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        }
        return searchParams.toString();
    }
}
exports.RequestUtils = RequestUtils;
// 响应工具类
class ResponseUtils {
    /**
     * 解析API响应
     */
    static parseTranscribeResponse(response) {
        try {
            if (typeof response === 'string') {
                return JSON.parse(response);
            }
            return response;
        }
        catch (error) {
            throw errors_1.ErrorHandler.createAPIError('API响应格式无效', 0);
        }
    }
    /**
     * 验证转写响应
     */
    static validateTranscribeResponse(response) {
        if (!response || typeof response !== 'object') {
            throw errors_1.ErrorHandler.createAPIError('API响应格式无效', 0);
        }
        if (typeof response.text !== 'string') {
            throw errors_1.ErrorHandler.createAPIError('API响应缺少文本内容', 0);
        }
    }
    /**
     * 格式化转写结果
     */
    static formatTranscribeResult(response, outputFormat) {
        switch (outputFormat) {
            case 'txt':
                return response.text;
            case 'json':
                return JSON.stringify(response, null, 2);
            case 'vtt':
                return this.convertToVTT(response);
            case 'srt':
                return this.convertToSRT(response);
            default:
                return response.text;
        }
    }
    /**
     * 转换为VTT格式
     */
    static convertToVTT(response) {
        if (!response.segments || !Array.isArray(response.segments)) {
            return response.text;
        }
        let vtt = 'WEBVTT\n\n';
        response.segments.forEach((segment, index) => {
            const startTime = this.formatTime(segment.start);
            const endTime = this.formatTime(segment.end);
            vtt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
        });
        return vtt;
    }
    /**
     * 转换为SRT格式
     */
    static convertToSRT(response) {
        if (!response.segments || !Array.isArray(response.segments)) {
            return response.text;
        }
        let srt = '';
        response.segments.forEach((segment, index) => {
            const startTime = this.formatTimeSRT(segment.start);
            const endTime = this.formatTimeSRT(segment.end);
            srt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
        });
        return srt;
    }
    /**
     * 格式化时间（VTT格式）
     */
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    /**
     * 格式化时间（SRT格式）
     */
    static formatTimeSRT(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }
}
exports.ResponseUtils = ResponseUtils;
// 通用工具函数
class GeneralUtils {
    /**
     * 生成唯一ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    /**
     * 延迟函数
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 格式化文件大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    /**
     * 格式化时间
     */
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    /**
     * 检查是否为开发环境
     */
    static isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }
    /**
     * 检查是否为生产环境
     */
    static isProduction() {
        return process.env.NODE_ENV === 'production';
    }
}
exports.GeneralUtils = GeneralUtils;
