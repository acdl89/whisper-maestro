import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getCurrentShortcut: () => ipcRenderer.invoke('get-current-shortcut'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getHistory: () => ipcRenderer.invoke('get-history'),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  transcribeAudio: (audioRequest: { audioData: Buffer, mimeType: string, mode?: string }) => ipcRenderer.invoke('transcribe-audio', audioRequest),
  notifyRecordingStarted: () => ipcRenderer.send('ui-recording-started'),
  notifyRecordingStopped: () => ipcRenderer.send('ui-recording-stopped'),
  cancelRecording: () => ipcRenderer.invoke('cancel-recording'),
  closeWindow: () => ipcRenderer.send('close-window'),

  openSettings: () => ipcRenderer.send('open-settings'),
  openHistory: () => ipcRenderer.send('open-history'),
  
  // Mode management methods
  getModeSettings: () => ipcRenderer.invoke('get-mode-settings'),
  saveModeSettings: (modeSettings: any) => ipcRenderer.invoke('save-mode-settings', modeSettings),
  getAvailableModes: () => ipcRenderer.invoke('get-available-modes'),
  
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
  onTransforming: (callback: (mode: string) => void) => {
    ipcRenderer.on('transforming', (event, mode) => callback(mode));
  },
  onTransformationError: (callback: (error: string) => void) => {
    ipcRenderer.on('transformation-error', (event, error) => callback(error));
  },
  onShortcutRecordingToggled: (callback: (isRecording: boolean) => void) => {
    ipcRenderer.on('shortcut-recording-toggled', (event, isRecording) => callback(isRecording));
  },
  onSetRecordingMode: (callback: (mode: string) => void) => {
    ipcRenderer.on('set-recording-mode', (event, mode) => callback(mode));
  },
  onTranscriptionComplete: (callback: (transcription: any) => void) => {
    ipcRenderer.on('transcription-complete', (event, transcription) => callback(transcription));
  },
  onTranscriptionError: (callback: (error: string) => void) => {
    ipcRenderer.on('transcription-error', (event, error) => callback(error));
  },
  onShowTranscriptInWindow: (callback: () => void) => {
    ipcRenderer.on('show-transcript-in-window', () => callback());
  },
  onShowSettings: (callback: () => void) => {
    ipcRenderer.on('show-settings', () => callback());
  },
  onShowHistory: (callback: () => void) => {
    ipcRenderer.on('show-history', () => callback());
  },
  onTranscriptionSet: (callback: (transcription: any) => void) => {
    ipcRenderer.on('set-transcription', (event, transcription) => callback(transcription));
  },
  onTranscriptionUpdate: (callback: (transcription: any) => void) => {
    ipcRenderer.on('update-transcription', (event, transcription) => callback(transcription));
  },
  onSettingsUpdated: (callback: (settings: any) => void) => {
    ipcRenderer.on('settings-updated', (event, settings) => callback(settings));
  },

  // Onboarding methods
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  
  // Debug methods for production logging
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  getRecentLogs: (lines?: number) => ipcRenderer.invoke('get-recent-logs', lines),
  
  // System permissions check
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  checkAccessibilityPermission: () => ipcRenderer.invoke('check-accessibility-permission'),
  requestAccessibilityPermission: () => ipcRenderer.invoke('request-accessibility-permission'),

  // Auto-updater methods
  checkForUpdates: (options?: { manual?: boolean }) => ipcRenderer.invoke('check-for-updates', options),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdaterEvent: (callback: (event: string, data?: any) => void) => {
    ipcRenderer.on('updater-event', (ipcEvent, { event, data }) => callback(event, data));
  },

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
}); 