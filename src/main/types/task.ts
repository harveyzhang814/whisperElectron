/**
 * Unified task types for the new three-stage architecture.
 * Each task has audioSource (recording/import) and transcription stages.
 */

/**
 * Represents the possible states of a unified task
 */
export enum TaskState {
  CREATED = 'CREATED',           // 任务已创建
  RUNNING = 'RUNNING',           // 有阶段正在进行
  PAUSED = 'PAUSED',             // 任务被暂停
  COMPLETED = 'COMPLETED',       // 所有阶段都已完成
  FAILED = 'FAILED',             // 某阶段失败，任务整体失败
  CANCELLED = 'CANCELLED'        // 任务被取消
}

/**
 * Unified task type - all tasks are now of type 'AUDIO_PROCESSING'
 */
export const UNIFIED_TASK_TYPE = 'AUDIO_PROCESSING';

/**
 * Audio source types for the first stage
 */
export enum AudioSourceType {
  RECORDING = 'RECORDING',
  IMPORT = 'IMPORT'
}

/**
 * Stage types for the unified task
 */
export enum TaskStage {
  AUDIO_SOURCE = 'AUDIO_SOURCE',
  TRANSCRIPTION = 'TRANSCRIPTION'
}

/**
 * Stage states for each task stage
 */
export enum StageState {
  PENDING = 'PENDING',       // 阶段待处理
  IN_PROGRESS = 'IN_PROGRESS',// 阶段进行中
  COMPLETED = 'COMPLETED',   // 阶段已完成
  FAILED = 'FAILED',         // 阶段失败
  SKIPPED = 'SKIPPED',       // 阶段被跳过
  CANCELLED = 'CANCELLED'    // 阶段被取消（可重新流转到 IN_PROGRESS）
}

/**
 * Base task event types
 */
export enum TaskEventType {
  STATE_CHANGED = 'STATE_CHANGED',
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  TASK_DELETED = 'TASK_DELETED',
  STAGE_STATE_CHANGED = 'STAGE_STATE_CHANGED',
  STAGE_PROGRESS_UPDATED = 'STAGE_PROGRESS_UPDATED'
}

/**
 * Base task event interface
 */
export interface TaskEvent {
  type: TaskEventType;
  taskId: string;
  timestamp: number;
}

/**
 * State change event
 */
export interface TaskStateChangedEvent extends TaskEvent {
  type: TaskEventType.STATE_CHANGED;
  previousState: TaskState;
  newState: TaskState;
}

/**
 * Progress update event
 */
export interface TaskProgressUpdatedEvent extends TaskEvent {
  type: TaskEventType.PROGRESS_UPDATED;
  progress: number; // 0-100
  detail?: string;
}

/**
 * Error event
 */
export interface TaskErrorEvent extends TaskEvent {
  type: TaskEventType.ERROR_OCCURRED;
  error: Error;
  errorCode?: string;
}

/**
 * Stage state change event
 */
export interface StageStateChangedEvent extends TaskEvent {
  type: TaskEventType.STAGE_STATE_CHANGED;
  stage: TaskStage;
  previousState: StageState;
  newState: StageState;
}

/**
 * Stage progress update event
 */
export interface StageProgressUpdatedEvent extends TaskEvent {
  type: TaskEventType.STAGE_PROGRESS_UPDATED;
  stage: TaskStage;
  progress: number; // 0-100
  detail?: string;
}

/**
 * Base task metadata
 */
export interface TaskMetadata {
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Stage information for each task stage
 */
export interface TaskStageInfo {
  stage: TaskStage;
  state: StageState;
  progress: number; // 0-100
  startTime?: number;
  endTime?: number;
  error?: Error;
  metadata?: any; // Stage-specific metadata
}

/**
 * Audio source stage data
 */
export interface AudioSourceStageData {
  audioSourceType: AudioSourceType;
  audioFilePath?: string;
  fileSize?: number;
  duration?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
  
  // Recording-specific data
  recordingDeviceId?: string;
  recordingDeviceName?: string;
  
  // Import-specific data
  originalFilePath?: string;
  originalFileName?: string;
}

/**
 * Transcription stage data
 */
export interface TranscriptionStageData {
  modelUsed?: string;
  language?: string;
  processingTime?: number;
  wordCount?: number;
  confidence?: number;
  transcriptionResult?: string;
  transcriptionFilePath?: string;
  segments?: any[];
}

/**
 * Unified task interface - replaces all previous task types
 */
export interface UnifiedTask {
  id: string;
  type: typeof UNIFIED_TASK_TYPE;
  state: TaskState;
  metadata: TaskMetadata;
  progress: number; // Overall progress across all stages
  error?: Error;
  
  // Stage information
  stages: {
    [TaskStage.AUDIO_SOURCE]: TaskStageInfo;
    [TaskStage.TRANSCRIPTION]: TaskStageInfo;
  };
  
  // Stage-specific data
  audioSourceData?: AudioSourceStageData;
  transcriptionData?: TranscriptionStageData;
}

/**
 * Task creation options for unified tasks
 */
export interface UnifiedTaskOptions {
  name: string;
  description?: string;
  tags?: string[];
  audioSourceType: AudioSourceType;
  
  // For recording tasks
  recordingConfig?: {
    deviceId?: string;
    sampleRate?: number;
    channels?: number;
    format?: 'wav' | 'mp3';
    outputDirectory?: string;
  };
  
  // For import tasks
  importConfig?: {
    filePath: string;
    outputDirectory?: string;
  };
  
  // Transcription configuration
  transcriptionConfig?: {
    model?: string;
    language?: string;
    outputFormat?: 'txt' | 'json' | 'srt' | 'vtt';
    temperature?: number;
  };
}

/**
 * Task manager configuration
 */
export interface TaskManagerConfig {
  storageDirectory: string;
  maxConcurrentTasks?: number;
  autoCleanupCompleted?: boolean;
  retentionPeriod?: number; // in milliseconds
}

/**
 * Task event handler type
 */
export type TaskEventHandler = (event: TaskEvent) => void;

/**
 * Task filter options
 */
export interface TaskFilterOptions {
  states?: TaskState[];
  audioSourceTypes?: AudioSourceType[];
  stageStates?: { [key in TaskStage]?: StageState };
  tags?: string[];
  fromDate?: number;
  toDate?: number;
}

/**
 * Task sort options
 */
export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'name' | 'state' | 'progress';
  order: 'asc' | 'desc';
} 