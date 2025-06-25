interface RecordingResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

interface TaskResult {
  success: boolean;
  task?: any;
  tasks?: any[];
  error?: string;
}

// Whisper 相关类型定义
interface WhisperTranscribeRequest {
  file: string;
  model?: string;
  language?: string;
  output_format?: 'txt' | 'vtt' | 'srt' | 'json';
  word_timestamps?: boolean;
  condition_on_previous_text?: boolean;
  initial_prompt?: string;
  temperature?: number;
  compression_ratio_threshold?: number;
  logprob_threshold?: number;
  no_speech_threshold?: number;
}

interface WhisperTranscribeResponse {
  text: string;
  language?: string;
  language_probability?: number;
  segments?: WhisperSegment[];
  word_timestamps?: WhisperWordTimestamp[];
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

interface WhisperWordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

interface WhisperModel {
  name: string;
  description?: string;
  languages?: string[];
  size?: string;
  available?: boolean;
}

interface WhisperHealthResponse {
  status: 'healthy' | 'unhealthy';
  version?: string;
  models?: WhisperModel[];
  error?: string;
  timestamp?: number;
}

interface TranscribeProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  error?: string;
}

interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: string;
}

// Unified Task Management Interface
interface UnifiedTaskResult {
  success: boolean;
  task?: any;
  tasks?: any[];
  error?: string;
}

interface UnifiedTaskOptions {
  name: string;
  description?: string;
  tags?: string[];
  audioSourceType: 'RECORDING' | 'IMPORT';
  recordingConfig?: {
    deviceId?: string;
    sampleRate?: number;
    channels?: number;
    format?: 'wav' | 'mp3';
    outputDirectory?: string;
  };
  importConfig?: {
    filePath: string;
    outputDirectory?: string;
  };
  transcriptionConfig?: {
    model?: string;
    language?: string;
    outputFormat?: 'txt' | 'json' | 'srt' | 'vtt';
    temperature?: number;
  };
}

interface TranscriptionOptions {
  model?: string;
  language?: string;
  outputFormat?: 'txt' | 'json' | 'srt' | 'vtt';
  temperature?: number;
}

export interface ElectronAPI {
  // App lifecycle
  onReady: (callback: () => void) => void;
  
  // Shortcut related methods
  getShortcuts: () => Promise<ShortcutConfig[]>;
  updateShortcut: (action: string, config: Partial<ShortcutConfig>) => Promise<void>;
  
  // Unified Task Management - 新的统一任务管理接口
  createUnifiedTask: (options: UnifiedTaskOptions) => Promise<UnifiedTaskResult>;
  getUnifiedTask: (taskId: string) => Promise<UnifiedTaskResult>;
  getAllUnifiedTasks: () => Promise<UnifiedTaskResult>;
  updateUnifiedTask: (taskId: string, updates: any) => Promise<UnifiedTaskResult>;
  deleteUnifiedTask: (taskId: string) => Promise<UnifiedTaskResult>;
  
  // Stage Management - 阶段管理接口
  startTaskStage: (taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => Promise<UnifiedTaskResult>;
  stopTaskStage: (taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => Promise<UnifiedTaskResult>;
  cancelTaskStage: (taskId: string, stage: 'AUDIO_SOURCE' | 'TRANSCRIPTION') => Promise<UnifiedTaskResult>;
  
  // Recording Stage Operations - 录音阶段操作
  startRecording: (taskId?: string) => Promise<RecordingResult>;
  stopRecording: (taskId?: string) => Promise<RecordingResult>;
  cancelRecording: (taskId?: string) => Promise<RecordingResult>;
  getCurrentRecordingTask: () => Promise<TaskResult>;
  onRecordingStatus: (callback: (status: { isRecording: boolean }) => void) => void;
  removeRecordingStatusListener: () => void;

  // Transcription Stage Operations - 转录阶段操作
  startTranscription: (taskId: string, options?: TranscriptionOptions) => Promise<UnifiedTaskResult>;
  stopTranscription: (taskId: string) => Promise<UnifiedTaskResult>;
  cancelTranscription: (taskId: string) => Promise<UnifiedTaskResult>;
  getTranscriptionStatus: () => Promise<{ isTranscribing: boolean; activeCount: number; activeTaskIds: string[] }>;
  
  // Import Stage Operations - 导入阶段操作
  importAudioFile: (taskId: string, filePath: string) => Promise<UnifiedTaskResult>;

  // Tray related methods
  onRecordingStart: (callback: () => void) => void;
  onRecordingStop: (callback: () => void) => void;
  onRecordingCancel: (callback: () => void) => void;
  removeTrayListeners: () => void;
  minimizeToTray: () => Promise<void>;

  // App control methods
  quitApp: () => Promise<void>;

  // Task refresh event
  onTaskRefresh: (callback: () => void) => void;
  removeTaskRefreshListener: () => void;

  // Whisper 配置相关方法
  getWhisperConfig: () => Promise<any>;
  updateWhisperConfig: (config: any) => Promise<any>;

  // Whisper 转写相关方法
  whisperTranscribe: (filePath: string, options?: any) => Promise<any>;
  whisperCancel: (jobId: string) => Promise<any>;
  whisperGetJob: (jobId: string) => Promise<any>;
  whisperGetAllJobs: () => Promise<any>;
  whisperGetModels: () => Promise<any>;
  whisperCheckHealth: () => Promise<any>;
  whisperTestConnection: () => Promise<any>;

  // Whisper 事件监听方法
  onWhisperProgress: (callback: (progress: any) => void) => void;
  onWhisperComplete: (callback: (result: any) => void) => void;
  onWhisperError: (callback: (error: any) => void) => void;
  removeWhisperListeners: () => void;

  // File operations
  openAudioFile: (audioPath: string) => void;
  selectAudioFile: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  
  // Transcription 事件监听方法
  onTranscriptionProgress: (callback: (progress: any) => void) => void;
  onTranscriptionComplete: (callback: (result: any) => void) => void;
  onTranscriptionError: (callback: (error: any) => void) => void;
  removeTranscriptionListeners: () => void;
}

interface Window {
  electron: ElectronAPI;
}

interface ShortcutConfig {
  action: string;
  key: string;
  description: string;
  enabled: boolean;
} 