/**
 * This module provides the main WhisperAPIClient class for interacting with the Whisper Docker API,
 * including transcription, model management, and health checking functionality.
 */

import { EventEmitter } from 'events';
import FormData from 'form-data';
import { readFileSync } from 'fs';
import { 
  WhisperTranscribeRequest,
  WhisperTranscribeResponse,
  WhisperModel,
  WhisperHealthResponse,
  TranscribeProgress,
  TranscribeTask,
  WhisperAPIClientConfig,
  WhisperAPIEvents
} from './types';
import { 
  ErrorHandler, 
  RetryHandler,
  CancellationError
} from './errors';
import { 
  FileUtils, 
  ConfigUtils, 
  RequestUtils, 
  ResponseUtils,
  GeneralUtils 
} from './utils';
const path = require('path');

/**
 * Whisper API 客户端主类
 * 提供与 Whisper Docker API 的完整交互功能
 */
export class WhisperAPIClient extends EventEmitter {
  private config: WhisperAPIClientConfig;
  private tasks: Map<string, TranscribeTask> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private modelsCache?: WhisperModel[];
  private lastHealthCheck?: WhisperHealthResponse;

  constructor(config: Partial<WhisperAPIClientConfig> = {}) {
    super();
    
    // 合并默认配置和用户配置
    this.config = ConfigUtils.mergeConfig(
      ConfigUtils.getDefaultConfig(),
      config
    );
    
    // 验证配置
    ConfigUtils.validateAPIConfig(this.config);
    
    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 获取当前配置
   */
  getConfig(): WhisperAPIClientConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<WhisperAPIClientConfig>): void {
    const mergedConfig = ConfigUtils.mergeConfig(this.config, newConfig);
    ConfigUtils.validateAPIConfig(mergedConfig);
    
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
  async transcribe(
    filePath: string,
    options: Partial<WhisperTranscribeRequest> = {},
    onProgress?: (progress: TranscribeProgress) => void
  ): Promise<WhisperTranscribeResponse> {
    const taskId = GeneralUtils.generateId();
    
    try {
      // 验证文件
      FileUtils.validateAudioFile(filePath);
      
      // 创建任务
      const task: TranscribeTask = {
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
      const requestParams = RequestUtils.buildTranscribeRequest(
        filePath,
        this.config,
        options
      );
      
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
      
    } catch (error) {
      // 处理错误
      const errorMessage = ErrorHandler.getUserFriendlyMessage(error as Error);
      
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
    } finally {
      // 清理资源
      this.abortControllers.delete(taskId);
    }
  }

  /**
   * 执行转写请求
   */
  private async executeTranscribe(
    taskId: string,
    requestParams: WhisperTranscribeRequest,
    onProgress?: (progress: TranscribeProgress) => void
  ): Promise<WhisperTranscribeResponse> {
    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);
    
    return RetryHandler.withRetry(
      async () => {
        // 检查是否被取消
        if (abortController.signal.aborted) {
          throw new CancellationError('转写任务已取消');
        }
        
        // 更新进度
        this.updateProgress(taskId, {
          progress: 10,
          status: 'uploading',
          message: '正在上传文件...'
        }, onProgress);
        
        // 创建表单数据
        const formData = new FormData();
        const fileBuffer = readFileSync(requestParams.file);
        formData.append('audio_file', fileBuffer, path.basename(requestParams.file));
        if (requestParams.model) {
          formData.append('model', String(requestParams.model));
        }
        
        // 发送请求（用formData.submit直连API，兼容curl行为）
        const response = await this.makeRequest('/transcribe', {
          method: 'POST',
          body: formData as any,
          signal: abortController.signal
        });
        
        // 更新进度
        this.updateProgress(taskId, {
          progress: 50,
          status: 'processing',
          message: '正在处理音频...'
        }, onProgress);
        
        // 解析响应
        const result = ResponseUtils.parseTranscribeResponse(response);
        ResponseUtils.validateTranscribeResponse(result);
        
        // 更新进度
        this.updateProgress(taskId, {
          progress: 100,
          status: 'completed',
          message: '转写完成'
        }, onProgress);
        
        return result;
      },
      this.config.retryAttempts,
      this.config.retryDelay,
      'transcribe'
    );
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<WhisperModel[]> {
    // 如果有缓存且缓存时间不超过5分钟，直接返回缓存
    if (this.modelsCache && this.lastHealthCheck) {
      const cacheAge = Date.now() - (this.lastHealthCheck.timestamp || 0);
      if (cacheAge < 5 * 60 * 1000) {
        return this.modelsCache;
      }
    }
    
    try {
      // 直接调用模型端点
      const response = await this.makeRequest('/models', {
        method: 'GET'
      });
      
      // 适配用户的API格式：["base","small"]
      const models: WhisperModel[] = Array.isArray(response) 
        ? response.map(name => ({ name, description: `Whisper ${name} model` }))
        : [];
      
      this.modelsCache = models;
      return models;
    } catch (error) {
      // 如果直接获取模型失败，尝试通过健康检查获取
      try {
        const health = await this.checkHealth();
        this.modelsCache = health.models || [];
        return this.modelsCache;
      } catch (healthError) {
        // 如果健康检查也失败，返回空数组
        ErrorHandler.logError(error as Error, 'getModels');
        return [];
      }
    }
  }

  /**
   * 检查API健康状态
   */
  async checkHealth(): Promise<WhisperHealthResponse> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET'
      });
      
