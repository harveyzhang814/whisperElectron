declare module 'node-record-lpcm16' {
  import { ChildProcessWithoutNullStreams } from 'child_process';
  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: string;
    audioType?: string;
  }
  interface Recorder {
    record(options?: RecordOptions): {
      stream(): NodeJS.ReadableStream;
    };
    stop(): void;
  }
  const record: Recorder;
  export = record;
} 