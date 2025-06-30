import { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, shell, nativeImage } from 'electron';
import * as path from 'path';
import { TranscriptionService } from './services/transcriptionService';
import { SettingsManager } from './utils/settingsManager';
import { HistoryManager } from './utils/historyManager';
import { logger } from './utils/logger';

class WhisperMaestroApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private historyWindow: BrowserWindow | null = null;
  private onboardingWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private transcriptionService: TranscriptionService;
  private settingsManager: SettingsManager;
  private historyManager: HistoryManager;
  private isRecording = false;
  private lastTranscription: any = null;
  private currentShortcut: string = 'CommandOrControl+,';
  private needsOnboarding = false;

  constructor() {
    this.transcriptionService = new TranscriptionService();
    this.settingsManager = new SettingsManager();
    this.historyManager = new HistoryManager();
  }

  private async checkOnboardingNeeded() {
    try {
      const apiKey = await this.settingsManager.getApiKey();
      this.needsOnboarding = !apiKey || apiKey.trim() === '';
      logger.log('🔍 Onboarding needed:', this.needsOnboarding);
    } catch (error) {
      logger.error('❌ Failed to check API key, assuming onboarding needed:', error);
      this.needsOnboarding = true;
    }
  }

  async initialize() {
    await app.whenReady();
    
    logger.log('Initializing WhisperMaestro app...');
    
    // Check if onboarding is needed (no API key set)
    await this.checkOnboardingNeeded();
    
    // Set custom dock icon for macOS
    if (process.platform === 'darwin') {
      const iconPath = path.join(__dirname, '../assets/dock-icon.icns');
      logger.log('🎨 Setting dock icon:', iconPath);
      try {
        app.dock.setIcon(iconPath);
        logger.log('✅ Dock icon set successfully');
      } catch (error) {
        logger.log('❌ Failed to set dock icon:', error);
      }
    }
    
    // Keep the app visible in both dock and menu bar for easy access
    logger.log('📱 App will be visible in both dock and menu bar');
    
    this.setupTray();
    this.setupGlobalShortcuts();
    this.setupIpcHandlers();
    
    // Show appropriate window based on onboarding status
    if (this.needsOnboarding) {
      logger.log('🎯 First-time setup detected, showing onboarding');
      this.showOnboarding();
    } else {
      logger.log('🚀 Showing main window');
      this.showMainWindow();
    }
    
    logger.log('🚀 WhisperMaestro initialized successfully');
    
    app.on('window-all-closed', () => {
      // Keep app running when windows are closed (standard macOS behavior)
      // App can be accessed via dock icon or menu bar icon
      logger.log('All windows closed, keeping app running (accessible via dock or menu bar)');
    });

    // Show window when clicking the Dock icon (macOS)
    app.on('activate', () => {
      if (this.needsOnboarding) {
        this.showOnboarding();
      } else {
        this.showMainWindow();
      }
    });
  }

  private setupTray() {
    try {
      logger.log('🖼️ Starting tray setup...');
      
      // Look for the icon file in multiple possible locations
      const fs = require('fs');
      const iconPaths = [
        path.join(__dirname, '../assets/icons/menu.png'),
        path.join(__dirname, '../assets/menu.png'),
        path.join(process.resourcesPath, 'assets/icons/menu.png'),
        path.join(process.resourcesPath, 'assets/menu.png'),
        path.join(__dirname, '../../assets/icons/menu.png'),
        path.join(__dirname, '../../assets/menu.png')
      ];
      
      let iconPath = null;
      const possiblePaths: string[] = [];
      
      for (const testPath of iconPaths) {
        possiblePaths.push(testPath);
        logger.log('Testing icon path:', testPath);
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          logger.log('Found icon at:', iconPath);
          break;
        }
      }
      
      if (!iconPath) {
        logger.log('❌ Icon file not found at any expected location, skipping tray setup');
        logger.log('Tried paths:', possiblePaths);
        
        // Try to create a simple tray without custom icon - use a template image for menu bar
        try {
          logger.log('🔄 Attempting to create tray without custom icon...');
          // For macOS menu bar, we should use a simpler approach
          const fallbackIconPath = path.join(__dirname, '../assets/dock-icon.png');
          if (require('fs').existsSync(fallbackIconPath)) {
            this.tray = new Tray(fallbackIconPath);
            this.tray.setTitle('W'); // Set a simple title as backup
            logger.log('✅ Created tray with fallback icon');
          } else {
            // Create a template tray icon (this will use a system default)
            this.tray = new Tray(nativeImage.createEmpty());
            this.tray.setTitle('W'); // WhisperMaestro
            logger.log('✅ Created tray with empty image and title');
          }
        } catch (fallbackError) {
          logger.error('❌ Failed to create tray even with fallback:', fallbackError);
          return;
        }
      } else {
        logger.log('🖼️ Creating tray with icon:', iconPath);
        const img = nativeImage.createFromPath(iconPath);
        logger.log('Tray image is empty:', img.isEmpty());
        img.setTemplateImage(true);
        this.tray = new Tray(img);
      }
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Whisper Maestro',
          click: () => {
            logger.log('Tray menu: Show Whisper Maestro clicked');
            this.showMainWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          click: () => {
            logger.log('Tray menu: Settings clicked');
            this.showSettings();
          }
        },
        {
          label: 'History',
          click: () => {
            logger.log('Tray menu: History clicked');
            this.showHistory();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            logger.log('Tray menu: Quit clicked');
            app.quit();
          }
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('WhisperMaestro - Speech to Text');
      
      // Handle tray click events
      this.tray.on('click', () => {
        logger.log('Tray clicked - showing main window');
        this.showMainWindow();
      });
      
      this.tray.on('double-click', () => {
        logger.log('Tray double-clicked - showing main window');
        this.showMainWindow();
      });
      
      logger.log('✅ Tray setup complete');
      logger.log('🔍 Tray object created:', !!this.tray);
    } catch (error) {
      logger.error('❌ Failed to setup tray:', error instanceof Error ? error.message : String(error));
      logger.error('Full error:', error);
    }
  }

  private async setupGlobalShortcuts() {
    // Get the shortcut from settings
    const settings = await this.settingsManager.getSettings();
    this.currentShortcut = settings.recordingShortcut || 'CommandOrControl+,';
    
    // Unregister any existing shortcuts
    globalShortcut.unregisterAll();
    
    // Register the new shortcut
    const ret = globalShortcut.register(this.currentShortcut, () => {
      logger.log('🎹 Shortcut triggered:', this.currentShortcut);
      this.toggleRecording();
    });

    if (ret) {
      logger.log('✅ Global shortcut registered:', this.currentShortcut);
    } else {
      logger.log('❌ Failed to register global shortcut:', this.currentShortcut);
    }
  }

  private async updateGlobalShortcut(newShortcut: string) {
    // Unregister current shortcut
    if (this.currentShortcut) {
      globalShortcut.unregister(this.currentShortcut);
      logger.log('🗑️ Unregistered old shortcut:', this.currentShortcut);
    }
    
    this.currentShortcut = newShortcut;
    
    // Register new shortcut
    const ret = globalShortcut.register(this.currentShortcut, () => {
      logger.log('🎹 Shortcut triggered:', this.currentShortcut);
      this.toggleRecording();
    });

    if (ret) {
      logger.log('✅ Global shortcut updated to:', this.currentShortcut);
    } else {
      logger.log('❌ Failed to register new shortcut:', this.currentShortcut);
    }
  }

  private toggleRecording() {
    logger.log('🎹 Recording shortcut triggered:', this.currentShortcut);
    logger.log('🔄 Toggle recording called, current state:', this.isRecording);
    
    if (this.isRecording) {
      logger.log('🔄 Stopping recording via shortcut');
      this.stopRecording();
    } else {
      logger.log('🔄 Starting recording via shortcut');
      // Check focus immediately and synchronously - use a separate method
      this.startRecordingWithFocusCheck();
    }
    
    // Notify the renderer about the shortcut-triggered recording change
    if (this.mainWindow) {
      logger.log('📡 Sending shortcut-triggered recording state to renderer');
      logger.log('📡 Window exists:', !!this.mainWindow);
      logger.log('📡 Window destroyed:', this.mainWindow.isDestroyed());
      logger.log('📡 Window visible:', this.mainWindow.isVisible());
      this.mainWindow.webContents.send('shortcut-recording-toggled', this.isRecording);
    } else {
      logger.log('⚠️ Cannot send shortcut event - no main window');
    }
  }

  private async checkAndStartRecording() {
    // Check if there's a focused text field BEFORE starting recording
    let hasFocusedTextField = false;
    
    try {
      if (process.platform === 'darwin') {
        logger.log('🔍 Checking for focused text field before recording...');
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
        hasFocusedTextField = checkResult === 'true';
        logger.log('📝 Had focused text field on start:', hasFocusedTextField);
      }
    } catch (error) {
      logger.log('⚠️ Could not check text field focus, assuming no focus');
      hasFocusedTextField = false;
    }

    // Start recording - show window only if no text field was focused
    if (hasFocusedTextField) {
      logger.log('🎯 Text field was focused - starting recording without showing window');
    } else {
      logger.log('🪟 No text field focused - showing window for recording feedback');
      if (this.mainWindow) {
        this.showMainWindow();
      }
    }
    
    this.startRecording();
  }

  private startRecordingWithFocusCheck() {
    // For shortcut-triggered recording, we'll check focus after transcription
    logger.log('🎯 Starting recording via shortcut - will check focus after transcription');
    
    // Show window for visual feedback but without stealing focus
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      logger.log('🪟 Showing existing window for recording feedback (without stealing focus)');
      this.mainWindow.showInactive(); // Show without stealing focus
      this.startRecording();
    } else {
      logger.log('🪟 Creating new window for recording feedback and starting recording');
      this.showMainWindowAndStartRecording();
    }
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-settings', () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle('get-current-shortcut', () => {
      return this.currentShortcut;
    });

    ipcMain.handle('save-settings', async (event, settings) => {
      // Update global shortcut if it changed
      if (settings.recordingShortcut && settings.recordingShortcut !== this.currentShortcut) {
        await this.updateGlobalShortcut(settings.recordingShortcut);
      }
      
      const result = this.settingsManager.saveSettings(settings);
      
      // Notify all windows that settings have been updated
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('settings-updated', settings);
      }
      
      return result;
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

    // Note: paste-to-focused-field handler removed - now handled directly in handleTranscriptionComplete

    ipcMain.handle('transcribe-audio', async (event, audioRequest) => {
      logger.log('🎵 Received audio data for transcription');
      logger.log('🎵 Audio request type:', typeof audioRequest);
      logger.log('🎵 Audio data length:', audioRequest.audioData?.length, 'bytes');
      logger.log('🎵 MIME type:', audioRequest.mimeType);
      
      // Check if audio data is suspiciously small
      if (audioRequest.audioData?.length < 5000) {
        logger.log('⚠️ WARNING: Audio data is very small (' + audioRequest.audioData?.length + ' bytes)');
        logger.log('⚠️ This suggests microphone access issues or very short recording');
      }
      
      // Convert Uint8Array to Buffer if needed  
      let audioBuffer: Buffer;
      if (audioRequest.audioData instanceof Uint8Array) {
        audioBuffer = Buffer.from(audioRequest.audioData);
        logger.log('🔄 Converted Uint8Array to Buffer, size:', audioBuffer.length, 'bytes');
      } else {
        audioBuffer = audioRequest.audioData;
      }
      
      // Save audio file for debugging
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const debugFile = path.join(os.tmpdir(), `debug-audio-${Date.now()}.wav`);
      fs.writeFileSync(debugFile, audioBuffer);
      logger.log('💾 Debug audio file saved to:', debugFile);
      
      // Log first few bytes to check format
      logger.log('🔍 First 20 bytes:', Array.from(audioBuffer.slice(0, 20)));
      
      try {
        if (this.mainWindow) {
          logger.log('📡 Sending transcribing status to renderer');
          this.mainWindow.webContents.send('transcribing');
        }

        logger.log('⚙️ Getting settings...');
        const settings = await this.settingsManager.getSettings();
        logger.log('📋 Settings retrieved:', { 
          provider: settings.provider, 
          model: settings.model, 
          hasApiKey: !!settings.apiKey
        });
        
        // Check if API key is configured
        if (!settings.apiKey || settings.apiKey.trim() === '') {
          logger.log('❌ No API key configured, prompting user');
          throw new Error('OpenAI API key not configured. Please set up your API key in Settings.');
        }
        
        // Add mimeType to settings for the provider
        const settingsWithMimeType = {
          ...settings,
          mimeType: audioRequest.mimeType
        };
        
        logger.log('🤖 Starting transcription with service...');
        const transcription = await this.transcriptionService.transcribe(audioBuffer, settingsWithMimeType);
        logger.log('📝 Transcription completed:', transcription);
        
        if (transcription) {
          logger.log('💾 Saving transcription to history...');
          await this.historyManager.addTranscription(transcription);
          
          logger.log('📋 Copying transcription to clipboard...');
          require('electron').clipboard.writeText(transcription.text);
          
          // Store transcription for potential window display
          this.lastTranscription = transcription;
          
          // Trigger auto-paste logic directly
          await this.handleTranscriptionComplete(transcription);
          
          if (this.mainWindow) {
            logger.log('📡 Sending transcription complete to renderer');
            this.mainWindow.webContents.send('transcription-complete', transcription);
          }
          
          logger.log('✅ Transcription process completed successfully');
          return transcription;
        } else {
          logger.warn('⚠️ No transcription returned from service');
          throw new Error('No transcription returned');
        }
      } catch (error) {
        logger.error('❌ Failed to transcribe audio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (this.mainWindow) {
          logger.log('📡 Sending transcription error to renderer:', errorMessage);
          this.mainWindow.webContents.send('transcription-error', errorMessage);
        }
        
        throw error;
      }
    });

    ipcMain.on('ui-recording-started', () => {
      logger.log('🎤 Main: Received UI recording started notification');
      this.startRecording();
    });

    ipcMain.on('ui-recording-stopped', () => {
      logger.log('🛑 Main: Received UI recording stopped notification');
      this.stopRecording();
    });

    ipcMain.handle('cancel-recording', () => {
      logger.log('❌ Main: Received cancel recording request');
      this.cancelRecording();
      return true;
    });

    // Window management
    ipcMain.on('close-window', () => {
      logger.log('🚪 Main: Received close window request');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.close();
      }
    });

    ipcMain.on('open-settings', () => {
      logger.log('⚙️ Main: Received open settings request');
      this.showSettings();
    });

    ipcMain.on('open-history', () => {
      logger.log('📋 Main: Received open history request');
      this.showHistory();
    });

    // Onboarding handlers
    ipcMain.handle('complete-onboarding', () => {
      logger.log('✅ Main: Received complete onboarding request');
      this.completeOnboarding();
      return true;
    });

    ipcMain.handle('open-external-url', (event, url) => {
      logger.log('🔗 Main: Opening external URL:', url);
      shell.openExternal(url);
      return true;
    });

    // Debug handlers for production logging
    ipcMain.handle('get-log-file-path', () => {
      return logger.getLogFilePath();
    });

    ipcMain.handle('get-recent-logs', (event, lines = 50) => {
      return logger.getRecentLogs(lines);
    });

    // System permission checks
    ipcMain.handle('check-microphone-permission', async () => {
      try {
        logger.log('🎤 Checking microphone permission...');
        const { systemPreferences } = require('electron');
        
        if (process.platform === 'darwin') {
          const micStatus = systemPreferences.getMediaAccessStatus('microphone');
          logger.log('🎤 Microphone access status:', micStatus);
          
          if (micStatus === 'not-determined') {
            logger.log('🎤 Requesting microphone permission...');
            const granted = await systemPreferences.askForMediaAccess('microphone');
            logger.log('🎤 Microphone permission granted:', granted);
            return granted ? 'granted' : 'denied';
          }
          
          return micStatus;
        }
        
        return 'unknown'; // Non-macOS platforms
      } catch (error) {
        logger.error('❌ Failed to check microphone permission:', error);
        return 'error';
      }
    });

    ipcMain.handle('check-accessibility-permission', async () => {
      try {
        logger.log('♿ Checking accessibility permission...');
        const { systemPreferences } = require('electron');
        
        if (process.platform === 'darwin') {
          const hasAccess = systemPreferences.isTrustedAccessibilityClient(false);
          logger.log('♿ Accessibility access status:', hasAccess);
          return hasAccess;
        }
        
        return false; // Non-macOS platforms
      } catch (error) {
        logger.error('❌ Failed to check accessibility permission:', error);
        return false;
      }
    });

    ipcMain.handle('request-accessibility-permission', async () => {
      try {
        logger.log('♿ Requesting accessibility permission...');
        const { systemPreferences } = require('electron');
        
        if (process.platform === 'darwin') {
          // This will prompt the user and open System Preferences if not already granted
          const hasAccess = systemPreferences.isTrustedAccessibilityClient(true);
          logger.log('♿ Accessibility access after request:', hasAccess);
          
          if (!hasAccess) {
            logger.log('♿ Opening System Preferences for user to grant permission...');
            // Additional guidance - open System Preferences directly to Accessibility
            const { exec } = require('child_process');
            exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
          }
          
          return hasAccess;
        }
        
        return false; // Non-macOS platforms
      } catch (error) {
        logger.error('❌ Failed to request accessibility permission:', error);
        return false;
      }
    });
  }

  private async startRecording() {
    logger.log('🎤 Main: startRecording called');
    if (this.isRecording) {
      logger.log('⚠️ Main: Already recording, ignoring start request');
      return;
    }

    logger.log('🟢 Main: Starting recording...');
    this.isRecording = true;
    
    // Don't start the AudioRecorder since we're using renderer's MediaRecorder
    // Just notify the renderer that recording has started
    if (this.mainWindow) {
      logger.log('📡 Main: Sending recording-started event to renderer');
      this.mainWindow.webContents.send('recording-started');
    }
  }

  private async stopRecording() {
    logger.log('🛑 Main: stopRecording called');
    if (!this.isRecording) {
      logger.log('⚠️ Main: Not recording, ignoring stop request');
      return;
    }

    logger.log('🛑 Main: Stopping recording...');
    this.isRecording = false;
    
    // Notify the renderer to stop its MediaRecorder and send audio data
    if (this.mainWindow) {
      logger.log('📡 Main: Sending stop recording request to renderer');
      this.mainWindow.webContents.send('stop-renderer-recording');
    }
  }

  private cancelRecording() {
    logger.log('❌ Main: cancelRecording called');
    if (!this.isRecording) {
      logger.log('⚠️ Main: Not recording, ignoring cancel request');
      return;
    }

    logger.log('❌ Main: Canceling recording...');
    this.isRecording = false;
    
    // Notify the renderer that recording was cancelled
    if (this.mainWindow) {
      logger.log('📡 Main: Sending recording cancelled event to renderer');
      this.mainWindow.webContents.send('recording-cancelled');
    }
  }

  private showMainWindowAndStartRecording() {
    logger.log('showMainWindowAndStartRecording called');
    this.createMainWindow(true); // true = start recording when ready
  }

  private showMainWindow() {
    logger.log('showMainWindow called');
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      logger.log('Showing existing window');
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    this.createMainWindow(false); // false = don't start recording
  }

  private createMainWindow(startRecordingWhenReady: boolean = false) {

    logger.log('Creating new window');
    
    // Get screen dimensions to position window at center bottom
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const windowWidth = 300;
    const windowHeight = 120;
    const bottomMargin = 0; // Distance from bottom of screen
    
    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round((screenWidth - windowWidth) / 2), // Center horizontally
      y: screenHeight - windowHeight - bottomMargin, // Position at bottom with margin
      show: false,
      icon: path.join(__dirname, '../assets/dock-icon.icns'), // Add custom icon
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      frame: false, // Remove title bar
      vibrancy: 'under-window',
      visualEffectState: 'active',
      resizable: false, // Disable resizing since we removed the frame
      minimizable: false,
      maximizable: false,
      movable: true,
      alwaysOnTop: false,
      skipTaskbar: false
    });

    const htmlPath = path.join(__dirname, '../renderer/index.html');
    logger.log('Loading HTML from:', htmlPath);
    logger.log('HTML file exists:', require('fs').existsSync(htmlPath));
    
    this.mainWindow.loadFile(htmlPath).then(() => {
      logger.log('HTML file loaded successfully');
    }).catch((error) => {
      logger.error('Failed to load HTML file:', error);
    });

    this.mainWindow.once('ready-to-show', () => {
      logger.log('Window ready to show');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (startRecordingWhenReady) {
          this.mainWindow.showInactive(); // Show without stealing focus for recording
          // Start recording after a small delay to ensure window is fully ready
          setTimeout(() => {
            this.startRecording();
          }, 100);
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });

    this.mainWindow.on('closed', () => {
      logger.log('Window closed');
      this.mainWindow = null;
    });

    this.mainWindow.on('hide', () => {
      logger.log('Window hidden');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      logger.error('Failed to load:', errorCode, errorDescription, validatedURL);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      logger.log('Page finished loading');
    });

    // Force show the window after a short delay if it's not showing
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isVisible()) {
        logger.log('Forcing window to show');
        if (startRecordingWhenReady) {
          this.mainWindow.showInactive();
          this.startRecording();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    }, 1000);
  }

  private showSettings() {
    logger.log('⚙️ showSettings called - opening settings window');
    
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      logger.log('Showing existing settings window');
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return;
    }

    logger.log('Creating new settings window');
    this.settingsWindow = new BrowserWindow({
      width: 700,
      height: 600,
      show: false,
      icon: path.join(__dirname, '../assets/dock-icon.icns'), // Add custom icon
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      center: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      movable: true,
      frame: true,
      title: 'WhisperMaestro Settings'
    });

    const htmlPath = path.join(__dirname, '../renderer/settings.html');
    logger.log('Loading Settings HTML from:', htmlPath);
    
    this.settingsWindow.loadFile(htmlPath).then(() => {
      logger.log('Settings HTML file loaded successfully');
    }).catch((error) => {
      logger.error('Failed to load Settings HTML file:', error);
    });

    this.settingsWindow.once('ready-to-show', () => {
      logger.log('Settings window ready to show');
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.show();
        this.settingsWindow.focus();
      }
    });

    this.settingsWindow.on('closed', () => {
      logger.log('Settings window closed');
      this.settingsWindow = null;
    });
  }

  private showHistory() {
    logger.log('📋 showHistory called - opening history window');
    
    if (this.historyWindow && !this.historyWindow.isDestroyed()) {
      logger.log('Showing existing history window');
      this.historyWindow.show();
      this.historyWindow.focus();
      return;
    }

    logger.log('Creating new history window');
    this.historyWindow = new BrowserWindow({
      width: 900,
      height: 700,
      show: false,
      icon: path.join(__dirname, '../assets/dock-icon.icns'), // Add custom icon
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      center: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      movable: true,
      frame: true,
      title: 'WhisperMaestro History'
    });

    const htmlPath = path.join(__dirname, '../renderer/history.html');
    logger.log('Loading History HTML from:', htmlPath);
    
    this.historyWindow.loadFile(htmlPath).then(() => {
      logger.log('History HTML file loaded successfully');
    }).catch((error) => {
      logger.error('Failed to load History HTML file:', error);
    });

    this.historyWindow.once('ready-to-show', () => {
      logger.log('History window ready to show');
      if (this.historyWindow && !this.historyWindow.isDestroyed()) {
        this.historyWindow.show();
        this.historyWindow.focus();
      }
    });

    this.historyWindow.on('closed', () => {
      logger.log('History window closed');
      this.historyWindow = null;
    });
  }

  private showOnboarding() {
    logger.log('🎯 showOnboarding called - opening onboarding window');
    
    if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
      logger.log('Showing existing onboarding window');
      this.onboardingWindow.show();
      this.onboardingWindow.focus();
      return;
    }

    logger.log('Creating new onboarding window');
    
    // Get screen dimensions to center the onboarding window
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    const windowWidth = 600;
    const windowHeight = 700;
    
    this.onboardingWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round((screenWidth - windowWidth) / 2),
      y: Math.round((screenHeight - windowHeight) / 2),
      show: false,
      icon: path.join(__dirname, '../assets/dock-icon.icns'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      center: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      movable: true,
      frame: false,
      title: 'Welcome to WhisperMaestro',
      skipTaskbar: false,
      acceptFirstMouse: true,
      backgroundColor: '#ffffff',
      roundedCorners: true
    });

    const htmlPath = path.join(__dirname, '../renderer/onboarding.html');
    logger.log('Loading Onboarding HTML from:', htmlPath);
    
    this.onboardingWindow.loadFile(htmlPath).then(() => {
      logger.log('Onboarding HTML file loaded successfully');
    }).catch((error) => {
      logger.error('Failed to load Onboarding HTML file:', error);
    });

    this.onboardingWindow.once('ready-to-show', () => {
      logger.log('Onboarding window ready to show');
      if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
        this.onboardingWindow.show();
        this.onboardingWindow.focus();
      }
    });

    this.onboardingWindow.on('closed', () => {
      logger.log('Onboarding window closed');
      this.onboardingWindow = null;
    });
  }

  private completeOnboarding() {
    logger.log('✅ Completing onboarding flow');
    
    // Close onboarding window
    if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
      this.onboardingWindow.close();
      this.onboardingWindow = null;
    }
    
    // Mark onboarding as complete
    this.needsOnboarding = false;
    
    // Show the main application window
    this.showMainWindow();
    
    logger.log('🎉 Onboarding completed, welcome to WhisperMaestro!');
  }

  private async handleTranscriptionComplete(transcription: any) {
    logger.log('🔄 Handling transcription completion for auto-paste');
    
    // Check if we have accessibility permissions first
    let hasAccessibilityAccess = false;
    try {
      if (process.platform === 'darwin') {
        const { systemPreferences } = require('electron');
        hasAccessibilityAccess = systemPreferences.isTrustedAccessibilityClient(false);
        logger.log('♿ Accessibility permission status:', hasAccessibilityAccess);
        
        if (!hasAccessibilityAccess) {
          logger.log('⚠️ No accessibility permission - auto-paste disabled');
          logger.log('📺 Transcription copied to clipboard only');
          return;
        }
      }
    } catch (error) {
      logger.log('⚠️ Could not check accessibility permission, skipping auto-paste');
      logger.log('⚠️ Error details:', error);
      return;
    }
    
    // More accurate approach: Check if we can actually focus a text field first
    let canPaste = false;
    
    try {
      if (process.platform === 'darwin' && hasAccessibilityAccess) {
        logger.log('🔍 Checking if we can focus a text field for pasting...');
        const { exec } = require('child_process');
        
        // Try to find and focus any text input element
        const focusCommands = [
          // Try to click on a text field to focus it
          'osascript -e "tell application \\"System Events\\" to try to click text field 1 of window 1 of (first application process whose frontmost is true)"',
          // Try to click on a text area
          'osascript -e "tell application \\"System Events\\" to try to click text area 1 of window 1 of (first application process whose frontmost is true)"',
          // Check if any text field exists that we can interact with
          'osascript -e "tell application \\"System Events\\" to exists text field of window 1 of (first application process whose frontmost is true)"',
          // Check if any text area exists that we can interact with  
          'osascript -e "tell application \\"System Events\\" to exists text area of window 1 of (first application process whose frontmost is true)"'
        ];
        
        for (let i = 0; i < focusCommands.length; i++) {
          try {
            logger.log(`🔍 Trying focus command ${i + 1}`);
            const result = await new Promise<string>((resolve, reject) => {
              exec(focusCommands[i], (error: any, stdout: any, stderr: any) => {
                if (error) {
                  logger.log(`❌ Focus command ${i + 1} failed:`, error.message);
                  resolve('false');
                } else {
                  const output = stdout.trim();
                  logger.log(`✅ Focus command ${i + 1} result: "${output}"`);
                  resolve(output);
                }
              });
            });
            
            // If we successfully clicked or found a text field, we can try pasting
            if (result === 'true' || result === '' || !result.includes('error')) {
              canPaste = true;
              logger.log(`✅ Found pasteable text field with command ${i + 1}`);
              break;
            }
          } catch (cmdError) {
            logger.log(`⚠️ Focus command ${i + 1} threw error:`, cmdError);
          }
        }
        
        logger.log('📝 Can paste to text field:', canPaste);
      }
    } catch (error) {
      logger.log('⚠️ Could not check text field focus, assuming no focus');
      logger.log('⚠️ Error details:', error);
      canPaste = false;
    }

    if (canPaste && hasAccessibilityAccess) {
      // Try to paste since we found a text field and have permissions
      try {
        logger.log('🍎 Attempting to auto-paste...');
        const { exec } = require('child_process');
        
        await new Promise<void>((resolve, reject) => {
          exec('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"', (error: any, stdout: any, stderr: any) => {
            // We don't rely on this command's success/failure since it's unreliable
            resolve();
          });
        });
        
        logger.log('✅ Auto-paste completed successfully');
        
      } catch (error) {
        logger.error('❌ Auto-paste failed');
      }
    } else {
      // No text field to paste to or no accessibility permission
      if (!hasAccessibilityAccess) {
        logger.log('📺 No accessibility permission - transcription copied to clipboard only');
      } else {
        logger.log('📺 No pasteable text field found - transcription copied to clipboard');
      }
    }
  }
}

const whisperMaestro = new WhisperMaestroApp();
whisperMaestro.initialize().catch(console.error); 