// Minimal renderer logic for WhisperMaestro
// This is a stub. You can expand it with the full UI logic as needed.
console.log('🚀 Renderer script loaded and executing...');

class WhisperMaestroUI {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentTranscription = null;
        
        this.initializeEventListeners();
        this.setupElectronAPI();
        this.showPage('recordingPage');
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

        // New recording button
        const newRecordingBtn = document.getElementById('newRecordingBtn');
        if (newRecordingBtn) {
            newRecordingBtn.addEventListener('click', () => {
                this.showPage('recordingPage');
            });
        }

        // Settings
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                this.hideSettings();
            });
        }

        const saveSettings = document.getElementById('saveSettings');
        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // History
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.showHistory();
            });
        }

        const closeHistory = document.getElementById('closeHistory');
        if (closeHistory) {
            closeHistory.addEventListener('click', () => {
                this.hideHistory();
            });
        }

        // Transcription actions
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyTranscription();
            });
        }

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveTranscription();
            });
        }

        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.toggleEditMode();
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

    setupElectronAPI() {
        console.log('🔧 Setting up Electron API event listeners...');
        
        // Check if electronAPI is available
        if (typeof window.electronAPI === 'undefined') {
            console.warn('⚠️ Electron API not available yet, retrying in 100ms...');
            setTimeout(() => this.setupElectronAPI(), 100);
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

        window.electronAPI.onTranscriptionComplete((transcription) => {
            console.log('✅ Renderer: Received transcription complete event');
            this.onTranscriptionComplete(transcription);
        });

        window.electronAPI.onTranscriptionError((error) => {
            console.log('❌ Renderer: Received transcription error event');
            this.onTranscriptionError(error);
        });

        window.electronAPI.onUpdateWaveform((data) => {
            this.updateWaveform(data);
        });

        window.electronAPI.onShortcutRecordingToggled((isRecording) => {
            console.log('🎹 Renderer: Received shortcut-triggered recording event, state:', isRecording);
            this.onShortcutRecordingToggled(isRecording);
        });

        window.electronAPI.onStopRendererRecording(() => {
            console.log('🛑 Renderer: Received stop-renderer-recording event');
            this.stopRecording();
        });

        window.electronAPI.onShowTranscriptInWindow(() => {
            console.log('📺 Renderer: Received show-transcript-in-window event');
            if (this.currentTranscription) {
                this.showTranscription(this.currentTranscription);
            } else {
                this.showPage('transcriptionPage');
            }
        });
        
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
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone access granted, stream obtained:', stream);
            
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
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = async () => {
                console.log('🛑 MediaRecorder stopped, processing audio...');
                console.log('📊 Total audio chunks:', this.audioChunks.length);
                
                if (this.audioChunks.length === 0) {
                    console.error('❌ No audio chunks recorded!');
                    this.showNotification('No audio was recorded. Please try again.', 'error');
                    return;
                }
                
                // Log audio chunk details for debugging
                this.audioChunks.forEach((chunk, index) => {
                    console.log(`📦 Audio chunk ${index}: type=${chunk.type}, size=${chunk.size} bytes`);
                });
                
                const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
                console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes');
                console.log('🎵 Audio blob type:', audioBlob.type);
                
                if (audioBlob.size === 0) {
                    console.error('❌ Audio blob is empty!');
                    this.showNotification('Audio recording is empty. Please try again.', 'error');
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
                    try {
                        const result = await window.electronAPI.transcribeAudio(uint8Array);
                        console.log('✅ Transcription result received:', result);
                    } catch (error) {
                        console.error('❌ Failed to transcribe audio:', error);
                        this.showNotification('Transcription failed. Please check your API key and try again.', 'error');
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
            this.showNotification('Failed to start recording. Please check microphone permissions.', 'error');
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

    showTranscription(text) {
        const transcriptionText = document.getElementById('transcriptionText');
        if (transcriptionText) {
            transcriptionText.value = text;
        }
        this.showPage('transcriptionPage');
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
        this.showNotification('Recording cancelled');
    }

    onTranscribing() {
        console.log('⏳ Renderer: Received transcribing event');
        const recordingStatus = document.getElementById('recordingStatus');
        if (recordingStatus) {
            recordingStatus.textContent = 'Transcribing...';
            recordingStatus.className = 'recording-status transcribing';
        }
    }

    onTranscriptionComplete(transcription) {
        console.log('✅ Transcription complete:', transcription);
        console.log('🔄 About to call pasteToSystemFocusedField with text:', transcription.text);
        
        // Store the transcription for display if needed
        this.currentTranscription = transcription.text;
        
        // Try to paste into system-wide focused text field
        // The main process will decide whether to show the window or paste
        this.pasteToSystemFocusedField(transcription.text);
    }

    async pasteToSystemFocusedField(text) {
        console.log('🌍 Attempting to paste transcription into system-wide focused field...');
        
        if (typeof window.electronAPI !== 'undefined') {
            try {
                await window.electronAPI.pasteToFocusedField(text);
                console.log('✅ System-wide paste command sent');
                this.showNotification('Transcription pasted!');
            } catch (error) {
                console.error('❌ Failed to paste to focused field:', error);
                this.showNotification('Transcription copied to clipboard!');
            }
        } else {
            console.log('📋 Electron API not available, falling back to clipboard');
            this.showNotification('Transcription copied to clipboard!');
        }
    }

    pasteToFocusedField(text) {
        // Check if there's a focused text field within the Electron app
        const activeElement = document.activeElement;
        const isTextInput = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
        
        if (isTextInput) {
            console.log('📝 Pasting transcription into focused text field within app');
            
            // For contentEditable elements
            if (activeElement.contentEditable === 'true') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                // For regular input/textarea elements
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                const currentValue = activeElement.value;
                
                // Insert the text at cursor position
                activeElement.value = currentValue.substring(0, start) + text + currentValue.substring(end);
                
                // Set cursor position after the inserted text
                activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
                
                // Trigger input event to notify any listeners
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            this.showNotification('Transcription pasted into text field!');
            return true;
        }
        return false;
    }

    onTranscriptionError(error) {
        console.error('❌ Renderer: Received transcription error event:', error);
        const recordingStatus = document.getElementById('recordingStatus');
        if (recordingStatus) {
            recordingStatus.textContent = 'Transcription failed';
            recordingStatus.className = 'recording-status error';
        }
        this.showNotification(`Error: ${error}`, 'error');
    }

    updateUI() {
        const recordBtn = document.getElementById('recordBtn');
        const recordText = recordBtn?.querySelector('.record-text');
        const waveformContainer = document.querySelector('.waveform-container');
        const recordingStatus = document.getElementById('recordingStatus');

        if (this.isRecording) {
            if (recordBtn) recordBtn.classList.add('recording');
            if (recordText) recordText.textContent = 'Stop Recording';
            if (waveformContainer) waveformContainer.classList.add('recording');
            if (recordingStatus) {
                recordingStatus.textContent = 'Recording...';
                recordingStatus.className = 'recording-status recording';
            }
        } else {
            if (recordBtn) recordBtn.classList.remove('recording');
            if (recordText) recordText.textContent = 'Start Recording';
            if (waveformContainer) waveformContainer.classList.remove('recording');
            if (recordingStatus) {
                recordingStatus.textContent = 'Ready to record';
                recordingStatus.className = 'recording-status';
            }
        }
    }

    drawWaveform() {
        // This method is kept for compatibility but doesn't do anything
        // since we're not using audio visualization anymore
    }

    updateWaveform(data) {
        // This method is kept for compatibility but doesn't do anything
        // since we're not using audio visualization anymore
    }

    startWaveformAnimation(dataArray) {
        // Simple UI update - no audio visualization
        this.updateUI();
    }

    stopWaveformAnimation() {
        // Simple UI update - no audio visualization
        this.updateUI();
    }

    animateAudioLevel(dataArray) {
        // Simple UI update - no audio visualization
        this.updateUI();
    }

    async showSettings() {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const settings = await window.electronAPI.getSettings();
                
                const provider = document.getElementById('provider');
                const model = document.getElementById('model');
                const apiKey = document.getElementById('apiKey');
                const language = document.getElementById('language');
                const autoCopy = document.getElementById('autoCopy');
                const saveAudio = document.getElementById('saveAudio');
                
                if (provider) provider.value = settings.provider;
                if (model) model.value = settings.model;
                if (apiKey) apiKey.value = settings.apiKey;
                if (language) language.value = settings.language || '';
                if (autoCopy) autoCopy.checked = settings.autoCopy;
                if (saveAudio) saveAudio.checked = settings.saveAudio;
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
        
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
        }
    }

    hideSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
        }
    }

    async saveSettings() {
        if (typeof window.electronAPI === 'undefined') {
            this.showNotification('Electron API not available', 'error');
            return;
        }

        try {
            const formData = new FormData(document.getElementById('settingsForm'));
            const settings = {
                provider: formData.get('provider'),
                model: formData.get('model'),
                language: formData.get('language') || undefined,
                autoCopy: formData.get('autoCopy') === 'on',
                saveAudio: formData.get('saveAudio') === 'on'
            };
            
            await window.electronAPI.saveSettings(settings);
            
            // Save API key separately for security
            const apiKey = formData.get('apiKey');
            if (apiKey) {
                console.log('🔑 Saving API key securely...');
                await window.electronAPI.saveApiKey(apiKey);
                console.log('✅ API key saved successfully');
            }
            
            this.hideSettings();
            this.showNotification('Settings saved!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async showHistory() {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const history = await window.electronAPI.getHistory();
                this.renderHistory(history);
            } catch (error) {
                console.error('Failed to load history:', error);
            }
        }
        
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            historyModal.style.display = 'flex';
        }
    }

    hideHistory() {
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            historyModal.style.display = 'none';
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
                        <button onclick="app.copyHistoryItem('${item.text}')" title="Copy">📋</button>
                        <button onclick="app.deleteHistoryItem('${item.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="history-item-text">${item.text}</div>
            `;
            historyList.appendChild(historyItem);
        });
    }

    async copyTranscription() {
        const transcriptionText = document.getElementById('transcriptionText');
        if (transcriptionText && transcriptionText.value) {
            if (typeof window.electronAPI !== 'undefined') {
                await window.electronAPI.copyToClipboard(transcriptionText.value);
            } else {
                navigator.clipboard.writeText(transcriptionText.value);
            }
            this.showNotification('Copied to clipboard!');
        }
    }

    saveTranscription() {
        this.showNotification('Transcription saved to history!');
    }

    toggleEditMode() {
        const transcriptionText = document.getElementById('transcriptionText');
        if (transcriptionText) {
            transcriptionText.readOnly = !transcriptionText.readOnly;
            const editBtn = document.getElementById('editBtn');
            if (editBtn) {
                editBtn.textContent = transcriptionText.readOnly ? '✏️ Edit' : '💾 Save';
            }
        }
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
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
        `
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
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
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing WhisperMaestro UI...');
    window.app = new WhisperMaestroUI();
    console.log('✅ WhisperMaestro UI initialized successfully');
});