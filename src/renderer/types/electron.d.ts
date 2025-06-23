interface RecordingResult {
  success: boolean;
  path?: string;
  error?: string;
  isRecording?: boolean;
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

interface ElectronAPI {
  // App lifecycle
  onReady: (callback: () => void) => void;
  
  // Shortcut related methods
  getShortcuts: () => Promise<ShortcutConfig[]>;
  updateShortcut: (action: string, config: Partial<ShortcutConfig>) => Promise<void>;
  
  // Audio recording related methods
  startRecording: () => Promise<RecordingResult>;
  stopRecording: () => Promise<RecordingResult>;
  cancelRecording: () => Promise<{ success: boolean; error?: string }>;
  getRecordingStatus: () => Promise<{ isRecording: boolean }>;
  updateAudioConfig: (config: Partial<AudioConfig>) => Promise<{ success: boolean; error?: string }>;
  deleteAudioFile: (audioPath: string) => Promise<{ success: boolean; error?: string }>;
  getCurrentRecordingTask: () => Promise<Task | null>;
  onRecordingStatus: (callback: (status: { isRecording: boolean }) => void) => void;
  removeRecordingStatusListener: () => void;
  sendRecordingStatus: (status: { isRecording: boolean }) => void;

  // Tray related methods
  onRecordingStart: (callback: () => void) => void;
  onRecordingStop: (callback: () => void) => void;
  onRecordingCancel: (callback: () => void) => void;
  removeTrayListeners: () => void;
  minimizeToTray: () => Promise<void>;

  // App control methods
  quitApp: () => Promise<void>;

  // Task related methods
  createTask: (title: string, status: string) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ success: boolean }>;
  getAllTasks: () => Promise<Task[]>;
  deleteTask: (id: string) => Promise<{ success: boolean }>;
  openAudioFile: (audioPath: string) => Promise<{ success: boolean }>;

  // Task refresh event
  onTaskRefresh: (callback: () => void) => void;

  // Whisper 配置相关方法
  getWhisperConfig: () => Promise<any>;
  updateWhisperConfig: (config: any) => Promise<any>;

  // Whisper 转写相关方法
  whisperTranscribe: (filePath: string, options?: Partial<WhisperTranscribeRequest>) => Promise<{ success: boolean; result?: WhisperTranscribeResponse; error?: string }>;
  whisperCancel: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  whisperGetTask: (taskId: string) => Promise<{ success: boolean; task?: TranscribeTask; error?: string }>;
  whisperGetAllTasks: () => Promise<{ success: boolean; tasks?: TranscribeTask[]; error?: string }>;
  whisperGetModels: () => Promise<{ success: boolean; models?: WhisperModel[]; error?: string }>;
  whisperCheckHealth: () => Promise<{ success: boolean; health?: WhisperHealthResponse; error?: string }>;
  whisperTestConnection: () => Promise<{ success: boolean; error?: string }>;

  // Whisper 事件监听方法
  onWhisperProgress: (callback: (progress: TranscribeProgress) => void) => void;
  onWhisperComplete: (callback: (result: WhisperTranscribeResponse) => void) => void;
  onWhisperError: (callback: (error: string) => void) => void;
  removeWhisperListeners: () => void;
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