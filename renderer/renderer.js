// Minimal renderer logic for WhisperMaestro
// This is a stub. You can expand it with the full UI logic as needed.
console.log('🚀 Renderer script loaded and executing...');

class WhisperMaestroApp {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.transcribingInterval = null;
        this.initializeEventListeners();
        this.setupIpcListeners();
        
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

        // Cancel recording button
        const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');
        if (cancelRecordingBtn) {
            cancelRecordingBtn.addEventListener('click', () => {
                this.cancelRecording();
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

        // Transcription events are now handled by separate transcription window

        window.electronAPI.onShortcutRecordingToggled((isRecording) => {
            console.log('🎹 Renderer: Received shortcut-triggered recording event, state:', isRecording);
            this.onShortcutRecordingToggled(isRecording);
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
                console.log('⚙️ Renderer: Settings updated, refreshing shortcut display');
                this.updateShortcutDisplay();
            });
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
                    try {
                        const result = await window.electronAPI.transcribeAudio({
                            audioData: uint8Array,
                            mimeType: this.mediaRecorder.mimeType
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
        this.hideTranscribingStatus(); // Hide any active transcribing animation
        this.showNotification('Recording cancelled', 'cancelled');
    }

    onTranscribing() {
        console.log('⏳ Renderer: Received transcribing event');
        
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

    hideTranscribingStatus() {
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
                
                // Reset progress after animation
                setTimeout(() => {
                    if (progressElement) {
                        progressElement.textContent = '0%';
                    }
                }, 300);
            }, 500);
        }
        
        // Clear progress interval
        if (this.transcribingInterval) {
            clearInterval(this.transcribingInterval);
            this.transcribingInterval = null;
        }
    }



    // Auto-paste functionality moved to main process



    updateUI() {
        const recordBtn = document.getElementById('recordBtn');
        const recordIcon = recordBtn?.querySelector('.record-icon');
        const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');

        if (this.isRecording) {
            document.body.classList.add('recording');
            if (recordIcon) recordIcon.textContent = 'stop';
            if (cancelRecordingBtn) cancelRecordingBtn.style.display = 'flex';
        } else {
            document.body.classList.remove('recording');
            if (recordIcon) recordIcon.textContent = 'mic';
            if (cancelRecordingBtn) cancelRecordingBtn.style.display = 'none';
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
        // Create notification with Material UI design
        const notification = document.createElement('div');
        
        // Set base styles
        notification.className = `notification notification-${type}`;
        
        // Get appropriate icon and colors
        let iconName, bgColor, textColor;
        switch (type) {
            case 'error':
            case 'cancelled':
                iconName = 'error_outline';
                bgColor = '#ffebee';
                textColor = '#c62828';
                break;
            case 'warning':
                iconName = 'warning';
                bgColor = '#fff3e0';
                textColor = '#ef6c00';
                break;
            default: // success
                iconName = 'check_circle_outline';
                bgColor = '#e8f5e8';
                textColor = '#2e7d32';
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-icons notification-icon">${iconName}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            background: ${bgColor};
            color: ${textColor};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 0, 0, 0.05);
        `;
        
        // Add notification styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-content {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
            }
            .notification-icon {
                font-size: 18px;
                opacity: 0.8;
            }
            .notification-text {
                font-size: 14px;
                font-weight: 500;
                letter-spacing: 0.25px;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // Auto-remove with animation
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, type === 'cancelled' ? 2000 : 3000);
    }

    onShortcutRecordingToggled(isRecording) {
        console.log('🎹 Renderer: Shortcut recording toggled, new state:', isRecording);
        console.log('🎹 Renderer: Current isRecording state:', this.isRecording);
        
        // Update the local state to match the main process
        this.isRecording = isRecording;
        this.updateUI();
        
        if (isRecording) {
            console.log('🎹 Renderer: Starting recording via shortcut - will be handled by recording-started event');
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
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing WhisperMaestro UI...');
    window.app = new WhisperMaestroApp();
    console.log('✅ WhisperMaestro UI initialized successfully');
});