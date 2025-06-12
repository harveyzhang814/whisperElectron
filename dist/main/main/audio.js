"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioRecorder = exports.AudioRecorder = void 0;
exports.initializeAudioRecorder = initializeAudioRecorder;
exports.setupAudioIPC = setupAudioIPC;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_2 = require("electron");
const record = __importStar(require("node-record-lpcm16"));
/**
 * Default audio recording configuration
 */
const DEFAULT_AUDIO_CONFIG = {
    format: 'wav',
    sampleRate: 44100,
    channels: 2,
    bitDepth: 16
};
/**
 * AudioRecorder class handles all audio recording operations
 */
class AudioRecorder {
    constructor(config = {}) {
        Object.defineProperty(this, "isRecording", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "currentRecordingPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fileStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "recInstance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    }
    /**
     * Start recording audio
     * @returns {Promise<RecordingResult>} Result of the recording operation
     */
    async startRecording() {
        console.log('AudioRecorder.startRecording() called');
        console.log('Current state:', { isRecording: this.isRecording, currentRecordingPath: this.currentRecordingPath });
        if (this.isRecording) {
            console.log('Recording already in progress');
            return { success: false, error: 'Recording is already in progress' };
        }
        try {
            const tempDir = path.join(electron_2.app.getPath('temp'), 'whisper-electron');
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
                .on('error', (err) => {
                console.error('Recording error:', err);
                this.isRecording = false;
            })
                .pipe(this.fileStream);
            this.isRecording = true;
            console.log('Recording started successfully');
            return { success: true, path: this.currentRecordingPath };
        }
        catch (error) {
            console.error('Error starting recording:', error);
            // 确保在出错时重置状态
            this.isRecording = false;
            this.currentRecordingPath = null;
            if (this.recInstance) {
                try {
                    this.recInstance.stop();
                }
                catch (e) {
                    console.error('Error stopping recording instance after error:', e);
                }
                this.recInstance = null;
            }
            if (this.fileStream) {
                try {
                    this.fileStream.end();
                }
                catch (e) {
                    console.error('Error closing file stream after error:', e);
                }
                this.fileStream = null;
            }
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
    async stopRecording() {
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
            console.log('Recording stopped successfully');
            return { success: true, path: recordingPath };
        }
        catch (error) {
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
    async cancelRecording() {
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
    getStatus() {
        console.log('Getting recording status:', { isRecording: this.isRecording });
        return {
            isRecording: this.isRecording,
        };
    }
    /**
     * Update the audio recording configuration
     * @param config Partial configuration to update
     */
    updateConfig(config) {
        console.log('Updating audio config:', config);
        this.config = { ...this.config, ...config };
    }
}
exports.AudioRecorder = AudioRecorder;
exports.audioRecorder = null;
/**
 * Initialize the audio recorder
 */
function initializeAudioRecorder() {
    if (!exports.audioRecorder) {
        exports.audioRecorder = new AudioRecorder();
    }
}
/**
 * Setup IPC handlers for audio recording
 */
function setupAudioIPC() {
    if (!exports.audioRecorder) {
        throw new Error('Audio recorder not initialized');
    }
    electron_1.ipcMain.handle('audio:start', async () => {
        try {
            if (!exports.audioRecorder) {
                return { success: false, error: 'Audio recorder not initialized' };
            }
            // 开始录音
            const result = await exports.audioRecorder.startRecording();
            console.log('Start recording result:', result);
            return result;
        }
        catch (error) {
            console.error('Error in audio:start handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('audio:stop', async () => {
        try {
            console.log('Stopping recording...');
            if (!exports.audioRecorder) {
                console.error('Audio recorder not initialized');
                return { success: false, error: 'Audio recorder not initialized' };
            }
            // 停止录音
            console.log('Calling audioRecorder.stopRecording()...');
            const result = await exports.audioRecorder.stopRecording();
            console.log('Stop recording result:', result);
            // 获取最新的录音状态
            const status = exports.audioRecorder.getStatus();
            console.log('Current recording status:', status);
            return {
                ...result,
                isRecording: status.isRecording
            };
        }
        catch (error) {
            console.error('Error in audio:stop handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('audio:cancel', async () => {
        try {
            await exports.audioRecorder.cancelRecording();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('audio:getStatus', () => {
        return exports.audioRecorder.getStatus();
    });
    electron_1.ipcMain.handle('audio:updateConfig', (_, config) => {
        try {
            exports.audioRecorder.updateConfig(config);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
    electron_1.ipcMain.handle('audio:deleteFile', async (_, audioPath) => {
        try {
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
                return { success: true };
            }
            return { success: false, error: 'File not found' };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
}
