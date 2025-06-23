"use strict";
/**
 * This module provides the main WhisperAPIClient class for interacting with the Whisper Docker API,
 * including transcription, model management, and health checking functionality.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperAPIClient = void 0;
const events_1 = require("events");
const errors_1 = require("./errors");
const utils_1 = require("./utils");
/**
 * Whisper API 客户端主类
 * 提供与 Whisper Docker API 的完整交互功能
 */
class WhisperAPIClient extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tasks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "abortControllers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "healthCheckInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "modelsCache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lastHealthCheck", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // 合并默认配置和用户配置
        this.config = utils_1.ConfigUtils.mergeConfig(utils_1.ConfigUtils.getDefaultConfig(), config);
        // 验证配置
        utils_1.ConfigUtils.validateAPIConfig(this.config);
        // 启动健康检查
        this.startHealthCheck();
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        const mergedConfig = utils_1.ConfigUtils.mergeConfig(this.config, newConfig);
        utils_1.ConfigUtils.validateAPIConfig(mergedConfig);
        this.config = mergedConfig;
        // 重新启动健康检查
        this.stopHealthCheck();
        this.startHealthCheck();
        // 清除缓存
        this.modelsCache = undefined;
        this.lastHealthCheck = undefined;
    }
    /**
     * 转写音频文件
     */
    async transcribe(filePath, options = {}, onProgress) {
        const taskId = utils_1.GeneralUtils.generateId();
        try {
            // 验证文件
            utils_1.FileUtils.validateAudioFile(filePath);
            // 创建任务
            const task = {
                id: taskId,
                filePath,
                status: 'pending',
                progress: {
                    progress: 0,
                    status: 'uploading',
                    message: '准备上传文件...'
                },
                createdAt: new Date()
            };
            this.tasks.set(taskId, task);
            this.emit('transcribe:start', taskId, filePath);
            // 构建请求参数
            const requestParams = utils_1.RequestUtils.buildTranscribeRequest(filePath, this.config, options);
            // 执行转写
            const result = await this.executeTranscribe(taskId, requestParams, onProgress);
            // 更新任务状态
            task.status = 'completed';
            task.result = result;
            task.completedAt = new Date();
            task.progress = {
                progress: 100,
                status: 'completed',
                message: '转写完成'
            };
            this.tasks.set(taskId, task);
            this.emit('transcribe:complete', taskId, result);
            return result;
        }
        catch (error) {
            // 处理错误
            const errorMessage = errors_1.ErrorHandler.getUserFriendlyMessage(error);
            const task = this.tasks.get(taskId);
            if (task) {
                task.status = 'error';
                task.error = errorMessage;
                task.completedAt = new Date();
                task.progress = {
                    progress: 0,
                    status: 'error',
                    message: errorMessage,
                    error: errorMessage
                };
                this.tasks.set(taskId, task);
            }
            this.emit('transcribe:error', taskId, errorMessage);
            throw error;
        }
        finally {
            // 清理资源
            this.abortControllers.delete(taskId);
        }
    }
    /**
     * 执行转写请求
     */
    async executeTranscribe(taskId, requestParams, onProgress) {
        const abortController = new AbortController();
        this.abortControllers.set(taskId, abortController);
        return errors_1.RetryHandler.withRetry(async () => {
            // 检查是否被取消
            if (abortController.signal.aborted) {
                throw new errors_1.CancellationError('转写任务已取消');
            }
            // 更新进度
            this.updateProgress(taskId, {
                progress: 10,
                status: 'uploading',
                message: '正在上传文件...'
            }, onProgress);
            // 创建表单数据
            const formData = new FormData();
            const fileStream = utils_1.FileUtils.createFileStream(requestParams.file);
            formData.append('file', fileStream);
            // 添加其他参数
            Object.entries(requestParams).forEach(([key, value]) => {
                if (key !== 'file' && value !== undefined) {
                    formData.append(key, String(value));
                }
            });
            // 发送请求
            const response = await this.makeRequest('/asr', {
                method: 'POST',
                body: formData,
                signal: abortController.signal
            });
            // 更新进度
            this.updateProgress(taskId, {
                progress: 50,
                status: 'processing',
                message: '正在处理音频...'
            }, onProgress);
            // 解析响应
            const result = utils_1.ResponseUtils.parseTranscribeResponse(response);
            utils_1.ResponseUtils.validateTranscribeResponse(result);
            // 更新进度
            this.updateProgress(taskId, {
                progress: 100,
                status: 'completed',
                message: '转写完成'
            }, onProgress);
            return result;
        }, this.config.retryAttempts, this.config.retryDelay, 'transcribe');
    }
    /**
     * 获取可用模型列表
     */
    async getModels() {
        // 如果有缓存且缓存时间不超过5分钟，直接返回缓存
        if (this.modelsCache && this.lastHealthCheck) {
            const cacheAge = Date.now() - (this.lastHealthCheck.timestamp || 0);
            if (cacheAge < 5 * 60 * 1000) {
                return this.modelsCache;
            }
        }
        try {
            const health = await this.checkHealth();
            this.modelsCache = health.models || [];
            return this.modelsCache;
        }
        catch (error) {
            // 如果健康检查失败，返回空数组
            errors_1.ErrorHandler.logError(error, 'getModels');
            return [];
        }
    }
    /**
     * 检查API健康状态
     */
    async checkHealth() {
        try {
            const response = await this.makeRequest('/health', {
                method: 'GET'
            });
            const health = {
                status: response.status === 'healthy' ? 'healthy' : 'unhealthy',
                version: response.version,
                models: response.models,
                error: response.error,
                timestamp: Date.now()
            };
            this.lastHealthCheck = health;
            this.emit('health:update', health);
            return health;
        }
        catch (error) {
            const health = {
                status: 'unhealthy',
                error: errors_1.ErrorHandler.getUserFriendlyMessage(error),
                timestamp: Date.now()
            };
            this.lastHealthCheck = health;
            this.emit('health:update', health);
            throw error;
        }
    }
    /**
     * 测试API连接
     */
    async testConnection() {
        try {
            const health = await this.checkHealth();
            return health.status === 'healthy';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 取消转写任务
     */
    cancelTranscribe(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }
        // 取消请求
        const abortController = this.abortControllers.get(taskId);
        if (abortController) {
            abortController.abort();
            this.abortControllers.delete(taskId);
        }
        // 更新任务状态
        task.status = 'cancelled';
        task.completedAt = new Date();
        task.progress = {
            progress: 0,
            status: 'error',
            message: '任务已取消'
        };
        this.tasks.set(taskId, task);
        this.emit('transcribe:cancel', taskId);
        return true;
    }
    /**
     * 获取任务状态
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * 获取所有任务
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * 清理已完成的任务
     */
    cleanupTasks() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        for (const [taskId, task] of this.tasks.entries()) {
            if (task.completedAt && (now - task.completedAt.getTime()) > maxAge) {
                this.tasks.delete(taskId);
                this.abortControllers.delete(taskId);
            }
        }
    }
    /**
     * 发送HTTP请求
     */
    async makeRequest(endpoint, options = {}) {
        const url = utils_1.RequestUtils.buildAPIUrl(this.config.baseUrl, endpoint);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw errors_1.ErrorHandler.createAPIError(`HTTP ${response.status}: ${response.statusText}`, response.status);
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            else {
                return await response.text();
            }
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw errors_1.ErrorHandler.createTimeoutError('请求超时');
                }
                else if (error instanceof TypeError) {
                    throw errors_1.ErrorHandler.createNetworkError('网络连接失败');
                }
            }
            throw error;
        }
    }
    /**
     * 更新任务进度
     */
    updateProgress(taskId, progress, onProgress) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.progress = progress;
            this.tasks.set(taskId, task);
        }
        this.emit('transcribe:progress', taskId, progress);
        if (onProgress) {
            onProgress(progress);
        }
    }
    /**
     * 启动健康检查
     */
    startHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        // 每30秒检查一次健康状态
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkHealth();
            }
            catch (error) {
                errors_1.ErrorHandler.logError(error, 'healthCheck');
            }
        }, 30000);
    }
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }
    /**
     * 销毁客户端
     */
    destroy() {
        // 停止健康检查
        this.stopHealthCheck();
        // 取消所有任务
        for (const taskId of this.tasks.keys()) {
            this.cancelTranscribe(taskId);
        }
        // 清理资源
        this.tasks.clear();
        this.abortControllers.clear();
        this.modelsCache = undefined;
        this.lastHealthCheck = undefined;
        // 移除所有事件监听器
        this.removeAllListeners();
    }
    // 事件类型定义
    on(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
}
exports.WhisperAPIClient = WhisperAPIClient;
