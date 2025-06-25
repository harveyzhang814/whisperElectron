import { BaseTask, TaskState } from './task';

/**
 * Recording-specific task states
 */
export enum RecordingState {
  READY = 'READY',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  SAVING = 'SAVING',
  SAVED = 'SAVED',
  FAILED = 'FAILED'
}

/**
 * Recording-specific event types that extend the base TaskEventType
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
 * Recording configuration
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
 * Recording task metadata
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
 * Recording task interface
 */
export interface RecordingTask extends BaseTask {
  type: 'RECORDING';
  recordingState: RecordingState;
  config: RecordingConfig;
  recordingMetadata: RecordingMetadata;
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
 * State mapping between RecordingState and TaskState
 */
export const recordingStateToTaskState: Record<RecordingState, TaskState> = {
  [RecordingState.READY]: TaskState.CREATED,
  [RecordingState.RECORDING]: TaskState.RUNNING,
  [RecordingState.PAUSED]: TaskState.PAUSED,
  [RecordingState.STOPPED]: TaskState.COMPLETED,
  [RecordingState.SAVING]: TaskState.RUNNING,
  [RecordingState.SAVED]: TaskState.COMPLETED,
  [RecordingState.FAILED]: TaskState.FAILED
}; 