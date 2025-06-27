declare module 'node-record-lpcm16' {
  interface RecordOptions {
    sampleRateHertz?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: string;
    silence?: string;
  }

  interface Recording {
    stream(): NodeJS.ReadableStream;
    stop(): void;
  }

  function record(options?: RecordOptions): Recording;
  export = record;
}

declare module 'wav' {
  import { Writable } from 'stream';

  interface WavWriterOptions {
    channels: number;
    sampleRate: number;
    bitDepth: number;
  }

  class FileWriter extends Writable {
    constructor(filename: string, options: WavWriterOptions);
  }

  export { FileWriter };
}

// Global type declarations
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<void>;
      getHistory: () => Promise<any[]>;
      deleteHistoryItem: (id: string) => Promise<void>;
      copyToClipboard: (text: string) => Promise<boolean>;
      onRecordingStarted: (callback: () => void) => void;
      onRecordingStopped: (callback: () => void) => void;
      onRecordingCancelled: (callback: () => void) => void;
      onTranscribing: (callback: () => void) => void;
      onTranscriptionComplete: (callback: (transcription: any) => void) => void;
      onTranscriptionError: (callback: (error: string) => void) => void;
      onUpdateWaveform: (callback: (data: any) => void) => void;
    };
  }
} 