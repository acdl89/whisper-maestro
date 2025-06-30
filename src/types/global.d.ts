// Global type declarations
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<any>;
      getCurrentShortcut: () => Promise<string>;
      saveSettings: (settings: any) => Promise<void>;
      getHistory: () => Promise<any[]>;
      deleteHistoryItem: (id: string) => Promise<void>;
      copyToClipboard: (text: string) => Promise<boolean>;
      transcribeAudio: (audioRequest: { audioData: Uint8Array, mimeType: string }) => Promise<any>;
      onRecordingStarted: (callback: () => void) => void;
      onRecordingStopped: (callback: () => void) => void;
      onRecordingCancelled: (callback: () => void) => void;
      onTranscribing: (callback: () => void) => void;
      onTranscriptionComplete: (callback: (transcription: any) => void) => void;
      onTranscriptionError: (callback: (error: string) => void) => void;
      onShowSettings: (callback: () => void) => void;
      onShowHistory: (callback: () => void) => void;
      onSettingsUpdated: (callback: (settings: any) => void) => void;
    };
  }
} 