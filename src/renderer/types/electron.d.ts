interface ElectronAPI {
  // Shortcut related methods
  getShortcuts: () => Promise<ShortcutConfig[]>;
  updateShortcut: (action: string, config: Partial<ShortcutConfig>) => Promise<void>;
  
  // Audio recording related methods
  startRecording: () => Promise<{ success: boolean; path?: string; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; path?: string; error?: string }>;
  cancelRecording: () => Promise<{ success: boolean; error?: string }>;
  getRecordingStatus: () => Promise<{ isRecording: boolean }>;
  updateAudioConfig: (config: Partial<AudioConfig>) => Promise<{ success: boolean; error?: string }>;

  // App control methods
  quitApp: () => Promise<void>;
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
  format: 'wav' | 'mp3';
  sampleRate: number;
  channels: number;
  bitRate: number;
} 