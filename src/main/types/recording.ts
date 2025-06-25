import { StageState } from './task';

/**
 * Recording-specific stage states for the audio source stage
 */
export enum RecordingStageState {
  READY = 'READY',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  SAVING = 'SAVING',
  SAVED = 'SAVED',
  FAILED = 'FAILED'
}

/**
 * Recording-specific event types for the audio source stage
 */
export enum RecordingEventType {
  AUDIO_LEVEL_CHANGED = 'AUDIO_LEVEL_CHANGED',
  DEVICE_CHANGED = 'DEVICE_CHANGED',
  FILE_SAVED = 'FILE_SAVED',
  RECORDING_ERROR = 'RECORDING_ERROR'
}

/**
 * Recording device information
 */
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

/**
 * Recording configuration for the audio source stage
 */
export interface RecordingConfig {
  deviceId?: string;
  sampleRate: number;
  channels: number;
  format: 'wav' | 'mp3';
  outputDirectory: string;
  silenceThreshold?: number;
  autoStopOnSilence?: boolean;
  silenceDuration?: number;
}

/**
 * Recording metadata for the audio source stage
 */
export interface RecordingMetadata {
  deviceId: string;
  deviceName: string;
  sampleRate: number;
  channels: number;
  format: string;
  duration: number;
  fileSize?: number;
  outputPath?: string;
}

/**
 * Base interface for recording events
 */
export interface BaseRecordingEvent {
  taskId: string;
  timestamp: number;
}

/**
 * Recording-specific events
 */
export interface AudioLevelChangedEvent extends BaseRecordingEvent {
  type: RecordingEventType.AUDIO_LEVEL_CHANGED;
  level: number; // 0-1
}

export interface DeviceChangedEvent extends BaseRecordingEvent {
  type: RecordingEventType.DEVICE_CHANGED;
  previousDevice: AudioDevice;
  newDevice: AudioDevice;
}

export interface FileSavedEvent extends BaseRecordingEvent {
  type: RecordingEventType.FILE_SAVED;
  filePath: string;
  fileSize: number;
  duration: number;
}

export interface RecordingErrorEvent extends BaseRecordingEvent {
  type: RecordingEventType.RECORDING_ERROR;
  error: Error;
  deviceId?: string;
}

// Union type for all recording events
export type RecordingEvent = 
  | AudioLevelChangedEvent 
  | DeviceChangedEvent 
  | FileSavedEvent 
  | RecordingErrorEvent;

/**
 * State mapping between RecordingStageState and StageState
 */
export const recordingStageStateToStageState: Record<RecordingStageState, StageState> = {
  [RecordingStageState.READY]: StageState.PENDING,
  [RecordingStageState.RECORDING]: StageState.IN_PROGRESS,
  [RecordingStageState.PAUSED]: StageState.IN_PROGRESS,
  [RecordingStageState.STOPPED]: StageState.COMPLETED,
  [RecordingStageState.SAVING]: StageState.IN_PROGRESS,
  [RecordingStageState.SAVED]: StageState.COMPLETED,
  [RecordingStageState.FAILED]: StageState.FAILED
};

/**
 * Recording stage metadata for TaskStageInfo
 */
export interface RecordingStageMetadata {
  recordingState: RecordingStageState;
  config: RecordingConfig;
  recordingMetadata: RecordingMetadata;
} 