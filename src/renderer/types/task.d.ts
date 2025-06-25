export interface Task {
  id: string;
  type: string; // Always 'AUDIO_PROCESSING' for unified tasks
  state: string;
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
  };
  progress: number; // Overall progress across all stages
  error?: string;
  
  // Stage information
  stages: {
    AUDIO_SOURCE: {
      stage: string;
      state: string;
      progress: number;
      startTime?: number;
      endTime?: number;
      error?: string;
      metadata?: any;
    };
    TRANSCRIPTION: {
      stage: string;
      state: string;
      progress: number;
      startTime?: number;
      endTime?: number;
      error?: string;
      metadata?: any;
    };
  };
  
  // Stage-specific data
  audioSourceData?: {
    audioSourceType: string; // 'RECORDING' or 'IMPORT'
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
  };
  
  transcriptionData?: {
    modelUsed?: string;
    language?: string;
    processingTime?: number;
    wordCount?: number;
    confidence?: number;
    transcriptionResult?: string;
    transcriptionFilePath?: string;
    segments?: any[];
  };
}

export interface TaskCreationOptions {
  name: string;
  description?: string;
  tags?: string[];
  audioSourceType: 'RECORDING' | 'IMPORT';
  
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

// Stage states for UI display
export type StageState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// Audio source types
export type AudioSourceType = 'RECORDING' | 'IMPORT';

// Task stage types
export type TaskStage = 'AUDIO_SOURCE' | 'TRANSCRIPTION'; 