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

interface TranscribeTask {
  id: string;
  filePath: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: TranscribeProgress;
  result?: WhisperTranscribeResponse;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ElectronAPI {
  // App lifecycle
  onReady: (callback: () => void) => void;
  
  // Shortcut related methods
  getShortcuts: () => Promise<ShortcutConfig[]>;
  updateShortcut: (action: string, config: Partial<ShortcutConfig>) => Promise<void>;
  
  // Recording related methods - 使用新的recording:接口
  startRecording: (taskId?: string) => Promise<RecordingResult>;
  stopRecording: (taskId?: string) => Promise<RecordingResult>;
  cancelRecording: () => Promise<RecordingResult>;
  getCurrentRecordingTask: () => Promise<TaskResult>;
  onRecordingStatus: (callback: (status: { isRecording: boolean }) => void) => void;
  removeRecordingStatusListener: () => void;

  // Tray related methods
  onRecordingStart: (callback: () => void) => void;
  onRecordingStop: (callback: () => void) => void;
  onRecordingCancel: (callback: () => void) => void;
  removeTrayListeners: () => void;
  minimizeToTray: () => Promise<void>;

  // App control methods
  quitApp: () => Promise<void>;

  // Task related methods - 使用新的任务管理系统
  createTask: (title: string) => Promise<TaskResult>;
  updateTask: (id: string, updates: any) => Promise<TaskResult>;
  getAllTasks: () => Promise<TaskResult>;
  deleteTask: (id: string) => Promise<TaskResult>;

  // Task refresh event
  onTaskRefresh: (callback: () => void) => void;

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

  openAudioFile: (audioPath: string) => void;
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

interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: string;
} 