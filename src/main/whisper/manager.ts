/**
 * This module provides a centralized Whisper manager for handling all Whisper-related operations,
 * including client management, task handling, and event coordination.
 */

import { EventEmitter } from 'events';
import { WhisperAPIClient } from './client';
import { 
  WhisperTranscribeRequest, 
  TranscriptionJob, 
  WhisperModel, 
  WhisperHealthResponse,
  WhisperAPIClientConfig
} from './types';
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
      retryAttempts: config.retryAttempts || 3
    });

    // Forward all client events
    this.client.on('transcribe:start', (jobId: string, filePath: string) => {
      this.emit('transcribe:start', jobId, filePath);
    });
    
    this.client.on('transcribe:progress', (jobId: string, progress: any) => {
      this.emit('transcribe:progress', jobId, progress);
    });
    
    this.client.on('transcribe:complete', (jobId: string, result: any) => {
      this.emit('transcribe:complete', jobId, result);
    });
    
    this.client.on('transcribe:error', (jobId: string, error: string) => {
      this.emit('transcribe:error', jobId, error);
    });
  }

  public reinitializeClient() {
    this.initializeClient();
  }

  public async transcribe(filePath: string, options: Partial<WhisperTranscribeRequest> = {}, onProgress?: (progress: any) => void): Promise<any> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.transcribe(filePath, options, onProgress);
  }

  public cancelTranscribe(jobId: string): boolean {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.cancelTranscribe(jobId);
  }

  public getTranscriptionJob(jobId: string): TranscriptionJob | null {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    const job = this.client.getTranscriptionJob(jobId);
    return job || null;
  }

  public getAllTranscriptionJobs(): TranscriptionJob[] {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.getAllTranscriptionJobs();
  }

  public async getModels(): Promise<WhisperModel[]> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.getModels();
  }

  public async checkHealth(): Promise<WhisperHealthResponse> {
    if (!this.client) {
      throw new Error('Whisper client not initialized');
    }
    return this.client.checkHealth();
  }

  public async testNewConnection(config: WhisperAPIClientConfig): Promise<{ success: boolean; health?: any; models?: string[]; error?: string }> {
    const tempClient = new WhisperAPIClient({
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3
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
}

// Export a singleton instance
export const whisperManager = new WhisperManager();
