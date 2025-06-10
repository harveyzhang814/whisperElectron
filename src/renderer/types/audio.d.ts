export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: 'wav' | 'mp3';
}

export interface AudioRecorder {
  startRecording: () => Promise<{ success: boolean; path?: string; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; path?: string; error?: string }>;
  cancelRecording: () => Promise<{ success: boolean; error?: string }>;
  updateAudioConfig: (config: Partial<AudioConfig>) => Promise<{ success: boolean; error?: string }>;
} 