/**
 * Docker API Adapter
 * 
 * This module provides an adapter to handle differences between the expected
 * Whisper API format and the actual Docker API implementation.
 */

import { WhisperHealthResponse, WhisperModel } from '../types';

export class DockerAPIAdapter {
  /**
   * 适配健康检查响应
   */
  static adaptHealthResponse(response: any): WhisperHealthResponse {
    // Docker API 返回 {"status":"ok"} 而不是 {"status":"healthy"}
    const status = response.status === 'ok' ? 'healthy' : 'unhealthy';
    
    return {
      status,
      version: response.version,
      models: response.models,
      error: response.error,
      timestamp: Date.now()
    };
  }

  /**
   * 适配模型列表响应
   */
  static adaptModelsResponse(response: any): WhisperModel[] {
    // Docker API 返回字符串数组 ["base","small"] 而不是对象数组
    if (Array.isArray(response)) {
      return response.map((modelName: string) => ({
        name: modelName,
        description: `${modelName} model`,
        available: true
      }));
    }
    
    return [];
  }

  /**
   * 适配转写请求参数
   */
  static adaptTranscribeRequest(params: any): any {
    // 根据 Docker API 的要求调整参数
    const adapted = { ...params };
    
    // 确保 model 参数存在
    if (!adapted.model) {
      adapted.model = 'base';
    }
    
    return adapted;
  }

  /**
   * 适配转写响应
   */
  static adaptTranscribeResponse(response: any): any {
    // 根据实际响应格式调整
    return response;
  }
}
