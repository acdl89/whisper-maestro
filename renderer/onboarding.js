console.log('🚀 Onboarding script loaded');

class OnboardingApp {
    constructor() {
        this.isLoading = false;
        this.currentStep = 1;
        this.currentShortcut = 'CommandOrControl+,';
        this.tempShortcut = '';
        this.isRecordingShortcut = false;
        this.initializeEventListeners();
        // Remove automatic permission checking during initialization
    }

    initializeEventListeners() {
        // Step 1: API Key setup
        document.getElementById('continueBtn').addEventListener('click', () => {
            this.handleContinueStep1();
        });

        document.getElementById('skipBtn').addEventListener('click', () => {
            this.handleSkip();
        });

        // API key input handling
        document.getElementById('apiKeyInput').addEventListener('input', () => {
            this.validateApiKey();
        });

        document.getElementById('toggleVisibilityBtn').addEventListener('click', () => {
            this.toggleApiKeyVisibility();
        });

        document.getElementById('getApiKeyLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openGetApiKeyPage();
        });

        // Step 2: Permissions
        document.getElementById('backToStep1Btn').addEventListener('click', () => {
            this.showStep(1);
        });

        document.getElementById('continueToStep3Btn').addEventListener('click', () => {
            this.showStep(3);
        });

        // Step 3: Completion and features
        document.getElementById('backToStep2Btn').addEventListener('click', () => {
            this.showStep(2);
        });

        document.getElementById('getStartedBtn').addEventListener('click', () => {
            this.completeOnboarding();
        });

        // Shortcut customization
        document.getElementById('changeShortcutBtn').addEventListener('click', () => {
            this.showShortcutModal();
        });

        document.getElementById('cancelShortcutBtn').addEventListener('click', () => {
            this.hideShortcutModal();
        });

        document.getElementById('saveShortcutBtn').addEventListener('click', () => {
            this.saveNewShortcut();
        });

