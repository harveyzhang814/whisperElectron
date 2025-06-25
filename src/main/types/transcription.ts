/**
 * This module provides type definitions for transcription stage functionality.
 * These types support the integration of Whisper API transcription features into the unified task management system.
 */

import { StageState } from './task';

/**
 * Transcription-specific stage states for the transcription stage
 */
export enum TranscriptionStageState {
  READY = 'READY',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Transcription stage configuration
 */
export interface TranscriptionConfig {
  defaultModel: string;
  defaultLanguage?: string;
  maxConcurrentTranscriptions: number;
  autoTranscribeRecordings: boolean;
  outputDirectory: string;
  defaultOutputFormat: 'txt' | 'json' | 'srt' | 'vtt';
  defaultTemperature: number;
  enableCaching: boolean;
  cacheDirectory: string;
  maxCacheSize: number;
  enableAutoCleanup: boolean;
  retentionPeriod: number;
  
  // Whisper API specific options
  model?: string;
  language?: string;
  task?: 'transcribe' | 'translate';
  outputFormat?: 'txt' | 'json' | 'srt' | 'vtt';
  temperature?: number;
  bestOf?: number;
  beamSize?: number;
  patience?: number;
  lengthPenalty?: number;
  suppressTokens?: string;
  conditionOnPreviousText?: boolean;
  temperatureIncrementOnFallback?: number;
  compressionRatioThreshold?: number;
  logprobThreshold?: number;
  noSpeechThreshold?: number;
}

/**
 * Transcription metadata for the transcription stage
 */
export interface TranscriptionMetadata {
  audioFileSize?: number;
  audioDuration?: number;
  modelUsed: string;
  processingTime?: number;
  wordCount?: number;
  confidence?: number;
  audioFilePath?: string;
}

/**
 * Transcription result structure
 */
export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

/**
 * Individual transcription segment
 */
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avgLogprob: number;
  compressionRatio: number;
  noSpeechProb: number;
}

/**
 * Transcription progress information
 */
export interface TranscriptionProgress {
  percentage: number;
  currentSegment?: number;
  totalSegments?: number;
  estimatedTimeRemaining?: number;
}

/**
 * Transcription error types
 */
export enum TranscriptionErrorType {
  AUDIO_FILE_NOT_FOUND = 'AUDIO_FILE_NOT_FOUND',
  AUDIO_FORMAT_NOT_SUPPORTED = 'AUDIO_FORMAT_NOT_SUPPORTED',
  WHISPER_API_ERROR = 'WHISPER_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Transcription error information
 */
export interface TranscriptionError {
  type: TranscriptionErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * State mapping between TranscriptionStageState and StageState
 */
export const transcriptionStageStateToStageState: Record<TranscriptionStageState, StageState> = {
  [TranscriptionStageState.READY]: StageState.PENDING,
  [TranscriptionStageState.TRANSCRIBING]: StageState.IN_PROGRESS,
  [TranscriptionStageState.COMPLETED]: StageState.COMPLETED,
  [TranscriptionStageState.FAILED]: StageState.FAILED,
  [TranscriptionStageState.CANCELLED]: StageState.FAILED
};

/**
 * Transcription stage metadata for TaskStageInfo
 */
export interface TranscriptionStageMetadata {
  transcriptionState: TranscriptionStageState;
  config: TranscriptionConfig;
  transcriptionMetadata: TranscriptionMetadata;
  transcriptionResult?: TranscriptionResult;
} 