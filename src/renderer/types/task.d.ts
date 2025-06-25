export interface Task {
  id: string;
  type: string;
  state: string;
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
  };
  progress: number;
  error?: string;
  extendedData?: any; // For task-specific extended data
  recordingMetadata?: {
    outputPath?: string;
    [key: string]: any;
  };
} 