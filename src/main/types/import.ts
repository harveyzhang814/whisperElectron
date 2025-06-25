/**
 * This module provides type definitions for audio file import functionality.
 * These types support importing existing audio files as an alternative to recording.
 */

import { StageState } from './task';

/**
 * Import-specific stage states for the audio source stage
 */
export enum ImportStageState {
  READY = 'READY',
  VALIDATING = 'VALIDATING',
  COPYING = 'COPYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Import configuration for the audio source stage
 */
export interface ImportConfig {
  sourceFilePath: string;
  outputDirectory: string;
  preserveOriginal: boolean;
  validateAudio: boolean;
  allowedFormats: string[];
  maxFileSize: number; // in bytes
}

/**
 * Import metadata for the audio source stage
 */
export interface ImportMetadata {
  originalFilePath: string;
  originalFileName: string;
  originalFileSize: number;
  originalFormat: string;
  copiedFilePath?: string;
  copiedFileSize?: number;
  validationResult?: AudioValidationResult;
}

/**
 * Audio file validation result
 */
export interface AudioValidationResult {
  isValid: boolean;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  bitrate?: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Import progress information
 */
export interface ImportProgress {
  percentage: number;
  currentStep: 'validating' | 'copying' | 'completed';
  detail?: string;
}

/**
 * Import error types
 */
export enum ImportErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  INVALID_AUDIO = 'INVALID_AUDIO',
  COPY_FAILED = 'COPY_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Import error information
 */
export interface ImportError {
  type: ImportErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * State mapping between ImportStageState and StageState
 */
export const importStageStateToStageState: Record<ImportStageState, StageState> = {
  [ImportStageState.READY]: StageState.PENDING,
  [ImportStageState.VALIDATING]: StageState.IN_PROGRESS,
  [ImportStageState.COPYING]: StageState.IN_PROGRESS,
  [ImportStageState.COMPLETED]: StageState.COMPLETED,
  [ImportStageState.FAILED]: StageState.FAILED
};

/**
 * Import stage metadata for TaskStageInfo
 */
export interface ImportStageMetadata {
  importState: ImportStageState;
  config: ImportConfig;
  importMetadata: ImportMetadata;
}

/**
 * Supported audio file formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'aiff'
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

/**
 * File picker options for audio import
 */
export interface AudioFilePickerOptions {
  title?: string;
  filters?: {
    name: string;
    extensions: string[];
  }[];
  defaultPath?: string;
  properties?: ('openFile' | 'multiSelections')[];
} 