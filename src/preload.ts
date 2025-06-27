import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getHistory: () => ipcRenderer.invoke('get-history'),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  transcribeAudio: (audioBuffer: Buffer) => ipcRenderer.invoke('transcribe-audio', audioBuffer),
  notifyRecordingStarted: () => ipcRenderer.send('ui-recording-started'),
  notifyRecordingStopped: () => ipcRenderer.send('ui-recording-stopped'),
  pasteToFocusedField: (text: string) => ipcRenderer.invoke('paste-to-focused-field', text),
  
  onRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('recording-started', () => callback());
  },
  onRecordingStopped: (callback: () => void) => {
    ipcRenderer.on('recording-stopped', () => callback());
  },
  onStopRendererRecording: (callback: () => void) => {
    ipcRenderer.on('stop-renderer-recording', () => callback());
  },
  onRecordingCancelled: (callback: () => void) => {
    ipcRenderer.on('recording-cancelled', () => callback());
  },
  onTranscribing: (callback: () => void) => {
    ipcRenderer.on('transcribing', () => callback());
  },
  onShortcutRecordingToggled: (callback: (isRecording: boolean) => void) => {
    ipcRenderer.on('shortcut-recording-toggled', (event, isRecording) => callback(isRecording));
  },
  onTranscriptionComplete: (callback: (transcription: any) => void) => {
    ipcRenderer.on('transcription-complete', (event, transcription) => callback(transcription));
  },
  onTranscriptionError: (callback: (error: string) => void) => {
    ipcRenderer.on('transcription-error', (event, error) => callback(error));
  },
  onUpdateWaveform: (callback: (data: any) => void) => {
    ipcRenderer.on('update-waveform', (event, data) => callback(data));
  }
}); 