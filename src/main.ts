import { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import { AudioRecorder } from './audio/audioRecorder';
import { TranscriptionService } from './services/transcriptionService';
import { SettingsManager } from './utils/settingsManager';
import { HistoryManager } from './utils/historyManager';

class WhisperMaestroApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private audioRecorder: AudioRecorder;
  private transcriptionService: TranscriptionService;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;
  private isRecording = false;
  private hadFocusedTextFieldOnStart = false;

  constructor() {
    this.audioRecorder = new AudioRecorder();
    this.transcriptionService = new TranscriptionService();
    this.settingsManager = new SettingsManager();
    this.historyManager = new HistoryManager();
  }

  async initialize() {
    await app.whenReady();
    
    console.log('Initializing app - showing main window');
    
    this.setupTray();
    this.setupGlobalShortcuts();
    this.setupIpcHandlers();
    
    this.showMainWindow();
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Show window when clicking the Dock icon (macOS)
    app.on('activate', () => {
      this.showMainWindow();
    });
  }

  private setupTray() {
    try {
      const iconPath = path.join(__dirname, '../assets/icon.png');
      const fs = require('fs');
      
      // Check if icon file exists
      if (!fs.existsSync(iconPath)) {
        console.log('Icon file not found, skipping tray setup');
        return;
      }
      
      this.tray = new Tray(iconPath);
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Whisper Maestro',
          click: () => {
            console.log('Tray menu: Show Whisper Maestro clicked');
            this.showMainWindow();
          }
        },
        {
          label: 'Settings',
          click: () => {
            console.log('Tray menu: Settings clicked');
            this.showSettings();
          }
        },
        {
          label: 'History',
          click: () => {
            console.log('Tray menu: History clicked');
            this.showHistory();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            console.log('Tray menu: Quit clicked');
            app.quit();
          }
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('Whisper Maestro - Click to show window');
      
      // Handle tray click events
      this.tray.on('click', () => {
        console.log('Tray clicked - showing main window');
        this.showMainWindow();
      });
      
      this.tray.on('double-click', () => {
        console.log('Tray double-clicked - showing main window');
        this.showMainWindow();
      });
      
      console.log('Tray setup complete');
    } catch (error) {
      console.log('Failed to setup tray:', error instanceof Error ? error.message : String(error));
    }
  }

  private setupGlobalShortcuts() {
    // Register Cmd+, shortcut to toggle recording
    const ret = globalShortcut.register('CommandOrControl+,', () => {
      console.log('🎹 Shortcut triggered: Cmd+,');
      this.toggleRecording();
    });

    if (ret) {
      console.log('✅ Global shortcut registered: Cmd+,');
    } else {
      console.log('❌ Failed to register global shortcut');
    }
  }

  private toggleRecording() {
    console.log('🎹 Recording shortcut triggered: Cmd+,');
    console.log('🔄 Toggle recording called, current state:', this.isRecording);
    
    if (this.isRecording) {
      console.log('🔄 Stopping recording via shortcut');
      this.stopRecording();
    } else {
      console.log('🔄 Starting recording via shortcut');
      // Check focus immediately and synchronously - use a separate method
      this.startRecordingWithFocusCheck();
    }
    
    // Notify the renderer about the shortcut-triggered recording change
    if (this.mainWindow) {
      console.log('📡 Sending shortcut-triggered recording state to renderer');
      console.log('📡 Window exists:', !!this.mainWindow);
      console.log('📡 Window destroyed:', this.mainWindow.isDestroyed());
      console.log('📡 Window visible:', this.mainWindow.isVisible());
      this.mainWindow.webContents.send('shortcut-recording-toggled', this.isRecording);
    } else {
      console.log('⚠️ Cannot send shortcut event - no main window');
    }
  }

  private async checkAndStartRecording() {
    // Check if there's a focused text field BEFORE starting recording
    this.hadFocusedTextFieldOnStart = false;
    
    try {
      if (process.platform === 'darwin') {
        console.log('🔍 Checking for focused text field before recording...');
        const { exec } = require('child_process');
        const checkResult = await new Promise<string>((resolve, reject) => {
          exec('osascript -e "tell application \\"System Events\\" to get focused of text field 1 of window 1 of (first application process whose frontmost is true)"', (error: any, stdout: any, stderr: any) => {
            if (error) {
              // No focused text field found
              resolve('false');
            } else {
              resolve(stdout.trim());
            }
          });
        });
        this.hadFocusedTextFieldOnStart = checkResult === 'true';
        console.log('📝 Had focused text field on start:', this.hadFocusedTextFieldOnStart);
      }
    } catch (error) {
      console.log('⚠️ Could not check text field focus, assuming no focus');
      this.hadFocusedTextFieldOnStart = false;
    }

    // Start recording - show window only if no text field was focused
    if (this.hadFocusedTextFieldOnStart) {
      console.log('🎯 Text field was focused - starting recording without showing window');
    } else {
      console.log('🪟 No text field focused - showing window for recording feedback');
      if (this.mainWindow) {
        this.showMainWindow();
      }
    }
    
    this.startRecording();
  }

  private startRecordingWithFocusCheck() {
    // For shortcut-triggered recording, assume there might be a text field focused
    // We'll determine this after transcription based on whether paste works
    console.log('🎯 Starting recording via shortcut - will check focus after transcription');
    this.hadFocusedTextFieldOnStart = true; // Assume focus until proven otherwise
    
    // Show window for visual feedback but without stealing focus
    if (this.mainWindow) {
      if (this.mainWindow.isDestroyed()) {
        console.log('🪟 Creating new window for recording feedback');
        this.showMainWindow();
      } else {
        console.log('🪟 Showing window for recording feedback (without stealing focus)');
        this.mainWindow.showInactive(); // Show without stealing focus
      }
    }
    
    this.startRecording();
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-settings', () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle('save-settings', (event, settings) => {
      return this.settingsManager.saveSettings(settings);
    });

    ipcMain.handle('save-api-key', async (event, apiKey) => {
      await this.settingsManager.saveApiKey(apiKey);
      return true;
    });

    ipcMain.handle('get-history', () => {
      return this.historyManager.getHistory();
    });

    ipcMain.handle('delete-history-item', (event, id) => {
      return this.historyManager.deleteItem(id);
    });

    ipcMain.handle('copy-to-clipboard', (event, text) => {
      require('electron').clipboard.writeText(text);
      return true;
    });

    ipcMain.handle('paste-to-focused-field', async (event, text) => {
      // Copy the text to clipboard
      require('electron').clipboard.writeText(text);
      
      // Wait a brief moment for clipboard to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If a text field was focused, hide our window so the target app stays frontmost for auto-paste
      if (this.hadFocusedTextFieldOnStart) {
        if (this.mainWindow && this.mainWindow.isVisible()) {
          console.log('🫥 Hiding window to preserve focus for auto-paste');
          this.mainWindow.hide();
          // Wait a moment for window to hide
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Use the stored state from when recording started
      console.log('📝 Using stored text field focus state:', this.hadFocusedTextFieldOnStart);

      if (this.hadFocusedTextFieldOnStart) {
        // Try to paste since there's a focused text field
        try {
          if (process.platform === 'darwin') {
            console.log('🍎 Attempting to paste using AppleScript...');
            const { exec } = require('child_process');
            await new Promise<void>((resolve, reject) => {
              exec('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"', (error: any, stdout: any, stderr: any) => {
                if (error) {
                  console.error('❌ AppleScript error:', error);
                  console.error('❌ AppleScript stderr:', stderr);
                  reject(error);
                } else {
                  console.log('✅ AppleScript executed successfully');
                  console.log('📄 AppleScript stdout:', stdout);
                  resolve();
                }
              });
            });
          } else {
            // For other platforms, we could use robotjs or similar
            console.log('Auto-paste not implemented for this platform yet');
          }
          
          // Hide the window after successful paste
          setTimeout(() => {
            if (this.mainWindow && this.mainWindow.isVisible()) {
              console.log('🫥 Hiding window after successful auto-paste');
              this.mainWindow.hide();
            }
          }, 500);
          
        } catch (error) {
          console.error('❌ Failed to simulate paste:', error);
          console.error('❌ Error details:', error);
          // If paste failed, show the window with transcript
          console.log('📺 Paste failed, showing window with transcript');
          if (this.mainWindow) {
            this.showMainWindow();
            // Send event to show transcription page
            this.mainWindow.webContents.send('show-transcript-in-window');
          }
        }
      } else {
        // No text field to paste to, show the window with the transcript
        console.log('📺 No focused text field found, showing window with transcript');
        if (this.mainWindow) {
          this.showMainWindow();
          // Send event to show transcription page
          this.mainWindow.webContents.send('show-transcript-in-window');
        }
      }
      
      return true;
    });

    ipcMain.handle('transcribe-audio', async (event, audioData) => {
      console.log('🎵 Received audio data for transcription, type:', typeof audioData, 'length:', audioData.length, 'bytes');
      
      // Convert Uint8Array to Buffer if needed
      let audioBuffer: Buffer;
      if (audioData instanceof Uint8Array) {
        audioBuffer = Buffer.from(audioData);
        console.log('🔄 Converted Uint8Array to Buffer, size:', audioBuffer.length, 'bytes');
      } else {
        audioBuffer = audioData;
      }
      
      // Save audio file for debugging
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const debugFile = path.join(os.tmpdir(), `debug-audio-${Date.now()}.wav`);
      fs.writeFileSync(debugFile, audioBuffer);
      console.log('💾 Debug audio file saved to:', debugFile);
      
      // Log first few bytes to check format
      console.log('🔍 First 20 bytes:', Array.from(audioBuffer.slice(0, 20)));
      
      try {
        if (this.mainWindow) {
          console.log('📡 Sending transcribing status to renderer');
          this.mainWindow.webContents.send('transcribing');
        }

        console.log('⚙️ Getting settings...');
        const settings = await this.settingsManager.getSettings();
        console.log('📋 Settings retrieved:', { 
          provider: settings.provider, 
          model: settings.model, 
          hasApiKey: !!settings.apiKey,
          language: settings.language 
        });
        
        console.log('🤖 Starting transcription with service...');
        const transcription = await this.transcriptionService.transcribe(audioBuffer, settings);
        console.log('📝 Transcription completed:', transcription);
        
        if (transcription) {
          console.log('💾 Saving transcription to history...');
          await this.historyManager.addTranscription(transcription);
          
          console.log('📋 Copying transcription to clipboard...');
          require('electron').clipboard.writeText(transcription.text);
          
          if (this.mainWindow) {
            console.log('📡 Sending transcription complete to renderer');
            this.mainWindow.webContents.send('transcription-complete', transcription);
          }
          
          console.log('✅ Transcription process completed successfully');
          return transcription;
        } else {
          console.warn('⚠️ No transcription returned from service');
          throw new Error('No transcription returned');
        }
      } catch (error) {
        console.error('❌ Failed to transcribe audio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (this.mainWindow) {
          console.log('📡 Sending transcription error to renderer:', errorMessage);
          this.mainWindow.webContents.send('transcription-error', errorMessage);
        }
        
        throw error;
      }
    });

    ipcMain.on('audio-data', (event, data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-waveform', data);
      }
    });

    ipcMain.on('ui-recording-started', () => {
      console.log('🎤 Main: Received UI recording started notification');
      this.startRecording();
    });

    ipcMain.on('ui-recording-stopped', () => {
      console.log('🛑 Main: Received UI recording stopped notification');
      this.stopRecording();
    });
  }

  private async startRecording() {
    console.log('🎤 Main: startRecording called');
    if (this.isRecording) {
      console.log('⚠️ Main: Already recording, ignoring start request');
      return;
    }

    console.log('🟢 Main: Starting recording...');
    this.isRecording = true;
    
    // Don't start the AudioRecorder since we're using renderer's MediaRecorder
    // Just notify the renderer that recording has started
    if (this.mainWindow) {
      console.log('📡 Main: Sending recording-started event to renderer');
      this.mainWindow.webContents.send('recording-started');
    }
  }

  private async stopRecording() {
    console.log('🛑 Main: stopRecording called');
    if (!this.isRecording) {
      console.log('⚠️ Main: Not recording, ignoring stop request');
      return;
    }

    console.log('🛑 Main: Stopping recording...');
    this.isRecording = false;
    
    // Notify the renderer to stop its MediaRecorder and send audio data
    if (this.mainWindow) {
      console.log('📡 Main: Sending stop recording request to renderer');
      this.mainWindow.webContents.send('stop-renderer-recording');
    }
  }

  private showMainWindow() {
    console.log('showMainWindow called');
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('Showing existing window');
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    console.log('Creating new window');
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      center: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      movable: true,
      frame: true
    });

    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    console.log('HTML file exists:', require('fs').existsSync(htmlPath));
    
    this.mainWindow.loadFile(htmlPath).then(() => {
      console.log('HTML file loaded successfully');
    }).catch((error) => {
      console.error('Failed to load HTML file:', error);
    });

    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    this.mainWindow.on('closed', () => {
      console.log('Window closed');
      this.mainWindow = null;
    });

    this.mainWindow.on('hide', () => {
      console.log('Window hidden');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
    });

    // Force show the window after a short delay if it's not showing
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        console.log('Forcing window to show');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 1000);
  }

  private showSettings() {
    console.log('showSettings called');
    this.showMainWindow();
    // TODO: Implement settings window
  }

  private showHistory() {
    console.log('showHistory called');
    this.showMainWindow();
    // TODO: Implement history window
  }
}

const whisperMaestro = new WhisperMaestroApp();
whisperMaestro.initialize().catch(console.error); 