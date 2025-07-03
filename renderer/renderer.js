// Minimal renderer logic for WhisperMaestro
// This is a stub. You can expand it with the full UI logic as needed.
console.log('🚀 Renderer script loaded and executing...');

class WhisperMaestroApp {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.transcribingInterval = null;
        this.shortcutTriggeredMode = null; // Track mode triggered by shortcuts
        
        this.initializeEventListeners();
        this.setupIpcListeners();
        this.setupUpdateListeners();
        this.loadAvailableModes();
        
        console.log('🎨 WhisperMaestro UI initialized');
        
        // Initialize shortcut display after a small delay to ensure API is ready
        setTimeout(() => {
            this.updateShortcutDisplay();
        }, 100);
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show the specified page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    initializeEventListeners() {
        // Record button
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.toggleRecording();
            });
        }

        // Mode selector
        const modeSelector = document.getElementById('modeSelector');
        if (modeSelector) {
            modeSelector.addEventListener('change', (e) => {
                this.onModeChanged(e.target.value);
            });
        }

        // Esc key for canceling recording or closing window
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isRecording) {
                    this.cancelRecording();
                } else {
                    this.closeWindow();
                }
            }
        });

        // Close button
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // History button
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.openHistory();
            });
        }

        // History search
        const historySearch = document.getElementById('historySearch');
        if (historySearch) {
            historySearch.addEventListener('input', (e) => {
                this.filterHistory(e.target.value);
            });
        }

        const clearHistory = document.getElementById('clearHistory');
        if (clearHistory) {
            clearHistory.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        // Modal backdrop clicks
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'settingsModal') {
                    this.hideSettings();
                }
            });
        }

        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            historyModal.addEventListener('click', (e) => {
                if (e.target.id === 'historyModal') {
                    this.hideHistory();
                }
            });
        }
    }

    setupIpcListeners() {
        console.log('🔧 Setting up Electron API event listeners...');
        
        // Check if electronAPI is available
        if (typeof window.electronAPI === 'undefined') {
            console.warn('⚠️ Electron API not available yet, retrying in 100ms...');
            setTimeout(() => this.setupIpcListeners(), 100);
            return;
        }
        
        console.log('🔧 Electron API is available, setting up event listeners...');
        
        window.electronAPI.onRecordingStarted(() => {
            console.log('🎤 Renderer: Received recording started event');
            this.onRecordingStarted();
        });

        window.electronAPI.onRecordingCancelled(() => {
            console.log('❌ Renderer: Received recording cancelled event');
            this.onRecordingCancelled();
        });

        window.electronAPI.onTranscribing(() => {
            console.log('⏳ Renderer: Received transcribing event');
            this.onTranscribing();
        });

        window.electronAPI.onTransforming((mode) => {
            console.log('🤖 Renderer: Received transforming event for mode:', mode);
            this.onTransforming(mode);
        });

        window.electronAPI.onTransformationError((error) => {
            console.log('❌ Renderer: Received transformation error:', error);
            this.onTransformationError(error);
        });

        // Transcription events are now handled by separate transcription window

        window.electronAPI.onShortcutRecordingToggled((isRecording) => {
            console.log('🎹 Renderer: Received shortcut-triggered recording event, state:', isRecording);
            this.onShortcutRecordingToggled(isRecording);
        });

        window.electronAPI.onSetRecordingMode((mode) => {
            console.log('🎭 Renderer: Setting recording mode to:', mode);
            this.setRecordingMode(mode);
        });

        window.electronAPI.onStopRendererRecording(() => {
            console.log('🛑 Renderer: Received stop-renderer-recording event');
            this.stopRecording();
        });

        window.electronAPI.onShowSettings(() => {
            console.log('⚙️ Renderer: Received show-settings event from tray menu');
            this.showSettings();
        });

        window.electronAPI.onShowHistory(() => {
            console.log('📋 Renderer: Received show-history event from tray menu');
            this.showHistory();
        });

        // Listen for settings updates
        if (window.electronAPI.onSettingsUpdated) {
            window.electronAPI.onSettingsUpdated((settings) => {
                console.log('⚙️ Renderer: Settings updated, refreshing shortcut display and mode dropdown');
                this.updateShortcutDisplay();
                this.loadAvailableModes(); // Refresh mode dropdown with updated shortcuts
            });
        }
    }

    setupUpdateListeners() {
        console.log('🔄 Setting up update listeners...');
        
        if (window.electronAPI.onUpdaterEvent) {
            window.electronAPI.onUpdaterEvent((event, data) => {
                console.log('📦 Update event:', event, data);
                
                switch (event) {
                    case 'update-available':
                        this.showUpdateNotification('Update available!', `Version ${data.version} is ready to download.`, false);
                        break;
                    case 'update-not-available':
                        if (data && data.manual) {
                            this.showUpdateNotification('No updates available', 'You are running the latest version.', false);
                        }
                        break;
                    case 'download-progress':
                        this.updateDownloadProgress(data.percent);
                        break;
                    case 'update-downloaded':
                        this.showUpdateNotification('Update ready!', `Version ${data.version} has been downloaded. Restart to apply.`, true);
                        break;
                    case 'update-error':
                        const errorMsg = data && data.manual ? 'Failed to check for updates. Please try again later.' : 'Update error occurred.';
                        this.showUpdateNotification('Update Error', errorMsg, false);
                        console.error('❌ Update error:', data);
                        break;
                    case 'error':
                        console.error('❌ Update error:', data);
                        break;
                }
            });
        }
    }

    showUpdateNotification(title, message, showRestartButton = false, isChecking = false) {
        // Remove any existing update notification
        const existingNotification = document.getElementById('updateNotification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create update notification
        const notification = document.createElement('div');
        notification.id = 'updateNotification';
        notification.className = 'update-notification';
        // Determine icon based on state
        const icon = isChecking ? '🔄' : (title.includes('Error') ? '❌' : '📦');
        
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-icon ${isChecking ? 'checking' : ''}">${icon}</div>
                <div class="update-text">
                    <div class="update-title">${title}</div>
                    <div class="update-message">${message}</div>
                    <div id="updateProgress" class="update-progress" style="display: none;">
                        <div class="progress-bar">
                            <div id="progressFill" class="progress-fill"></div>
                        </div>
                        <span id="progressText">0%</span>
                    </div>
                </div>
                <div class="update-actions">
                    ${showRestartButton ? `
                        <button id="restartButton" class="restart-btn">Restart Now</button>
                    ` : ''}
                    <button id="closeUpdateNotification" class="close-btn">×</button>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Add event listeners
        const closeBtn = document.getElementById('closeUpdateNotification');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }

        const restartBtn = document.getElementById('restartButton');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                window.electronAPI.quitAndInstall();
            });
        }

        // Auto-hide after 10 seconds if not a restart notification
        if (!showRestartButton) {
            setTimeout(() => {
                if (document.getElementById('updateNotification')) {
                    notification.remove();
                }
            }, 10000);
        }
    }

    updateDownloadProgress(percent) {
        const progressContainer = document.getElementById('updateProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressContainer && progressFill && progressText) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${Math.round(percent)}%`;
        }
        
        console.log('✅ All Electron API event listeners set up successfully');
        console.log('🔧 Testing if electronAPI is available:', typeof window.electronAPI !== 'undefined');
        console.log('🔧 Available methods:', Object.keys(window.electronAPI || {}));
    }

    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        console.log('🟢 Starting recording...');
        
        // Check microphone permission first
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.checkMicrophonePermission) {
            try {
                const micPermission = await window.electronAPI.checkMicrophonePermission();
                console.log('🎤 Microphone permission status:', micPermission);
                
                if (micPermission === 'denied') {
                    this.showNotification('Microphone access denied. Please grant permission in System Settings > Privacy & Security > Microphone', 'error');
                    return;
                }
                
                if (micPermission === 'not-determined' || micPermission === 'error') {
                    console.warn('⚠️ Microphone permission unclear:', micPermission);
                }
            } catch (error) {
                console.warn('⚠️ Could not check microphone permission:', error);
            }
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            console.log('✅ Microphone access granted, stream obtained:', stream);
            
            // Log audio track info
            const audioTracks = stream.getAudioTracks();
            console.log('🎵 Audio tracks:', audioTracks.length);
            audioTracks.forEach((track, index) => {
                console.log(`🎵 Track ${index}:`, {
                    kind: track.kind,
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
                
                const settings = track.getSettings();
                console.log(`🎵 Track ${index} settings:`, settings);
            });
            
            // Try to use a more compatible audio format
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ''; // Use default
                    }
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            this.audioChunks = [];
            console.log('✅ MediaRecorder created with stream');
            console.log('🎵 MediaRecorder mime type:', this.mediaRecorder.mimeType);
            
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('📦 Audio data available, chunk size:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                } else {
                    console.warn('⚠️ Received empty audio chunk!');
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                console.log('🛑 MediaRecorder stopped, processing audio...');
                console.log('📊 Total audio chunks:', this.audioChunks.length);
                
                if (this.audioChunks.length === 0) {
                    console.error('❌ No audio chunks recorded!');
                    this.showNotification('No audio was recorded. Please check microphone permissions.', 'error');
                    return;
                }
                
                // Log audio chunk details for debugging
                let totalSize = 0;
                this.audioChunks.forEach((chunk, index) => {
                    console.log(`📦 Audio chunk ${index}: type=${chunk.type}, size=${chunk.size} bytes`);
                    totalSize += chunk.size;
                });
                console.log('📊 Total audio size:', totalSize, 'bytes');
                
                if (totalSize < 5000) {
                    console.warn('⚠️ WARNING: Total audio size is very small (' + totalSize + ' bytes)');
                    console.warn('⚠️ This suggests microphone issues or very short recording');
                }
                
                const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
                console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes');
                console.log('🎵 Audio blob type:', audioBlob.type);
                
                if (audioBlob.size === 0) {
                    console.error('❌ Audio blob is empty!');
                    this.showNotification('Audio recording is empty. Please check microphone permissions.', 'error');
                    return;
                }
                
                const arrayBuffer = await audioBlob.arrayBuffer();
                console.log('🔄 Converted to ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes');
                
                // Convert ArrayBuffer to Uint8Array (browser-compatible)
                const uint8Array = new Uint8Array(arrayBuffer);
                console.log('📦 Converted to Uint8Array, length:', uint8Array.length, 'bytes');
                
                // Log first few bytes for debugging
                console.log('🔍 First 20 bytes:', Array.from(uint8Array.slice(0, 20)));
                
                // Send to main process for transcription
                if (typeof window.electronAPI !== 'undefined') {
                    console.log('🚀 Sending audio to main process for transcription...');
                    console.log('🎵 Using MIME type:', this.mediaRecorder.mimeType);
                    
                    // Get selected mode - prioritize shortcut-triggered mode
                    let selectedMode;
                    if (this.shortcutTriggeredMode) {
                        selectedMode = this.shortcutTriggeredMode;
                        console.log('🎭 Using shortcut-triggered mode:', selectedMode);
                        // Clear the shortcut-triggered mode after use
                        this.shortcutTriggeredMode = null;
                    } else {
                        const modeSelector = document.getElementById('modeSelector');
                        selectedMode = modeSelector ? modeSelector.value : 'transcript';
                        console.log('🎭 Using dropdown-selected mode:', selectedMode);
                    }
                    
                    try {
                        const result = await window.electronAPI.transcribeAudio({
                            audioData: uint8Array,
                            mimeType: this.mediaRecorder.mimeType,
                            mode: selectedMode
                        });
                        console.log('✅ Transcription result received:', result);
                        
                        // Hide transcribing status
                        this.hideTranscribingStatus();
                        
                    } catch (error) {
                        console.error('❌ Failed to transcribe audio:', error);
                        this.showNotification('Transcription failed. Please check your API key and try again.', 'error');
                        
                        // Hide transcribing status on error too
                        this.hideTranscribingStatus();
                    }
                } else {
                    console.error('❌ Electron API not available');
                    this.showNotification('Electron API not available', 'error');
                }
            };
            
            this.mediaRecorder.onstart = () => {
                console.log('▶️ MediaRecorder started recording');
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event);
                this.showNotification('Recording error occurred. Please try again.', 'error');
            };
            
            this.mediaRecorder.onpause = () => {
                console.log('⏸️ MediaRecorder paused');
            };
            
            this.mediaRecorder.onresume = () => {
                console.log('▶️ MediaRecorder resumed');
            };
            
            console.log('🎤 Starting MediaRecorder...');
            this.mediaRecorder.start();
            console.log('🎤 Recording started successfully');
            
            this.isRecording = true;
            this.updateUI();
            
            // Notify main process that recording started
            if (typeof window.electronAPI !== 'undefined') {
                console.log('📡 Notifying main process that recording started');
                window.electronAPI.notifyRecordingStarted();
            }
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            
            let errorMessage = 'Failed to start recording. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Microphone access denied. Please grant permission in System Settings.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found.';
            } else {
                errorMessage += 'Please check microphone permissions.';
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }

    async stopRecording() {
        console.log('🛑 Renderer: stopRecording called');
        console.log('🛑 Renderer: isRecording =', this.isRecording);
        console.log('🛑 Renderer: mediaRecorder state =', this.mediaRecorder?.state);
        
        if (this.mediaRecorder && this.isRecording) {
            console.log('🛑 Renderer: Stopping MediaRecorder...');
            
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
                console.log('🛑 Renderer: MediaRecorder.stop() called');
            } else {
                console.warn('⚠️ Renderer: MediaRecorder not in recording state:', this.mediaRecorder.state);
            }
            
            this.isRecording = false;
            this.updateUI();
            
            // Stop all tracks
            if (this.mediaRecorder.stream) {
                console.log('🛑 Renderer: Stopping audio tracks...');
                this.mediaRecorder.stream.getTracks().forEach(track => {
                    console.log('🛑 Renderer: Stopping track:', track.kind);
                    track.stop();
                });
            }
            
            // Notify main process that recording stopped
            if (typeof window.electronAPI !== 'undefined') {
                console.log('📡 Notifying main process that recording stopped');
                window.electronAPI.notifyRecordingStopped();
            }
        } else {
            console.warn('⚠️ Renderer: Cannot stop recording - not recording or no MediaRecorder');
        }
    }

    onRecordingStarted() {
        console.log('🎤 Renderer: Received recording started event');
        if (!this.isRecording) {
            console.log('🎤 Renderer: Starting MediaRecorder due to recording-started event');
            this.startRecording();
        } else {
            console.log('🎤 Renderer: Already recording, just updating UI');
            this.updateUI();
        }
    }

    onRecordingCancelled() {
        this.isRecording = false;
        this.updateUI();
        this.hideTranscribingStatus(true); // Skip control restore during notification flow
        
        // Show notification - this will handle hiding/restoring controls with proper timing
        this.showNotification('Recording cancelled', 'cancelled');
        
        // DO NOT restore controls here - let showNotification handle the complete timing cycle
    }

    onTranscribing() {
        console.log('⏳ Renderer: Received transcribing event');
        
        // Hide recording controls during transcription
        const centeredControls = document.querySelector('.centered-controls');
        if (centeredControls) {
            centeredControls.style.display = 'none';
            console.log('🔒 Renderer: Recording controls hidden during transcription');
        }
        
        // Show transcribing animation
        const transcribingStatus = document.getElementById('transcribingStatus');
        if (transcribingStatus) {
            transcribingStatus.classList.add('visible');
            
            // Start progress animation
            this.startTranscribingProgress();
        }
    }

    startTranscribingProgress() {
        const progressElement = document.getElementById('transcribingProgress');
        if (!progressElement) return;
        
        let progress = 0;
        const interval = setInterval(() => {
            // Simulate progress with non-linear growth
            if (progress < 30) {
                progress += Math.random() * 5 + 1; // Fast start
            } else if (progress < 70) {
                progress += Math.random() * 3 + 0.5; // Slow middle
            } else if (progress < 90) {
                progress += Math.random() * 2 + 0.2; // Very slow near end
            } else {
                progress += Math.random() * 0.5; // Barely moving at 90%+
            }
            
            // Cap at 95% to avoid reaching 100% before completion
            progress = Math.min(progress, 95);
            
            progressElement.textContent = `${Math.round(progress)}%`;
        }, 200);
        
        // Store interval to clear it later
        this.transcribingInterval = interval;
    }

    hideTranscribingStatus(skipControlRestore = false) {
        const transcribingStatus = document.getElementById('transcribingStatus');
        const progressElement = document.getElementById('transcribingProgress');
        
        if (transcribingStatus) {
            // Quickly finish progress to 100%
            if (progressElement) {
                progressElement.textContent = '100%';
            }
            
            // Wait a moment to show 100%, then hide
            setTimeout(() => {
                transcribingStatus.classList.remove('visible');
                
                // Only restore controls if not skipping (i.e., not during notification flow)
                if (!skipControlRestore) {
                    const centeredControls = document.querySelector('.centered-controls');
                    if (centeredControls) {
                        centeredControls.style.display = 'flex';
                        console.log('🔓 Renderer: Recording controls restored after transcription');
                    }
                }
                
                // Reset progress after animation
                setTimeout(() => {
                    if (progressElement) {
                        progressElement.textContent = '0%';
                    }
                }, 300);
            }, 500);
        }
        
        // Clear the progress interval
        if (this.transcribingInterval) {
            clearInterval(this.transcribingInterval);
            this.transcribingInterval = null;
        }
    }

    updateUI() {
        const recordBtn = document.getElementById('recordBtn');
        const recordIcon = recordBtn?.querySelector('.record-icon');

        if (this.isRecording) {
            document.body.classList.add('recording');
            if (recordIcon) recordIcon.textContent = 'stop';
        } else {
            document.body.classList.remove('recording');
            if (recordIcon) recordIcon.textContent = 'mic';
        }
        
        // Update shortcut display (this will update both tooltip and badge)
        this.updateShortcutDisplay();
    }

    async cancelRecording() {
        if (!this.isRecording) return;
        
        console.log('❌ Canceling recording...');
        
        // Stop the media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Stop all tracks
        if (this.mediaRecorder && this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.updateUI();
        this.showNotification('Recording cancelled', 'cancelled');

        // Notify main process
        if (typeof window.electronAPI !== 'undefined') {
            try {
                await window.electronAPI.cancelRecording();
            } catch (error) {
                console.error('Failed to notify main process of cancellation:', error);
        }
    }
    }

    openSettings() {
        console.log('⚙️ Opening settings window...');
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.openSettings();
        }
    }

    openHistory() {
        console.log('📋 Opening history window...');
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.openHistory();
        }
    }

    renderHistory(history) {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-date">${new Date(item.timestamp).toLocaleString()}</span>
                    <div class="history-item-actions">
                        <button onclick="app.copyHistoryItem('${item.text}')" title="Copy" class="history-action-btn">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button onclick="app.deleteHistoryItem('${item.id}')" title="Delete" class="history-action-btn">
                            <span class="material-icons">delete_outline</span>
                        </button>
                    </div>
                </div>
                <div class="history-item-text">${item.text}</div>
            `;
            historyList.appendChild(historyItem);
        });
    }

    filterHistory(searchTerm) {
        // Implementation for filtering history
        console.log('Filtering history:', searchTerm);
    }

    async clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            if (typeof window.electronAPI !== 'undefined') {
                try {
                    // await window.electronAPI.clearHistory();
                    this.showNotification('History cleared!');
                } catch (error) {
                    console.error('Failed to clear history:', error);
                }
            }
        }
    }

    copyHistoryItem(text) {
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.copyToClipboard(text);
        } else {
            navigator.clipboard.writeText(text);
        }
        this.showNotification('Copied to clipboard!');
    }

    async deleteHistoryItem(id) {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                await window.electronAPI.deleteHistoryItem(id);
                this.showNotification('Item deleted!');
                // Refresh history
                const history = await window.electronAPI.getHistory();
                this.renderHistory(history);
            } catch (error) {
                console.error('Failed to delete item:', error);
            }
        }
    }

    showNotification(message, type = 'success') {
        // Create notification with exact transcribing bar aesthetic
        const notification = document.createElement('div');
        
        // Hide recording controls during notification (just like during transcription)
        const centeredControls = document.querySelector('.centered-controls');
        if (centeredControls) {
            centeredControls.style.display = 'none';
            console.log('🔒 Renderer: Recording controls hidden during notification');
        }
        
        // Set base styles
        notification.className = `notification notification-${type}`;
        
        // Get appropriate icon and colors - softer, more elegant colors
        let iconName, textColor;
        switch (type) {
            case 'error':
            case 'cancelled':
                iconName = 'error_outline';
                textColor = '#dc2626'; // Refined red
                break;
            case 'warning':
                iconName = 'warning';
                textColor = '#d97706'; // Refined amber
                break;
            default: // success
                iconName = 'check_circle_outline';
                textColor = '#059669'; // Refined green
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-icons notification-icon">${iconName}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        // Match the transcribing bar aesthetic EXACTLY
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 22px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            max-width: 350px;
            min-width: 200px;
        `;
        
        // Enhanced notification styles with exact transcribing bar typography
        const style = document.createElement('style');
        style.textContent = `
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 18px;
            }
            .notification-icon {
                font-size: 16px;
                color: ${textColor};
                opacity: 0.9;
                flex-shrink: 0;
            }
            .notification-text {
                font-size: 13px;
                font-weight: 500;
                color: ${textColor};
                letter-spacing: 0.3px;
                line-height: 1.4;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Smooth entrance animation
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // Auto-remove with smooth exit animation - optimized timing for responsiveness
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => {
                // Clean up notification elements
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
                
                // Quick pause before restoring controls for clean visual flow
                setTimeout(() => {
                    const centeredControls = document.querySelector('.centered-controls');
                    if (centeredControls) {
                        centeredControls.style.display = 'flex';
                        console.log('🔓 Renderer: Recording controls restored after notification');
                    }
                }, 600); // Reduced from 1200ms - quicker restore
            }, 400); // Reduced from 600ms - faster fade out
        }, type === 'cancelled' ? 2000 : 2500); // Much shorter display time: cancelled=2s, others=2.5s
    }

    onShortcutRecordingToggled(isRecording) {
        console.log('🎹 Renderer: Shortcut recording toggled, new state:', isRecording);
        console.log('🎹 Renderer: Current isRecording state:', this.isRecording);
        
        // Update the local state to match the main process
        this.isRecording = isRecording;
        this.updateUI();
        
        if (isRecording) {
            console.log('🎹 Renderer: Starting recording via shortcut - will be handled by recording-started event');
            // Clear shortcut-triggered mode for general recording shortcut
            this.shortcutTriggeredMode = null;
        } else {
            console.log('🎹 Renderer: Stopping recording via shortcut - will be handled by stop-renderer-recording event');
        }
    }

    async updateShortcutDisplay() {
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getCurrentShortcut) {
            try {
                const shortcut = await window.electronAPI.getCurrentShortcut();
                const recordBtn = document.getElementById('recordBtn');
                const recordLabel = recordBtn?.querySelector('.btn-label');
                const shortcutDisplay = document.getElementById('shortcutDisplay');
                
                if (shortcut) {
                    // Convert shortcut to display format
                    const displayShortcut = this.electronToDisplayShortcut(shortcut);
                    
                    // Update button text with current state
                    const buttonText = this.isRecording ? 'Stop' : 'Record';
                    if (recordLabel) {
                        recordLabel.innerHTML = `${buttonText} <span id="shortcutDisplay" class="shortcut-badge">${displayShortcut}</span>`;
                    }
                    
                    // Update tooltip
                    if (recordBtn) {
                        const action = this.isRecording ? 'Stop' : 'Start';
                        recordBtn.title = `${action} Recording (${displayShortcut})`;
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not get current shortcut:', error);
                
                // Fallback: set button text without shortcut
                const recordLabel = document.getElementById('recordBtn')?.querySelector('.btn-label');
                if (recordLabel) {
                    const buttonText = this.isRecording ? 'Stop' : 'Record';
                    recordLabel.innerHTML = `${buttonText} <span id="shortcutDisplay" class="shortcut-badge">⌘,</span>`;
                }
            }
        }
    }

    electronToDisplayShortcut(electronShortcut) {
        let display = electronShortcut;
        
        // Replace modifiers based on platform
        if (navigator.platform.includes('Mac')) {
            display = display.replace('CommandOrControl', '⌘');
            display = display.replace('Alt', '⌥');
        } else {
            display = display.replace('CommandOrControl', 'Ctrl');
            display = display.replace('Alt', 'Alt');
        }
        
        display = display.replace('Shift', '⇧');
        
        // Replace special keys with symbols
        const keyReplacements = {
            'Space': 'Space',
            'Up': '↑',
            'Down': '↓',
            'Left': '←',
            'Right': '→',
            'Delete': 'Del',
            'Backspace': '⌫',
            'Return': '↵',
            'Tab': '⇥',
            'Escape': 'Esc'
        };
        
        Object.entries(keyReplacements).forEach(([electron, symbol]) => {
            display = display.replace(new RegExp(`\\b${electron}\\b`, 'g'), symbol);
        });
        
        return display;
    }

    closeWindow() {
        console.log('🚪 Renderer: Closing window');
        if (window.electronAPI && window.electronAPI.closeWindow) {
            window.electronAPI.closeWindow();
        } else {
            // Fallback: try to close via window
            window.close();
        }
    }

    onModeChanged(mode) {
        console.log('🎭 Mode changed to:', mode);
        // Mode change handling can be added here if needed
        // For now, the mode is just used when submitting audio for transcription
    }

    async onTransforming(mode) {
        console.log('🤖 Renderer: Starting transformation for mode:', mode);
        
        // Hide recording controls during transformation (similar to transcription)
        const centeredControls = document.querySelector('.centered-controls');
        if (centeredControls) {
            centeredControls.style.display = 'none';
            console.log('🔒 Renderer: Recording controls hidden during transformation');
        }
        
        // Get the readable mode name from mode settings
        let modeName = mode;
        try {
            if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getModeSettings) {
                const modeSettings = await window.electronAPI.getModeSettings();
                if (modeSettings.modes[mode]) {
                    modeName = modeSettings.modes[mode].name;
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not get mode name for:', mode, error);
            // Fallback to capitalizing the mode key
            modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
        }
        
        // Update transcribing status to show transformation
        const transcribingStatus = document.getElementById('transcribingStatus');
        const transcribingText = transcribingStatus?.querySelector('.transcribing-text');
        
        if (transcribingStatus && transcribingText) {
            transcribingStatus.classList.add('visible');
            transcribingText.textContent = `Transforming to ${modeName}...`;
            
            // Start a new progress animation for transformation
            this.startTransformingProgress();
        }
    }

    startTransformingProgress() {
        const progressElement = document.getElementById('transcribingProgress');
        if (!progressElement) return;
        
        // Clear any existing interval
        if (this.transcribingInterval) {
            clearInterval(this.transcribingInterval);
        }
        
        let progress = 0;
        const interval = setInterval(() => {
            // Faster progress for transformation (usually quicker than transcription)
            if (progress < 50) {
                progress += Math.random() * 8 + 2; // Fast start
            } else if (progress < 80) {
                progress += Math.random() * 5 + 1; // Medium speed
            } else if (progress < 95) {
                progress += Math.random() * 2 + 0.5; // Slow near end
            } else {
                progress += Math.random() * 0.3; // Very slow at 95%+
            }
            
            // Cap at 95% to avoid reaching 100% before completion
            progress = Math.min(progress, 95);
            
            progressElement.textContent = `${Math.round(progress)}%`;
        }, 150); // Slightly faster interval for transformation
        
        // Store interval to clear it later
        this.transcribingInterval = interval;
    }

    onTransformationError(error) {
        console.error('❌ Renderer: Transformation failed:', error);
        
        // Hide the transforming status
        this.hideTranscribingStatus();
        
        // Show error notification
        this.showNotification(`Transformation failed: ${error}`, 'error');
    }

    async loadAvailableModes() {
        console.log('🎭 Loading available modes...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getModeSettings) {
            try {
                const modeSettings = await window.electronAPI.getModeSettings();
                console.log('📋 Mode settings loaded:', modeSettings);
                
                const modeSelector = document.getElementById('modeSelector');
                if (modeSelector) {
                    // Clear existing options
                    modeSelector.innerHTML = '';
                    
                    // Add modes to the dropdown with shortcuts
                    Object.entries(modeSettings.modes).forEach(([modeKey, modeConfig]) => {
                        if (modeConfig.enabled) {
                            const option = document.createElement('option');
                            option.value = modeKey;
                            
                            // Format the option text to include shortcut if available
                            let optionText = modeConfig.name;
                            if (modeConfig.shortcut) {
                                const displayShortcut = this.electronToDisplayShortcut(modeConfig.shortcut);
                                optionText += ` (${displayShortcut})`;
                            }
                            
                            option.textContent = optionText;
                            modeSelector.appendChild(option);
                        }
                    });
                    
                    // Set default to transcript
                    modeSelector.value = 'transcript';
                    
                    console.log('✅ Mode selector populated with available modes and shortcuts');
                } else {
                    console.warn('⚠️ Mode selector element not found');
                }
                
            } catch (error) {
                console.error('❌ Failed to load available modes:', error);
                // Fallback to default modes if API fails
                this.populateDefaultModes();
            }
        } else {
            console.warn('⚠️ Mode settings API not available, using defaults');
            this.populateDefaultModes();
        }
    }

    populateDefaultModes() {
        const modeSelector = document.getElementById('modeSelector');
        if (modeSelector) {
            // Default shortcuts for built-in modes (using Electron format)
            const defaultShortcuts = {
                transcript: 'CommandOrControl+Shift+1',
                email: 'CommandOrControl+Shift+2', 
                slack: 'CommandOrControl+Shift+3',
                notes: 'CommandOrControl+Shift+4',
                tasks: 'CommandOrControl+Shift+5'
            };
            
            // Convert to display format
            const displayShortcuts = {};
            Object.entries(defaultShortcuts).forEach(([mode, shortcut]) => {
                displayShortcuts[mode] = this.electronToDisplayShortcut(shortcut);
            });
            
            modeSelector.innerHTML = `
                <option value="transcript">Transcript (${displayShortcuts.transcript})</option>
                <option value="email">Email (${displayShortcuts.email})</option>
                <option value="slack">Slack (${displayShortcuts.slack})</option>
                <option value="notes">Meeting Notes (${displayShortcuts.notes})</option>
                <option value="tasks">Action Items (${displayShortcuts.tasks})</option>
            `;
            modeSelector.value = 'transcript';
            console.log('✅ Default modes populated with shortcuts');
        }
    }

    setRecordingMode(mode) {
        console.log('🎭 Setting recording mode to:', mode);
        
        // Store the mode triggered by shortcut
        this.shortcutTriggeredMode = mode;
        
        const modeSelector = document.getElementById('modeSelector');
        if (modeSelector) {
            // Check if the mode exists in the dropdown
            const option = modeSelector.querySelector(`option[value="${mode}"]`);
            if (option) {
                modeSelector.value = mode;
                console.log('✅ Mode selector updated to:', mode);
                
                // Trigger change event to ensure any listeners are notified
                modeSelector.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.warn('⚠️ Mode not found in dropdown:', mode);
                // Reload available modes in case new modes were added
                this.loadAvailableModes().then(() => {
                    const updatedOption = modeSelector.querySelector(`option[value="${mode}"]`);
                    if (updatedOption) {
                        modeSelector.value = mode;
                        console.log('✅ Mode selector updated after reload:', mode);
                        
                        // Trigger change event
                        modeSelector.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        console.error('❌ Mode still not found after reload:', mode);
                    }
                });
            }
        } else {
            console.warn('⚠️ Mode selector element not found');
        }
    }

    // Add method to refresh modes when settings change
    refreshAvailableModes() {
        console.log('🔄 Refreshing available modes...');
        this.loadAvailableModes();
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing WhisperMaestro UI...');
    window.app = new WhisperMaestroApp();
    console.log('✅ WhisperMaestro UI initialized successfully');
});