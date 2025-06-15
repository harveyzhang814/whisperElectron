import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app, BrowserWindow } from 'electron';
import * as record from 'node-record-lpcm16';
import type { AudioConfig } from '../renderer/types/audio';

/**
 * Default audio recording configuration
 */
const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  format: 'wav',
  sampleRate: 44100,
  channels: 2,
  bitDepth: 16
};

interface RecordingResult {
  success: boolean;
  path?: string;
  error?: string;
}

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
   * @returns {Promise<RecordingResult>} Result of the recording operation
   */
  async startRecording(): Promise<RecordingResult> {
    console.log('AudioRecorder.startRecording() called');
    console.log('Current state:', { isRecording: this.isRecording, currentRecordingPath: this.currentRecordingPath });

    if (this.isRecording) {
      console.log('Recording already in progress');
      return { success: false, error: 'Recording is already in progress' };
    }

    try {
      const tempDir = path.join(app.getPath('temp'), 'whisper-electron');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording-${timestamp}.wav`;
      this.currentRecordingPath = path.join(tempDir, filename);

      console.log('Starting recording to:', this.currentRecordingPath);

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
          this.isRecording = false;
        })
        .pipe(this.fileStream);

      this.isRecording = true;

      // 发送录音状态更新事件
      BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: true });

      console.log('Recording started successfully');

      return { success: true, path: this.currentRecordingPath };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Stop the current recording
   * @returns {Promise<RecordingResult>} Result of the recording operation
   */
  async stopRecording(): Promise<RecordingResult> {
    console.log('AudioRecorder.stopRecording() called');
    console.log('Current state:', { isRecording: this.isRecording, currentRecordingPath: this.currentRecordingPath });

    if (!this.isRecording) {
      console.log('No recording in progress');
      return { success: false, error: 'No recording in progress' };
    }
    if (!this.currentRecordingPath) {
      console.log('No recording path found');
      return { success: false, error: 'No recording path found' };
    }

    try {
      console.log('Stopping recording instance...');
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

      // 发送录音状态更新事件
      BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });

      console.log('Recording stopped successfully');
      return { success: true, path: recordingPath };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel the current recording and delete the temporary file
   */
  async cancelRecording(): Promise<RecordingResult> {
    console.log('AudioRecorder.cancelRecording() called');
    console.log('Current state:', { isRecording: this.isRecording, currentRecordingPath: this.currentRecordingPath });

    if (!this.isRecording) {
      console.log('No recording in progress');
      return { success: false, error: 'No recording in progress' };
    }

    try {
      console.log('Stopping recording instance...');
      if (this.recInstance) {
        this.recInstance.stop();
        this.recInstance = null;
      }
      if (this.fileStream) {
        this.fileStream.end();
        this.fileStream = null;
      }

      // 删除录音文件
      if (this.currentRecordingPath) {
        try {
          fs.unlinkSync(this.currentRecordingPath);
          console.log('Recording file deleted:', this.currentRecordingPath);
        } catch (error) {
          console.error('Error deleting recording file:', error);
        }
      }

      this.isRecording = false;
      this.currentRecordingPath = null;

      // 发送录音状态更新事件
      BrowserWindow.getAllWindows()[0]?.webContents.send('recording:status', { isRecording: false });

      console.log('Recording cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('Error cancelling recording:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get the current recording status
   */
  getStatus(): { isRecording: boolean } {
    console.log('Getting recording status:', { isRecording: this.isRecording });
    return {
      isRecording: this.isRecording,
    };
  }

  /**
   * Update the audio recording configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<AudioConfig>): void {
    console.log('Updating audio config:', config);
    this.config = { ...this.config, ...config };
  }
}

export let audioRecorder: AudioRecorder | null = null;

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
      if (!audioRecorder) {
        return { success: false, error: 'Audio recorder not initialized' };
      }

      // 开始录音
      const result = await audioRecorder.startRecording();
      console.log('Start recording result:', result);
      
      return result;
    } catch (error: unknown) {
      console.error('Error in audio:start handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('audio:stop', async () => {
    try {
      console.log('Stopping recording...');
      
      if (!audioRecorder) {
        console.error('Audio recorder not initialized');
        return { success: false, error: 'Audio recorder not initialized' };
      }

      // 停止录音
      console.log('Calling audioRecorder.stopRecording()...');
      const result = await audioRecorder.stopRecording();
      console.log('Stop recording result:', result);
      
      // 获取最新的录音状态
      const status = audioRecorder.getStatus();
      console.log('Current recording status:', status);
      
      return {
        ...result,
        isRecording: status.isRecording
      };
    } catch (error: unknown) {
      console.error('Error in audio:stop handler:', error);
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

  ipcMain.handle('audio:deleteFile', async (_: unknown, audioPath: string) => {
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
} 