/**
 * This module provides a centralized Whisper manager for handling all Whisper-related operations,
 * including client management, task handling, and event coordination.
 */

import { EventEmitter } from 'events';
import { WhisperAPIClient } from './client';
import { WhisperTranscribeRequest, TranscribeTask, WhisperModel, WhisperHealthResponse } from './types';
import { configManager } from '../config';

class WhisperManager extends EventEmitter {
  private client: WhisperAPIClient | null = null;

  constructor() {
    super();
    this.initializeClient();
  }

  private initializeClient() {
    if (this.client) {
      this.client.destroy();
    }

    const config = configManager.getConfigSection('whisper');
    this.client = new WhisperAPIClient({
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      timeout: config.timeout || 30000,
      retryAttempts: config.retries || 3
    });

    // Forward all client events
    this.client.on('transcribe:start', (taskId: string, filePath: string) => {
      this.emit('transcribe:start', taskId, filePath);
    });
    
    this.client.on('transcribe:progress', (taskId: string, progress: any) => {
      this.emit('transcribe:progress', taskId, progress);
    });
    
    this.client.on('transcribe:complete', (taskId: string, result: any) => {
      this.emit('transcribe:complete', taskId, result);
    });
    
    this.client.on('transcribe:error', (taskId: string, error: string) => {
      this.emit('transcribe:error', taskId, error);
    });
  }

  public async transcribe(filePath: string, options: Partial<WhisperTranscribeRequest> = {}, onProgress?: (progress: any) => void): Promise<any> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.transcribe(filePath, options, onProgress);
  }

  public cancelTranscribe(taskId: string): boolean {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.cancelTranscribe(taskId);
  }

  public getTask(taskId: string): TranscribeTask | null {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    const task = this.client.getTask(taskId);
    return task || null;
  }

  public getAllTasks(): TranscribeTask[] {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.getAllTasks();
  }

  public async getModels(): Promise<{ name: string }[]> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.getModels();
  }

  public async checkHealth(): Promise<any> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.checkHealth();
  }

  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.testConnection();
  }

  public async testNewConnection(config: any): Promise<{ success: boolean; health?: any; models?: string[]; error?: string }> {
    const tempClient = new WhisperAPIClient({
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      timeout: config.timeout || 30000,
      retryAttempts: config.retries || 3
    });
    
    try {
      const health = await tempClient.checkHealth();
      const models = await tempClient.getModels();
      tempClient.destroy();
      return { 
        success: true, 
        health,
        models: models.map(m => m.name)
      };
    } catch (error) {
      tempClient.destroy();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public reinitializeClient() {
    this.initializeClient();
  }
}

// Export singleton instance
export const whisperManager = new WhisperManager();