        // Escape key to close or cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isRecordingShortcut) {
                    this.hideShortcutModal();
                } else if (this.currentStep === 1) {
                    this.handleSkip();
                }
            } else if (this.isRecordingShortcut) {
                this.recordShortcut(e);
            }
        });
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const toggleBtn = document.getElementById('toggleVisibilityBtn');
        const icon = toggleBtn.querySelector('.material-icons');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.textContent = 'visibility_off';
        } else {
            apiKeyInput.type = 'password';
            icon.textContent = 'visibility';
        }
    }

    validateInput() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const continueBtn = document.getElementById('continueBtn');
        
        if (apiKeyInput && continueBtn) {
            const apiKey = apiKeyInput.value.trim();
            const isValid = this.isValidApiKey(apiKey);
            
            continueBtn.disabled = !isValid || this.isLoading;
            
            // Remove error styling if input becomes valid
            if (isValid) {
                apiKeyInput.classList.remove('error');
            }
        }
    }

    validateApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        
        this.clearError();
        
        if (!apiKey) {
            return false;
        }
        
        if (!this.isValidApiKey(apiKey)) {
            this.showError('Please enter a valid OpenAI API key (starts with sk- or sk-proj-)');
            return false;
        }
        
        return true;
    }

    isValidApiKey(apiKey) {
        return apiKey && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) && apiKey.length > 20;
    }

    async handleContinueStep1() {
        if (!this.validateApiKey()) {
            return;
        }

        const apiKey = document.getElementById('apiKeyInput').value.trim();
        const continueBtn = document.getElementById('continueBtn');
        const continueText = document.getElementById('continueText');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Show loading state
        continueBtn.disabled = true;
        continueText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';

        try {
            // Save API key
            if (typeof window.electronAPI !== 'undefined') {
                await window.electronAPI.saveApiKey(apiKey);
                console.log('✅ API key saved successfully');
            }

            // Move to permissions step
            this.showStep(2);

        } catch (error) {
            console.error('❌ Failed to save API key:', error);
            this.showError('Failed to save API key. Please try again.');
        } finally {
            // Reset button state
            continueBtn.disabled = false;
            continueText.style.display = 'inline';
            loadingSpinner.style.display = 'none';
        }
    }

    handleSkip() {
        // Move to permissions step even without API key
        this.showStep(2);
    }

    completeOnboarding() {
        console.log('✅ Completing onboarding');
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.completeOnboarding();
        }
    }

    openApiKeyHelp() {
        console.log('🔗 Opening API key help');
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.openExternalUrl('https://platform.openai.com/api-keys');
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        const continueBtn = document.getElementById('continueBtn');
        const continueText = document.getElementById('continueText');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const skipBtn = document.getElementById('skipBtn');
        const apiKeyInput = document.getElementById('apiKeyInput');

        if (continueBtn) {
            continueBtn.disabled = loading;
        }

        if (continueText && loadingSpinner) {
            if (loading) {
                continueText.style.display = 'none';
                loadingSpinner.style.display = 'block';
            } else {
                continueText.style.display = 'block';
                loadingSpinner.style.display = 'none';
            }
        }

        if (skipBtn) {
            skipBtn.disabled = loading;
        }

        if (apiKeyInput) {
            apiKeyInput.disabled = loading;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showSuccess() {
        const container = document.querySelector('.onboarding-container');
        const continueText = document.getElementById('continueText');
        
        if (container) {
            container.classList.add('success-animation');
        }
        
        if (continueText) {
            continueText.textContent = 'Success! 🎉';
        }
        
        this.clearError();
    }

    // Multi-step navigation
    showStep(stepNumber) {
        // Hide all steps
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step3').style.display = 'none';

        // Show the requested step
        document.getElementById(`step${stepNumber}`).style.display = 'flex';

        // If showing step 2, initialize permission states and set up buttons
        if (stepNumber === 2) {
            this.initializePermissionStates();
            this.setupPermissionButtons();
        }

        // If showing step 3, load current shortcut
        if (stepNumber === 3) {
            this.loadCurrentShortcut();
        }
    }

    initializePermissionStates() {
        // Set initial states without triggering permission requests
        this.updatePermissionStatus('micPermissionStatus', 'not-checked');
        this.updatePermissionStatus('accessibilityPermissionStatus', 'not-checked');
        
        // Reset buttons to initial state
        const micButton = document.getElementById('requestMicPermissionBtn');
        const accessibilityButton = document.getElementById('requestAccessibilityPermissionBtn');
        
        if (micButton) {
            micButton.disabled = false;
            micButton.textContent = 'Grant Access';
        }
        
        if (accessibilityButton) {
            accessibilityButton.disabled = false;
            accessibilityButton.textContent = 'Grant Access';
        }
    }

    // Load current shortcut from settings
    async loadCurrentShortcut() {
        try {
            if (typeof window.electronAPI !== 'undefined') {
                const shortcut = await window.electronAPI.getCurrentShortcut();
                this.currentShortcut = shortcut || 'CommandOrControl+,';
                this.updateShortcutDisplay(shortcut || 'CommandOrControl+,');
            }
        } catch (error) {
            console.error('Failed to load current shortcut:', error);
            this.currentShortcut = 'CommandOrControl+,';
            this.updateShortcutDisplay('CommandOrControl+,');
        }
    }

    // Update shortcut display
    updateShortcutDisplay(shortcut) {
        const shortcutDisplay = document.getElementById('shortcutDisplay');
        if (shortcutDisplay) {
            // Convert electron shortcut format to display format
            const displayShortcut = this.electronToDisplayShortcut(shortcut);
            shortcutDisplay.textContent = displayShortcut;
        }
    }

    electronToDisplayShortcut(electronShortcut) {
        return electronShortcut
            .replace(/CommandOrControl/g, '⌘')
            .replace(/Command/g, '⌘')
            .replace(/Control/g, '⌃')
            .replace(/Alt/g, '⌥')
            .replace(/Shift/g, '⇧')
            .replace(/\+/g, ' ');
    }

    // Convert display format back to Electron format
    displayToElectronShortcut(displayShortcut) {
        return displayShortcut
            .replace(/⌘/g, 'CommandOrControl')
            .replace(/Ctrl/g, 'Control')
            .replace(/⌥/g, 'Alt')
            .replace(/⇧/g, 'Shift')
            .replace(/\s+/g, '+');
    }

    // Show shortcut recording modal
    showShortcutModal() {
        const modal = document.getElementById('shortcutModal');
        if (modal) {
            modal.style.display = 'flex';
            this.startShortcutRecording();
        }
    }

    // Hide shortcut recording modal
    hideShortcutModal() {
        const modal = document.getElementById('shortcutModal');
        if (modal) {
            modal.style.display = 'none';
            this.stopShortcutRecording();
        }
    }

    // Record shortcut from keyboard event
    recordShortcut(event) {
        if (!this.isRecordingShortcut) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const parts = [];
        
        // Add modifiers
        if (event.metaKey || event.ctrlKey) parts.push('CommandOrControl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        
        // Add main key (ignore modifier keys)
        if (!['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) {
            parts.push(event.key === ' ' ? 'Space' : event.key.toUpperCase());
        }
        
        if (parts.length >= 2) { // At least one modifier + one key
            this.tempShortcut = parts.join('+');
            
            const recording = document.getElementById('shortcutRecording');
            const saveBtn = document.getElementById('saveShortcutBtn');
            
            if (recording) {
                recording.textContent = this.electronToDisplayShortcut(this.tempShortcut);
            }
            
            if (saveBtn) {
                saveBtn.disabled = false;
            }
            
            console.log('🎹 Recorded shortcut:', this.tempShortcut);
        }
    }

    // Save the recorded shortcut
    async saveNewShortcut() {
        if (!this.tempShortcut) return;
        
        try {
            if (typeof window.electronAPI !== 'undefined') {
                // Save the new shortcut
                const settings = await window.electronAPI.getSettings();
                settings.recordingShortcut = this.tempShortcut;
                await window.electronAPI.saveSettings(settings);
                
                this.currentShortcut = this.tempShortcut;
                this.updateShortcutDisplay(this.tempShortcut);
                this.showNotification('Shortcut updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to save shortcut:', error);
            this.showNotification('Failed to save shortcut', 'error');
        }
        
        this.hideShortcutModal();
    }

    async setupPermissionChecks() {
        // Only set up permission request buttons, don't check statuses yet
        this.setupPermissionButtons();
    }

    async checkPermissionStatuses() {
        try {
            // Check microphone permission status only (don't request it)
            if (window.electronAPI && window.electronAPI.checkMicrophonePermission) {
                try {
                    const micStatus = await window.electronAPI.checkMicrophonePermission();
                    this.updatePermissionStatus('micPermissionStatus', micStatus);
                    this.updatePermissionButton('requestMicPermissionBtn', micStatus);
                } catch (error) {
                    // If checking fails, show as unknown
                    this.updatePermissionStatus('micPermissionStatus', 'unknown');
                    this.updatePermissionButton('requestMicPermissionBtn', 'unknown');
                }
            }
            
            // Check accessibility permission
            if (window.electronAPI && window.electronAPI.checkAccessibilityPermission) {
                try {
                    const accessibilityStatus = await window.electronAPI.checkAccessibilityPermission();
                    this.updatePermissionStatus('accessibilityPermissionStatus', accessibilityStatus ? 'granted' : 'denied');
                    this.updatePermissionButton('requestAccessibilityPermissionBtn', accessibilityStatus ? 'granted' : 'denied');
                } catch (error) {
                    // If checking fails, show as unknown
                    this.updatePermissionStatus('accessibilityPermissionStatus', 'unknown');
                    this.updatePermissionButton('requestAccessibilityPermissionBtn', 'unknown');
                }
            }
        } catch (error) {
            console.error('Failed to check permission statuses:', error);
        }
    }

    updatePermissionStatus(elementId, status) {
        const statusElement = document.getElementById(elementId);
        if (statusElement) {
            let statusText = '';
            let statusClass = '';
            
            switch (status) {
                case 'granted':
                case true:
                    statusText = '✅ Granted';
                    statusClass = 'status-granted';
                    break;
                case 'denied':
                case false:
                    statusText = '❌ Denied';
                    statusClass = 'status-denied';
                    break;
                case 'not-determined':
                    statusText = '⚠️ Not Set';
                    statusClass = 'status-checking';
                    break;
                case 'not-checked':
                    statusText = '⏳ Click to check';
                    statusClass = 'status-checking';
                    break;
                default:
                    statusText = '❓ Unknown';
                    statusClass = 'status-checking';
            }
            
            statusElement.textContent = statusText;
            statusElement.className = `status-indicator ${statusClass}`;
        }
    }

    updatePermissionButton(buttonId, status) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (status === 'granted' || status === true) {
                button.textContent = '✅ Granted';
                button.disabled = true;
                button.style.background = 'rgba(34, 197, 94, 0.3)';
                button.style.color = '#22c55e';
            } else {
                button.textContent = 'Grant Access';
                button.disabled = false;
                button.style.background = '';
                button.style.color = '';
            }
        }
    }

    setupPermissionButtons() {
        const micButton = document.getElementById('requestMicPermissionBtn');
        if (micButton) {
            micButton.addEventListener('click', async () => {
                try {
                    // Show loading state
                    micButton.disabled = true;
                    micButton.textContent = 'Checking...';
                    
                    // This will trigger the system permission popup
                    const granted = await window.electronAPI.checkMicrophonePermission();
                    this.updatePermissionStatus('micPermissionStatus', granted);
                    this.updatePermissionButton('requestMicPermissionBtn', granted);
                    
                    if (granted === 'granted') {
                        this.showNotification('Microphone access granted!', 'success');
                    } else {
                        this.showNotification('Please grant microphone access in System Settings', 'warning');
                    }
                } catch (error) {
                    console.error('Failed to check microphone permission:', error);
                    this.showNotification('Failed to check microphone permission', 'error');
                    
                    // Reset button
                    micButton.disabled = false;
                    micButton.textContent = 'Grant Access';
                }
            });
        }

        const accessibilityButton = document.getElementById('requestAccessibilityPermissionBtn');
        if (accessibilityButton) {
            accessibilityButton.addEventListener('click', async () => {
                try {
                    // Show loading state
                    accessibilityButton.disabled = true;
                    accessibilityButton.textContent = 'Opening Settings...';
                    
                    const granted = await window.electronAPI.requestAccessibilityPermission();
                    this.updatePermissionStatus('accessibilityPermissionStatus', granted ? 'granted' : 'denied');
                    this.updatePermissionButton('requestAccessibilityPermissionBtn', granted ? 'granted' : 'denied');
                    
                    if (granted) {
                        this.showNotification('Accessibility permission granted! Auto-paste is now enabled.', 'success');
                    } else {
                        this.showNotification('Please grant Accessibility permission in System Settings for auto-paste to work.', 'warning');
                        // Reset button if not granted
                        accessibilityButton.disabled = false;
                        accessibilityButton.textContent = 'Grant Access';
                    }
                } catch (error) {
                    console.error('Failed to request accessibility permission:', error);
                    this.showNotification('Failed to request accessibility permission', 'error');
                    
                    // Reset button
                    accessibilityButton.disabled = false;
                    accessibilityButton.textContent = 'Grant Access';
                }
            });
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
                <span class="notification-icon">${iconName === 'check_circle_outline' ? '✅' : iconName === 'warning' ? '⚠️' : '❌'}</span>
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
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
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
            }, 300);
        }, 3000);
    }

    openGetApiKeyPage() {
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.openExternalUrl('https://platform.openai.com/api-keys');
        }
    }

    startShortcutRecording() {
        this.isRecordingShortcut = true;
        this.tempShortcut = '';
        
        const recordingElement = document.getElementById('shortcutRecording');
        const saveBtn = document.getElementById('saveShortcutBtn');
        
        if (recordingElement) {
            recordingElement.textContent = 'Waiting for input...';
        }
        
        if (saveBtn) {
            saveBtn.disabled = true;
        }
        
        // Add keyboard event listener for recording
        document.addEventListener('keydown', this.handleShortcutKeydown.bind(this));
    }

    stopShortcutRecording() {
        this.isRecordingShortcut = false;
        document.removeEventListener('keydown', this.handleShortcutKeydown.bind(this));
    }

    handleShortcutKeydown(event) {
        if (!this.isRecordingShortcut) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        // Build shortcut string
        const parts = [];
        
        if (event.metaKey || event.ctrlKey) {
            parts.push('CommandOrControl');
        }
        if (event.altKey) {
            parts.push('Alt');
        }
        if (event.shiftKey) {
            parts.push('Shift');
        }
        
        // Add the main key (ignore modifier-only presses)
        if (event.key && !['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) {
            parts.push(event.key.toUpperCase());
            
            this.tempShortcut = parts.join('+');
            
            const recordingElement = document.getElementById('shortcutRecording');
            const saveBtn = document.getElementById('saveShortcutBtn');
            
            if (recordingElement) {
                recordingElement.textContent = this.electronToDisplayShortcut(this.tempShortcut);
            }
            
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        }
    }
}

// Initialize the onboarding app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Initializing onboarding app');
    new OnboardingApp();
}); 