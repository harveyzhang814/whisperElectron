interface RecordingResult {
  success: boolean;
  path?: string;
  error?: string;
  isRecording?: boolean;
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