// Settings window functionality
console.log('🔧 Settings window script loaded');

class SettingsWindow {
    constructor() {
        this.isCapturingShortcut = false;
        this.currentShortcutData = null;
        this.initializeEventListeners();
        this.loadSettings();
        this.loadPermissionStatuses();
    }

    initializeEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelSettings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Form submission
        const form = document.getElementById('settingsForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Shortcut input events
        this.initializeShortcutCapture();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isCapturingShortcut) {
                this.handleShortcutCapture(e);
                return;
            }
            
            if (e.key === 'Escape') {
                this.closeWindow();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.saveSettings();
            }
        });

        // Permission buttons
        const checkMicBtn = document.getElementById('checkMicBtn');
        if (checkMicBtn) {
            checkMicBtn.addEventListener('click', async () => {
                try {
                    const micStatus = await window.electronAPI.checkMicrophonePermission();
                    this.updatePermissionStatus('microphoneStatus', micStatus);
                } catch (error) {
                    console.error('Failed to check microphone permission:', error);
                    this.showNotification('Failed to check microphone permission', 'error');
                }
            });
        }

        const requestAccessibilityBtn = document.getElementById('requestAccessibilityBtn');
        if (requestAccessibilityBtn) {
            requestAccessibilityBtn.addEventListener('click', async () => {
                try {
                    const granted = await window.electronAPI.requestAccessibilityPermission();
                    this.updatePermissionStatus('accessibilityStatus', granted);
                    
                    if (granted) {
                        this.showNotification('Accessibility permission granted! Auto-paste is now enabled.', 'success');
                    } else {
                        this.showNotification('Please grant Accessibility permission in System Settings for auto-paste to work.', 'warning');
                    }
                } catch (error) {
                    console.error('Failed to request accessibility permission:', error);
                    this.showNotification('Failed to request accessibility permission', 'error');
                }
            });
        }
    }

    initializeShortcutCapture() {
        const shortcutInput = document.getElementById('recordingShortcut');
        const clearBtn = document.getElementById('clearShortcut');

        if (shortcutInput) {
            shortcutInput.addEventListener('focus', () => {
                this.startShortcutCapture();
            });

            shortcutInput.addEventListener('blur', () => {
                this.stopShortcutCapture();
            });

            shortcutInput.addEventListener('click', () => {
                if (!this.isCapturingShortcut) {
                    shortcutInput.focus();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearShortcut();
            });
        }
    }

    startShortcutCapture() {
        const shortcutInput = document.getElementById('recordingShortcut');
        this.isCapturingShortcut = true;
        
        if (shortcutInput) {
            shortcutInput.classList.add('capturing');
            shortcutInput.placeholder = 'Press your key combination...';
            shortcutInput.value = '';
        }
        
        console.log('🎯 Started shortcut capture');
    }

    stopShortcutCapture() {
        const shortcutInput = document.getElementById('recordingShortcut');
        this.isCapturingShortcut = false;
        
        if (shortcutInput) {
            shortcutInput.classList.remove('capturing');
            shortcutInput.placeholder = 'Click and press keys...';
            
            // If no shortcut was captured, restore the previous value
            if (!this.currentShortcutData && shortcutInput.value === '') {
                this.loadCurrentShortcut();
            }
        }
        
        console.log('🛑 Stopped shortcut capture');
    }

    handleShortcutCapture(e) {
        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier keys by themselves
        if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        // Build the key combination
        const modifiers = [];
        const displayModifiers = [];
        
        if (e.metaKey || e.ctrlKey) {
            modifiers.push('CommandOrControl');
            displayModifiers.push(e.metaKey ? '⌘' : 'Ctrl');
        }
        
        if (e.altKey) {
            modifiers.push('Alt');
            displayModifiers.push(e.altKey ? '⌥' : 'Alt');
        }
        
        if (e.shiftKey) {
            modifiers.push('Shift');
            displayModifiers.push('⇧');
        }

        // Get the main key
        let mainKey = e.key;
        let displayKey = e.key;

        // Handle special keys
        const keyMappings = {
            ' ': { electron: 'Space', display: 'Space' },
            'ArrowUp': { electron: 'Up', display: '↑' },
            'ArrowDown': { electron: 'Down', display: '↓' },
            'ArrowLeft': { electron: 'Left', display: '←' },
            'ArrowRight': { electron: 'Right', display: '→' },
            'Delete': { electron: 'Delete', display: 'Del' },
            'Backspace': { electron: 'Backspace', display: '⌫' },
            'Enter': { electron: 'Return', display: '↵' },
            'Tab': { electron: 'Tab', display: '⇥' },
            'Escape': { electron: 'Escape', display: 'Esc' }
        };

        if (keyMappings[mainKey]) {
            mainKey = keyMappings[mainKey].electron;
            displayKey = keyMappings[mainKey].display;
        }

        // Handle function keys
        if (mainKey.startsWith('F') && mainKey.length <= 3 && !isNaN(mainKey.slice(1))) {
            displayKey = mainKey;
        }

        // Handle numbers and letters
        if (mainKey.length === 1) {
            if (mainKey >= '0' && mainKey <= '9') {
                displayKey = mainKey;
            } else if (mainKey >= 'a' && mainKey <= 'z') {
                displayKey = mainKey.toUpperCase();
            } else if (mainKey >= 'A' && mainKey <= 'Z') {
                displayKey = mainKey;
            } else {
                // Special characters
                const specialChars = {
                    ',': ',',
                    '.': '.',
                    '/': '/',
                    ';': ';',
                    "'": "'",
                    '[': '[',
                    ']': ']',
                    '\\': '\\',
                    '=': '=',
                    '-': '-',
                    '`': '`'
                };
                displayKey = specialChars[mainKey] || mainKey;
            }
        }

        // Create the shortcut strings
        const electronShortcut = modifiers.length > 0 
            ? `${modifiers.join('+')}+${mainKey}`
            : mainKey;
            
        const displayShortcut = modifiers.length > 0 
            ? `${displayModifiers.join('+')}+${displayKey}`
            : displayKey;

        // Validate the shortcut
        if (!this.isValidShortcut(electronShortcut)) {
            console.warn('⚠️ Invalid shortcut:', electronShortcut);
            return;
        }

        // Store the shortcut data
        this.currentShortcutData = {
            electron: electronShortcut,
            display: displayShortcut
        };

        // Update the input
        const shortcutInput = document.getElementById('recordingShortcut');
        if (shortcutInput) {
            shortcutInput.value = displayShortcut;
            shortcutInput.setAttribute('data-electron-shortcut', electronShortcut);
        }

        console.log('🎯 Captured shortcut:', electronShortcut, 'Display:', displayShortcut);

        // Stop capturing after a brief delay
        setTimeout(() => {
            this.stopShortcutCapture();
        }, 100);
    }

    isValidShortcut(shortcut) {
        // Must have at least one modifier for global shortcuts (except function keys)
        const hasModifier = shortcut.includes('CommandOrControl') || 
                           shortcut.includes('Alt') || 
                           shortcut.includes('Shift');
        const isFunctionKey = /^F\d{1,2}$/.test(shortcut);
        
        return hasModifier || isFunctionKey;
    }

    clearShortcut() {
        const shortcutInput = document.getElementById('recordingShortcut');
        if (shortcutInput) {
            shortcutInput.value = '';
            shortcutInput.removeAttribute('data-electron-shortcut');
        }
        this.currentShortcutData = null;
        console.log('🗑️ Cleared shortcut');
    }

    async loadCurrentShortcut() {
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const settings = await window.electronAPI.getSettings();
                const electronShortcut = settings.recordingShortcut || 'CommandOrControl+,';
                const displayShortcut = this.electronToDisplayShortcut(electronShortcut);
                
                const shortcutInput = document.getElementById('recordingShortcut');
                if (shortcutInput) {
                    shortcutInput.value = displayShortcut;
                    shortcutInput.setAttribute('data-electron-shortcut', electronShortcut);
                }
                
                this.currentShortcutData = {
                    electron: electronShortcut,
                    display: displayShortcut
                };
            } catch (error) {
                console.error('❌ Failed to load current shortcut:', error);
            }
        }
    }

    electronToDisplayShortcut(electronShortcut) {
        let display = electronShortcut;
        
        // Replace modifiers
        display = display.replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
        display = display.replace('Alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt');
        display = display.replace('Shift', '⇧');
        
        // Replace special keys
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
        
        Object.entries(keyReplacements).forEach(([electron, display]) => {
            display = display.replace(new RegExp(`\\b${electron}\\b`, 'g'), display);
        });
        
        return display;
    }

    async loadSettings() {
        console.log('⚙️ Loading settings...');
        
        if (typeof window.electronAPI !== 'undefined') {
            try {
                const settings = await window.electronAPI.getSettings();
                console.log('📋 Settings loaded:', settings);
                
                const provider = document.getElementById('provider');
                const model = document.getElementById('model');
                const apiKey = document.getElementById('apiKey');
                
                if (provider) provider.value = settings.provider || 'openai';
                if (model) model.value = settings.model || 'whisper-1';
                if (apiKey) apiKey.value = settings.apiKey || '';
                
                // Load shortcut
                await this.loadCurrentShortcut();
                
            } catch (error) {
                console.error('❌ Failed to load settings:', error);
                this.showNotification('Failed to load settings', 'error');
            }
        } else {
            console.warn('⚠️ Electron API not available');
        }
    }

    async saveSettings() {
        console.log('💾 Saving settings...');
        
        if (typeof window.electronAPI === 'undefined') {
            this.showNotification('Electron API not available', 'error');
            return;
        }

        try {
            const formData = new FormData(document.getElementById('settingsForm'));
            const shortcutInput = document.getElementById('recordingShortcut');
            
            // Get the electron format shortcut
            let recordingShortcut = 'CommandOrControl+,'; // default
            if (shortcutInput && shortcutInput.getAttribute('data-electron-shortcut')) {
                recordingShortcut = shortcutInput.getAttribute('data-electron-shortcut');
            } else if (this.currentShortcutData) {
                recordingShortcut = this.currentShortcutData.electron;
            }
            
            const settings = {
                provider: formData.get('provider') || 'openai',
                model: formData.get('model') || 'whisper-1',
                recordingShortcut: recordingShortcut
            };
            
            console.log('📤 Saving settings:', settings);
            await window.electronAPI.saveSettings(settings);
            
            // Save API key separately for security
            const apiKey = formData.get('apiKey');
            if (apiKey) {
                console.log('🔑 Saving API key securely...');
                await window.electronAPI.saveApiKey(apiKey);
                console.log('✅ API key saved successfully');
            }
            
            this.showNotification('Settings saved successfully!');
            
            // Update shortcut display in main window if available
            if (typeof window.opener !== 'undefined' && window.opener && window.opener.app) {
                try {
                    await window.opener.app.updateShortcutDisplay();
                } catch (error) {
                    console.log('⚠️ Could not update shortcut display in main window');
                }
            }
            
            // Close window after a brief delay
            setTimeout(() => {
                this.closeWindow();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    closeWindow() {
        console.log('🔒 Closing settings window...');
        if (typeof window.electronAPI !== 'undefined') {
            window.close();
        }
    }

    showNotification(message, type = 'success') {
        console.log(`${type === 'error' ? '❌' : '✅'} ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : '#4caf50'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async loadPermissionStatuses() {
        try {
            // Check microphone permission
            if (window.electronAPI.checkMicrophonePermission) {
                const micStatus = await window.electronAPI.checkMicrophonePermission();
                this.updatePermissionStatus('microphoneStatus', micStatus);
            }
            
            // Check accessibility permission  
            if (window.electronAPI.checkAccessibilityPermission) {
                const accessibilityStatus = await window.electronAPI.checkAccessibilityPermission();
                this.updatePermissionStatus('accessibilityStatus', accessibilityStatus ? 'granted' : 'denied');
            }
        } catch (error) {
            console.error('Failed to load permission statuses:', error);
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
                    statusText = '⚠️ Not Determined';
                    statusClass = 'status-unknown';
                    break;
                default:
                    statusText = '❓ Unknown';
                    statusClass = 'status-unknown';
            }
            
            statusElement.textContent = statusText;
            statusElement.className = `status-indicator ${statusClass}`;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Settings window initialized');
    new SettingsWindow();
}); 