import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import * as record from 'node-record-lpcm16';

/**
 * Audio recording configuration interface
 */
interface AudioConfig {
  format: 'wav' | 'mp3';
  sampleRate: number;
  channels: number;
  bitRate: number;
}

/**
 * Default audio recording configuration
 */
const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  format: 'wav',
  sampleRate: 44100,
  channels: 1,
  bitRate: 128000,
};

/**
 * AudioRecorder class handles all audio recording operations
 */
export class AudioRecorder {
  private isRecording: boolean = false;
  private currentRecordingPath: string | null = null;
  private config: AudioConfig;
  private fileStream: fs.WriteStream | null = null;
  private recInstance: any = null;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }

  /**
   * Start recording audio
   * @returns {Promise<string>} Path to the recorded audio file
   */
  async startRecording(): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    const tempDir = path.join(app.getPath('temp'), 'whisper-electron');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.wav`;
    this.currentRecordingPath = path.join(tempDir, filename);

    // Start recording using node-record-lpcm16
    this.fileStream = fs.createWriteStream(this.currentRecordingPath, { encoding: 'binary' });
    this.recInstance = record.record({
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      threshold: 0,
      verbose: false,
      recordProgram: 'sox', // Try 'sox' first, fallback to 'rec' or 'arecord' if needed
      audioType: 'wav',
    });
    this.recInstance
      .stream()
      .on('error', (err: Error) => {
        console.error('Recording error:', err);
      })
      .pipe(this.fileStream);

    this.isRecording = true;

    return this.currentRecordingPath;
  }

  /**
   * Stop the current recording
   * @returns {Promise<string>} Path to the recorded audio file
   */
  async stopRecording(): Promise<string> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    if (!this.currentRecordingPath) {
      throw new Error('No recording path found');
    }
    if (this.recInstance) {
      this.recInstance.stop();
      this.recInstance = null;
    }
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
    this.isRecording = false;
    const recordingPath = this.currentRecordingPath;
    this.currentRecordingPath = null;
    return recordingPath;
  }

  /**
   * Cancel the current recording and delete the temporary file
   */
  async cancelRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }
    if (this.recInstance) {
      this.recInstance.stop();
      this.recInstance = null;
    }
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
    if (this.currentRecordingPath && fs.existsSync(this.currentRecordingPath)) {
      fs.unlinkSync(this.currentRecordingPath);
    }
    this.isRecording = false;
    this.currentRecordingPath = null;
  }

  /**
   * Get the current recording status
   */
  getStatus(): { isRecording: boolean } {
    return {
      isRecording: this.isRecording,
    };
  }

  /**
   * Update the audio recording configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create a singleton instance
let audioRecorder: AudioRecorder | null = null;

/**
 * Initialize the audio recorder
 */
export function initializeAudioRecorder(): void {
  if (!audioRecorder) {
    audioRecorder = new AudioRecorder();
  }
}

/**
 * Setup IPC handlers for audio recording
 */
export function setupAudioIPC(): void {
  if (!audioRecorder) {
    throw new Error('Audio recorder not initialized');
  }

  ipcMain.handle('audio:start', async () => {
    try {
      const recordingPath = await audioRecorder!.startRecording();
      return { success: true, path: recordingPath };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:stop', async () => {
    try {
      const recordingPath = await audioRecorder!.stopRecording();
      return { success: true, path: recordingPath };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:cancel', async () => {
    try {
      await audioRecorder!.cancelRecording();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:getStatus', () => {
    return audioRecorder!.getStatus();
  });

  ipcMain.handle('audio:updateConfig', (_, config: Partial<AudioConfig>) => {
    try {
      audioRecorder!.updateConfig(config);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
} 