      // 适配用户的API格式：{"status":"ok"}
      const health: WhisperHealthResponse = {
        status: response.status === 'ok' ? 'healthy' : 'unhealthy',
        version: response.version,
        models: response.models,
        error: response.error,
        timestamp: Date.now()
      };
      
      this.lastHealthCheck = health;
      
      this.emit('health:update', health);
      return health;
      
    } catch (error) {
      const health: WhisperHealthResponse = {
        status: 'unhealthy',
        error: ErrorHandler.getUserFriendlyMessage(error as Error),
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
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * 取消转写任务
   */
  cancelTranscribe(taskId: string): boolean {
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
  getTask(taskId: string): TranscribeTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TranscribeTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理已完成的任务
   */
  cleanupTasks(): void {
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
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = RequestUtils.buildAPIUrl(this.config.baseUrl, endpoint);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      // 统一使用form-data submit方法，保持一致性
      if (options.body && typeof options.body === 'object' && 'getHeaders' in options.body) {
        // 用Promise包装formData.submit
        const submitResult = await new Promise<any>((resolve, reject) => {
          const urlObj = new URL(this.config.baseUrl);
          (options.body as any).submit({
            host: urlObj.hostname,
            port: Number(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80),
            path: endpoint,
            method: options.method || 'GET',
            headers: (options.body as any).getHeaders(),
          }, (err: any, res: any) => {
            if (err) return reject(err);
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => {
              try {
                const contentType = res.headers['content-type'];
                if (contentType && contentType.includes('application/json')) {
                  resolve(JSON.parse(data));
                } else {
                  resolve(data);
                }
              } catch (e) {
                reject(new Error('API响应解析失败: ' + data));
              }
            });
          });
        });
        clearTimeout(timeoutId);
        return submitResult;
      }
      
      // 对于非FormData请求，仍使用fetch
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw ErrorHandler.createAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw ErrorHandler.createTimeoutError('请求超时');
        } else if (error instanceof TypeError) {
          throw ErrorHandler.createNetworkError('网络连接失败');
        }
      }
      throw error;
    }
  }

  /**
   * 更新任务进度
   */
  private updateProgress(
    taskId: string,
    progress: TranscribeProgress,
    onProgress?: (progress: TranscribeProgress) => void
  ): void {
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
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // 每30秒检查一次健康状态
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        ErrorHandler.logError(error as Error, 'healthCheck');
      }
    }, 30000);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
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
  on<K extends keyof WhisperAPIEvents>(event: K, listener: WhisperAPIEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof WhisperAPIEvents>(event: K, ...args: Parameters<WhisperAPIEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
} 