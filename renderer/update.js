class UpdateWindow {
    constructor() {
        this.currentVersion = '';
        this.newVersion = '';
        this.updateInfo = null;
        this.isDownloading = false;
        this.isDownloaded = false;
        this.isChecking = false;
        
        this.initializeEventListeners();
        this.loadCurrentVersion();
        this.setupIpcListeners();
    }

    initializeEventListeners() {
        // Download button
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.startDownload();
            });
        }

        // Install button
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.installUpdate();
            });
        }

        // Remind later button
        const remindLaterBtn = document.getElementById('remindLaterBtn');
        if (remindLaterBtn) {
            remindLaterBtn.addEventListener('click', () => {
                this.remindLater();
            });
        }

        // Skip version button
        const skipVersionBtn = document.getElementById('skipVersionBtn');
        if (skipVersionBtn) {
            skipVersionBtn.addEventListener('click', () => {
                this.skipVersion();
            });
        }

        // Test check button (for development/testing)
        const testCheckBtn = document.getElementById('testCheckBtn');
        if (testCheckBtn) {
            testCheckBtn.addEventListener('click', () => {
                this.testCheckingState();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.remindLater();
            } else if (e.key === 'Enter' && !this.isDownloading) {
                if (this.isDownloaded) {
                    this.installUpdate();
                } else {
                    this.startDownload();
                }
            }
        });
    }

    setupIpcListeners() {
        if (typeof window.electronAPI !== 'undefined') {
            // Listen for update events from main process
            window.electronAPI.onUpdaterEvent((event, data) => {
                console.log('📦 Update event received:', event, data);
                this.handleUpdateEvent(event, data);
            });

            // Get update info if available
            this.getUpdateInfo();
        } else {
            console.warn('⚠️ Electron API not available');
            // Fallback for testing
            this.showTestData();
        }
    }

    async loadCurrentVersion() {
        try {
            if (typeof window.electronAPI !== 'undefined') {
                this.currentVersion = await window.electronAPI.getAppVersion();
            } else {
                this.currentVersion = '1.3.0'; // Fallback
            }
            
            const currentVersionElement = document.getElementById('currentVersion');
            if (currentVersionElement) {
                currentVersionElement.textContent = this.currentVersion;
            }
        } catch (error) {
            console.error('Failed to load current version:', error);
        }
    }

    async getUpdateInfo() {
        try {
            // This would typically come from the main process
            // For now, we'll simulate it
            this.updateInfo = {
                version: '1.4.0',
                releaseNotes: [
                    '🎯 New keyboard shortcuts: ⌘+Shift+1-5 for quick mode access',
                    '⚡ Improved transcription accuracy and speed',
                    '🎨 Enhanced UI with better visual feedback',
                    '🔧 Bug fixes and performance improvements'
                ]
            };
            
            this.newVersion = this.updateInfo.version;
            this.updateUI();
        } catch (error) {
            console.error('Failed to get update info:', error);
        }
    }

    updateUI() {
        // Update version display
        const newVersionElement = document.getElementById('newVersion');
        if (newVersionElement && this.newVersion) {
            newVersionElement.textContent = this.newVersion;
        }

        // Update release notes
        const releaseNotesElement = document.getElementById('releaseNotes');
        if (releaseNotesElement && this.updateInfo) {
            const notesList = this.updateInfo.releaseNotes.map(note => `<li>${note}</li>`).join('');
            releaseNotesElement.innerHTML = `<ul>${notesList}</ul>`;
        }
    }

    handleUpdateEvent(event, data) {
        switch (event) {
            case 'checking-for-update':
                this.onCheckingForUpdate(data);
                break;
            case 'update-available':
                this.onUpdateAvailable(data);
                break;
            case 'update-not-available':
                this.onUpdateNotAvailable(data);
                break;
            case 'download-progress':
                this.onDownloadProgress(data);
                break;
            case 'update-downloaded':
                this.onUpdateDownloaded(data);
                break;
            case 'update-error':
                this.onUpdateError(data);
                break;
        }
    }

    onCheckingForUpdate(data) {
        console.log('🔍 Checking for updates...');
        this.isChecking = true;
        this.showCheckingState();
        
        // Update message if it's a manual check
        const checkingMessage = document.getElementById('checkingMessage');
        if (checkingMessage && data && data.manual) {
            checkingMessage.textContent = 'Checking for updates...';
        }
    }

    onUpdateAvailable(data) {
        console.log('✅ Update available:', data);
        this.isChecking = false;
        this.hideCheckingState();
        
        this.newVersion = data.version;
        this.updateUI();
        
        // Show download button
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
    }

    onUpdateNotAvailable(data) {
        console.log('ℹ️ No update available:', data);
        this.isChecking = false;
        this.hideCheckingState();
        
        // Show "no update" message
        this.showNoUpdateMessage();
    }

    onDownloadProgress(data) {
        console.log('📥 Download progress:', data.percent);
        this.updateProgress(data.percent, data.speed);
    }

    onUpdateDownloaded(data) {
        console.log('✅ Update downloaded:', data);
        this.isDownloaded = true;
        this.showInstallButton();
    }

    onUpdateError(data) {
        console.error('❌ Update error:', data);
        this.isChecking = false;
        this.hideCheckingState();
        this.showError('Update failed. Please try again later.');
    }

    showCheckingState() {
        const checkingSection = document.getElementById('checkingSection');
        const downloadSection = document.getElementById('downloadSection');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (checkingSection) {
            checkingSection.style.display = 'block';
        }
        
        if (downloadSection) {
            downloadSection.style.display = 'none';
        }
        
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="material-icons">refresh</span>Checking...';
        }
        
        // Hide secondary actions during checking
        const secondaryActions = document.querySelector('.secondary-actions');
        if (secondaryActions) {
            secondaryActions.style.display = 'none';
        }
    }

    hideCheckingState() {
        const checkingSection = document.getElementById('checkingSection');
        if (checkingSection) {
            checkingSection.style.display = 'none';
        }
    }

    showNoUpdateMessage() {
        // Update the release notes section to show "no update" message
        const releaseNotes = document.getElementById('releaseNotes');
        if (releaseNotes) {
            releaseNotes.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6e6e73;">
                    <span class="material-icons" style="font-size: 48px; color: #34c759; margin-bottom: 12px; display: block;">check_circle</span>
                    <h3 style="margin: 0 0 8px 0; color: #1d1d1f;">You're up to date!</h3>
                    <p style="margin: 0; font-size: 14px;">WhisperMaestro is running the latest version.</p>
                </div>
            `;
        }
        
        // Update the version info
        const newVersionElement = document.getElementById('newVersion');
        if (newVersionElement) {
            newVersionElement.textContent = this.currentVersion;
        }
        
        // Update the arrow to show current version
        const arrowElement = document.querySelector('.arrow');
        if (arrowElement) {
            arrowElement.textContent = '✓';
            arrowElement.style.color = '#34c759';
        }
        
        // Hide download button and show secondary actions
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
        
        const secondaryActions = document.querySelector('.secondary-actions');
        if (secondaryActions) {
            secondaryActions.style.display = 'flex';
        }
    }

    startDownload() {
        console.log('🚀 Starting download...');
        this.isDownloading = true;
        
        // Hide checking section if it's showing
        this.hideCheckingState();
        
        // Show progress section
        const downloadSection = document.getElementById('downloadSection');
        if (downloadSection) {
            downloadSection.style.display = 'block';
        }

        // Update button state
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="material-icons rotating">refresh</span>Downloading...';
        }

        // Hide secondary actions during download
        const secondaryActions = document.querySelector('.secondary-actions');
        if (secondaryActions) {
            secondaryActions.style.display = 'none';
        }

        // Trigger download in main process
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.checkForUpdates({ manual: true });
        }
    }

    updateProgress(percent, speed = null) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressSpeed = document.getElementById('progressSpeed');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        }
        
        if (progressSpeed && speed) {
            const speedMBps = (speed / (1024 * 1024)).toFixed(1);
            progressSpeed.textContent = `${speedMBps} MB/s`;
        }
    }

    showInstallButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        const installBtn = document.getElementById('installBtn');
        
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
        
        if (installBtn) {
            installBtn.style.display = 'flex';
        }

        // Show secondary actions again
        const secondaryActions = document.querySelector('.secondary-actions');
        if (secondaryActions) {
            secondaryActions.style.display = 'flex';
        }
    }

    async installUpdate() {
        console.log('🔄 Installing update...');
        
        try {
            if (typeof window.electronAPI !== 'undefined') {
                const success = await window.electronAPI.quitAndInstall();
                if (!success) {
                    this.showError('Failed to install update. Please restart the app manually.');
                }
            } else {
                this.showError('Update installation not available.');
            }
        } catch (error) {
            console.error('Installation error:', error);
            this.showError('Update installation failed.');
        }
    }

    remindLater() {
        console.log('⏰ Reminding later...');
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.closeWindow();
        }
    }

    skipVersion() {
        console.log('⏭️ Skipping version...');
        // TODO: Implement skip version logic
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.closeWindow();
        }
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <span class="material-icons">error</span>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff3b30;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showTestData() {
        // For testing purposes when Electron API is not available
        console.log('🧪 Showing test data');
        this.newVersion = '1.4.0';
        this.updateInfo = {
            version: '1.4.0',
            releaseNotes: [
                '🎯 New keyboard shortcuts: ⌘+Shift+1-5 for quick mode access',
                '⚡ Improved transcription accuracy and speed',
                '🎨 Enhanced UI with better visual feedback',
                '🔧 Bug fixes and performance improvements'
            ]
        };
        this.updateUI();
        
        // Show test check button for development
        const testCheckBtn = document.getElementById('testCheckBtn');
        if (testCheckBtn) {
            testCheckBtn.style.display = 'inline-flex';
        }
    }

    testCheckingState() {
        console.log('🧪 Testing checking state...');
        this.onCheckingForUpdate({ manual: true });
        
        // Simulate checking for 3 seconds, then show "no update"
        setTimeout(() => {
            this.onUpdateNotAvailable({ version: this.currentVersion });
        }, 3000);
    }
}

// Initialize the update window when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new UpdateWindow();
});

// Add rotating animation for download icon
const style = document.createElement('style');
style.textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .rotating {
        animation: rotate 1s linear infinite;
    }
    
    .error-notification .material-icons {
        font-size: 18px;
    }
`;
document.head.appendChild(style); 