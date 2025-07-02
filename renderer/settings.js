// Settings window functionality
console.log('🔧 Settings window script loaded');

class SettingsWindow {
    constructor() {
        this.isCapturingShortcut = false;
        this.currentShortcutData = null;
        this.currentModeSettings = null;
        this.initializeEventListeners();
        this.loadSettings();
        this.loadPermissionStatuses();
        this.loadModeSettings();
        this.loadAppVersion();
    }

    initializeEventListeners() {
        // Tab navigation
        this.initializeTabNavigation();

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

        // Save button - update to handle both general and mode settings
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveAllSettings();
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
                // Check if we're capturing a mode shortcut
                const activeInput = document.activeElement;
                if (activeInput && activeInput.classList.contains('mode-shortcut-input')) {
                    const modeKey = activeInput.getAttribute('data-mode');
                    if (modeKey) {
                        this.handleModeShortcutCapture(e, modeKey);
                        return;
                    }
                }
                
                // Otherwise handle regular shortcut capture
                this.handleShortcutCapture(e);
                return;
            }
            
            if (e.key === 'Escape') {
                this.closeWindow();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.saveAllSettings();
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

        // Custom mode creation buttons
        this.initializeCustomModeHandlers();
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
                const chatGptModel = document.getElementById('chatGptModel');
                const apiKey = document.getElementById('apiKey');
                
                if (provider) provider.value = settings.provider || 'openai';
                if (model) model.value = settings.model || 'whisper-1';
                if (chatGptModel) chatGptModel.value = settings.chatGptModel || 'gpt-3.5-turbo';
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
        return this.saveGeneralSettings();
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

    async loadAppVersion() {
        console.log('📦 Loading app version...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getAppVersion) {
            try {
                const version = await window.electronAPI.getAppVersion();
                console.log('📋 App version loaded:', version);
                
                const versionElement = document.getElementById('appVersion');
                if (versionElement) {
                    versionElement.textContent = `v${version}`;
                }
            } catch (error) {
                console.error('❌ Failed to load app version:', error);
                const versionElement = document.getElementById('appVersion');
                if (versionElement) {
                    versionElement.textContent = 'Version unknown';
                }
            }
        } else {
            console.warn('⚠️ Electron API not available for version check');
            const versionElement = document.getElementById('appVersion');
            if (versionElement) {
                versionElement.textContent = 'Version unavailable';
            }
        }
    }

    async loadModeSettings() {
        console.log('🎭 Loading mode settings...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getModeSettings) {
            try {
                this.currentModeSettings = await window.electronAPI.getModeSettings();
                console.log('📋 Mode settings loaded:', this.currentModeSettings);
                
                // Populate user name
                const userNameInput = document.getElementById('userName');
                if (userNameInput) {
                    userNameInput.value = this.currentModeSettings.userName || '';
                }
                
                // Generate mode items
                this.generateModeItems();
                
            } catch (error) {
                console.error('❌ Failed to load mode settings:', error);
                this.showNotification('Failed to load mode settings', 'error');
            }
        } else {
            console.warn('⚠️ Mode settings API not available');
        }
    }

    generateModeItems() {
        const modesList = document.getElementById('modesList');
        if (!modesList || !this.currentModeSettings) return;
        
        modesList.innerHTML = '';
        
        // Built-in modes that cannot be deleted
        const builtInModes = ['transcript', 'email', 'slack', 'notes', 'tasks'];
        
        Object.entries(this.currentModeSettings.modes).forEach(([modeKey, modeConfig]) => {
            const isCustomMode = !builtInModes.includes(modeKey);
            
            const modeItem = document.createElement('div');
            modeItem.className = 'mode-item';
            modeItem.innerHTML = `
                <div class="mode-header">
                    <div class="mode-title">
                        ${modeConfig.name}
                        ${isCustomMode ? '<span style="font-size: 12px; color: #666; font-weight: normal;">(Custom)</span>' : ''}
                    </div>
                    <div class="mode-toggle" style="display: flex; align-items: center; gap: 12px;">
                        ${isCustomMode ? `
                            <button type="button" class="btn btn-secondary delete-mode-btn" data-mode="${modeKey}" style="padding: 4px 8px; font-size: 11px; color: #d32f2f;">
                                <span class="material-icons" style="font-size: 14px;">delete</span>
                                Delete
                            </button>
                        ` : ''}
                        <label for="mode-${modeKey}-enabled">Enabled:</label>
                        <input type="checkbox" id="mode-${modeKey}-enabled" ${modeConfig.enabled ? 'checked' : ''}>
                    </div>
                </div>
                
                <!-- Shortcut Configuration -->
                <div class="prompt-group" style="margin-bottom: 16px;">
                    <label class="prompt-label" for="mode-${modeKey}-shortcut" style="display: flex; justify-content: space-between; align-items: center;">
                        Keyboard Shortcut:
                        <button type="button" class="reset-btn clear-shortcut-btn" data-mode="${modeKey}" style="font-size: 11px;">
                            Clear
                        </button>
                    </label>
                    <input 
                        type="text" 
                        id="mode-${modeKey}-shortcut" 
                        class="mode-shortcut-input"
                        data-mode="${modeKey}"
                        data-electron-shortcut="${modeConfig.shortcut || ''}"
                        placeholder="Click and press key combination..."
                        value="${this.electronToDisplayShortcut(modeConfig.shortcut || '')}"
                        readonly
                        style="padding: 8px; font-size: 13px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;"
                    >
                    <small style="color: #666; font-size: 11px; margin-top: 4px; display: block;">
                        This shortcut will start recording directly in ${modeConfig.name} mode
                    </small>
                </div>
                
                <div class="prompt-group">
                    <label class="prompt-label" for="mode-${modeKey}-prompt">
                        Prompt Template:
                        ${!isCustomMode ? `<button type="button" class="reset-btn" data-mode="${modeKey}">Reset to Default</button>` : ''}
                    </label>
                    <textarea 
                        id="mode-${modeKey}-prompt" 
                        rows="4" 
                        placeholder="Enter the prompt template for this mode..."
                    >${modeConfig.prompt}</textarea>
                    <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">
                        Use {userName} as a placeholder for the user's name.
                    </small>
                </div>
            `;
            
            modesList.appendChild(modeItem);
            
            // Add reset button listener (for built-in modes only)
            const resetBtn = modeItem.querySelector('.reset-btn[data-mode]');
            if (resetBtn && !resetBtn.classList.contains('clear-shortcut-btn')) {
                resetBtn.addEventListener('click', () => {
                    this.resetModeToDefault(modeKey);
                });
            }
            
            // Add delete button listener (for custom modes only)
            const deleteBtn = modeItem.querySelector('.delete-mode-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteCustomMode(modeKey);
                });
            }
            
            // Add shortcut input listeners
            const shortcutInput = modeItem.querySelector('.mode-shortcut-input');
            const clearShortcutBtn = modeItem.querySelector('.clear-shortcut-btn');
            
            if (shortcutInput) {
                shortcutInput.addEventListener('click', () => {
                    this.startModeShortcutCapture(modeKey);
                });
                shortcutInput.addEventListener('focus', () => {
                    this.startModeShortcutCapture(modeKey);
                });
            }
            
            if (clearShortcutBtn) {
                clearShortcutBtn.addEventListener('click', () => {
                    this.clearModeShortcut(modeKey);
                });
            }
        });
    }

    async resetModeToDefault(modeKey) {
        console.log('🔄 Resetting mode to default:', modeKey);
        
        // Default prompts and shortcuts (should match ModeService defaults)
        const defaultModes = {
            transcript: {
                prompt: 'Return the transcript as-is without any modifications.',
                shortcut: 'CommandOrControl+T'
            },
            email: {
                prompt: 'Draft a professional email based on the information below. Remove any subject line from the output. Format it as a complete email body. Sign it on behalf of {userName}.',
                shortcut: 'CommandOrControl+E'
            },
            slack: {
                prompt: 'Convert the following into a casual, friendly Slack message. Make it conversational and appropriate for team communication. Keep it concise and engaging.',
                shortcut: 'CommandOrControl+S'
            },
            notes: {
                prompt: 'Convert the following transcript into structured meeting notes. Organize the content with clear headings, key points, and action items if mentioned.',
                shortcut: 'CommandOrControl+N'
            },
            tasks: {
                prompt: 'Extract and format action items from the following transcript. Present them as a clear, numbered list with any mentioned deadlines or responsible parties.',
                shortcut: 'CommandOrControl+A'
            }
        };
        
        const defaultMode = defaultModes[modeKey];
        if (defaultMode) {
            // Reset prompt
            const promptTextarea = document.getElementById(`mode-${modeKey}-prompt`);
            if (promptTextarea) {
                promptTextarea.value = defaultMode.prompt;
            }
            
            // Reset shortcut
            const shortcutInput = document.getElementById(`mode-${modeKey}-shortcut`);
            if (shortcutInput) {
                shortcutInput.value = this.electronToDisplayShortcut(defaultMode.shortcut);
                shortcutInput.setAttribute('data-electron-shortcut', defaultMode.shortcut);
            }
            
            this.showNotification(`${this.currentModeSettings.modes[modeKey].name} reset to default`);
        }
    }

    async saveAllSettings() {
        console.log('💾 Saving all settings...');
        
        if (typeof window.electronAPI === 'undefined') {
            this.showNotification('Electron API not available', 'error');
            return;
        }

        try {
            // Save general settings (existing functionality)
            await this.saveGeneralSettings();
            
            // Save mode settings
            await this.saveModeSettings();
            
            this.showNotification('All settings saved successfully!');
            
            // Refresh the main window's mode dropdown if available
            if (typeof window.opener !== 'undefined' && window.opener && window.opener.app) {
                try {
                    await window.opener.app.refreshAvailableModes();
                    console.log('🔄 Refreshed main window mode dropdown');
                } catch (error) {
                    console.log('⚠️ Could not refresh main window mode dropdown');
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async saveGeneralSettings() {
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
            chatGptModel: formData.get('chatGptModel') || 'gpt-3.5-turbo',
            recordingShortcut: recordingShortcut
        };
        
        console.log('📤 Saving general settings:', settings);
        await window.electronAPI.saveSettings(settings);
        
        // Save API key separately for security
        const apiKey = formData.get('apiKey');
        if (apiKey) {
            console.log('🔑 Saving API key securely...');
            await window.electronAPI.saveApiKey(apiKey);
            console.log('✅ API key saved successfully');
        }
    }

    async saveModeSettings() {
        if (!this.currentModeSettings) {
            console.warn('⚠️ No mode settings to save');
            return;
        }

        // Get user name
        const userNameInput = document.getElementById('userName');
        const userName = userNameInput ? userNameInput.value.trim() : '';
        
        // Update mode settings from form
        const updatedModeSettings = {
            userName: userName || 'User',
            modes: {}
        };
        
        Object.keys(this.currentModeSettings.modes).forEach(modeKey => {
            const enabledCheckbox = document.getElementById(`mode-${modeKey}-enabled`);
            const promptTextarea = document.getElementById(`mode-${modeKey}-prompt`);
            const shortcutInput = document.getElementById(`mode-${modeKey}-shortcut`);
            
            // Get shortcut value (electron format)
            let shortcut = '';
            if (shortcutInput) {
                shortcut = shortcutInput.getAttribute('data-electron-shortcut') || '';
            }
            
            updatedModeSettings.modes[modeKey] = {
                name: this.currentModeSettings.modes[modeKey].name,
                enabled: enabledCheckbox ? enabledCheckbox.checked : true,
                prompt: promptTextarea ? promptTextarea.value.trim() : this.currentModeSettings.modes[modeKey].prompt,
                shortcut: shortcut
            };
        });
        
        console.log('📤 Saving mode settings:', updatedModeSettings);
        
        if (window.electronAPI.saveModeSettings) {
            await window.electronAPI.saveModeSettings(updatedModeSettings);
            console.log('✅ Mode settings saved successfully');
        } else {
            console.warn('⚠️ saveModeSettings API not available');
        }
    }

    initializeTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Stop any shortcut capture when switching tabs
                if (this.isCapturingShortcut) {
                    this.stopShortcutCapture();
                    this.stopModeShortcutCapture();
                }
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                console.log('🔄 Switched to tab:', targetTab);
            });
        });
        
        // Stop shortcut capture when window loses focus
        window.addEventListener('blur', () => {
            if (this.isCapturingShortcut) {
                this.stopShortcutCapture();
                this.stopModeShortcutCapture();
            }
        });
    }

    initializeCustomModeHandlers() {
        // Add mode button
        const addModeBtn = document.getElementById('addModeBtn');
        if (addModeBtn) {
            addModeBtn.addEventListener('click', () => {
                this.showNewModeForm();
            });
        }

        // Cancel new mode
        const cancelModeBtn = document.getElementById('cancelModeBtn');
        if (cancelModeBtn) {
            cancelModeBtn.addEventListener('click', () => {
                this.hideNewModeForm();
            });
        }

        // Create new mode
        const createModeBtn = document.getElementById('createModeBtn');
        if (createModeBtn) {
            createModeBtn.addEventListener('click', () => {
                this.createCustomMode();
            });
        }

        // Auto-generate mode key from name
        const newModeName = document.getElementById('newModeName');
        const newModeKey = document.getElementById('newModeKey');
        if (newModeName && newModeKey) {
            newModeName.addEventListener('input', (e) => {
                const name = e.target.value;
                // Auto-generate key from name
                const key = name.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                    .replace(/\s+/g, '') // Remove spaces
                    .substring(0, 20); // Limit length
                newModeKey.value = key;
            });
        }
    }

    showNewModeForm() {
        const newModeForm = document.getElementById('newModeForm');
        const addModeBtn = document.getElementById('addModeBtn');
        
        if (newModeForm) {
            newModeForm.style.display = 'block';
        }
        if (addModeBtn) {
            addModeBtn.style.display = 'none';
        }
        
        // Clear form
        this.clearNewModeForm();
        
        // Focus on name field
        const nameField = document.getElementById('newModeName');
        if (nameField) {
            nameField.focus();
        }
    }

    hideNewModeForm() {
        const newModeForm = document.getElementById('newModeForm');
        const addModeBtn = document.getElementById('addModeBtn');
        
        if (newModeForm) {
            newModeForm.style.display = 'none';
        }
        if (addModeBtn) {
            addModeBtn.style.display = 'flex';
        }
        
        this.clearNewModeForm();
    }

    clearNewModeForm() {
        const nameField = document.getElementById('newModeName');
        const keyField = document.getElementById('newModeKey');
        const promptField = document.getElementById('newModePrompt');
        
        if (nameField) nameField.value = '';
        if (keyField) keyField.value = '';
        if (promptField) promptField.value = '';
    }

    async createCustomMode() {
        const nameField = document.getElementById('newModeName');
        const keyField = document.getElementById('newModeKey');
        const promptField = document.getElementById('newModePrompt');
        
        if (!nameField || !keyField || !promptField) {
            this.showNotification('Form fields not found', 'error');
            return;
        }
        
        const name = nameField.value.trim();
        const key = keyField.value.trim();
        const prompt = promptField.value.trim();
        
        // Validation
        if (!name) {
            this.showNotification('Please enter a mode name', 'error');
            nameField.focus();
            return;
        }
        
        if (!key) {
            this.showNotification('Please enter a mode key', 'error');
            keyField.focus();
            return;
        }
        
        if (!/^[a-z0-9]+$/.test(key)) {
            this.showNotification('Mode key must contain only lowercase letters and numbers', 'error');
            keyField.focus();
            return;
        }
        
        if (!prompt) {
            this.showNotification('Please enter a prompt template', 'error');
            promptField.focus();
            return;
        }
        
        // Check if key already exists
        if (this.currentModeSettings.modes[key]) {
            this.showNotification('A mode with this key already exists', 'error');
            keyField.focus();
            return;
        }
        
        // Create the new mode
        const newMode = {
            name: name,
            prompt: prompt,
            enabled: true
        };
        
        // Add to current settings
        this.currentModeSettings.modes[key] = newMode;
        
        // Regenerate the list
        this.generateModeItems();
        
        // Hide form
        this.hideNewModeForm();
        
        this.showNotification(`Custom mode "${name}" created successfully!`);
        
        // Refresh the main window's mode dropdown immediately
        if (typeof window.opener !== 'undefined' && window.opener && window.opener.app) {
            try {
                window.opener.app.refreshAvailableModes();
                console.log('🔄 Refreshed main window mode dropdown after creating mode');
            } catch (error) {
                console.log('⚠️ Could not refresh main window mode dropdown');
            }
        }
        
        console.log('🎭 Created custom mode:', key, newMode);
    }

    async deleteCustomMode(modeKey) {
        const modeConfig = this.currentModeSettings.modes[modeKey];
        if (!modeConfig) return;
        
        const confirmed = confirm(`Are you sure you want to delete the custom mode "${modeConfig.name}"? This action cannot be undone.`);
        
        if (confirmed) {
            // Remove from settings
            delete this.currentModeSettings.modes[modeKey];
            
            // Regenerate the list
            this.generateModeItems();
            
            this.showNotification(`Custom mode "${modeConfig.name}" deleted successfully!`);
            
            console.log('🗑️ Deleted custom mode:', modeKey);
        }
    }

    startModeShortcutCapture(modeKey) {
        const shortcutInput = document.getElementById(`mode-${modeKey}-shortcut`);
        this.isCapturingShortcut = true;
        
        if (shortcutInput) {
            shortcutInput.classList.add('capturing');
            shortcutInput.placeholder = 'Press your key combination...';
            shortcutInput.value = '';
        }
        
        console.log('🎯 Started mode shortcut capture');
    }

    stopModeShortcutCapture() {
        this.isCapturingShortcut = false;
        
        // Find all mode shortcut inputs that are currently capturing
        const capturingInputs = document.querySelectorAll('.mode-shortcut-input.capturing');
        
        capturingInputs.forEach(shortcutInput => {
            shortcutInput.classList.remove('capturing');
            shortcutInput.placeholder = 'Click and press key combination...';
            
            // If no shortcut was captured, restore the previous value from data attribute
            if (!this.currentShortcutData && shortcutInput.value === '') {
                const storedShortcut = shortcutInput.getAttribute('data-electron-shortcut');
                if (storedShortcut) {
                    shortcutInput.value = this.electronToDisplayShortcut(storedShortcut);
                }
            }
        });
        
        console.log('🛑 Stopped mode shortcut capture');
    }

    handleModeShortcutCapture(e, modeKey) {
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
        const shortcutInput = document.getElementById(`mode-${modeKey}-shortcut`);
        if (shortcutInput) {
            shortcutInput.value = displayShortcut;
            shortcutInput.setAttribute('data-electron-shortcut', electronShortcut);
        }

        console.log('🎯 Captured mode shortcut:', electronShortcut, 'Display:', displayShortcut);

        // Stop capturing after a brief delay
        setTimeout(() => {
            this.stopModeShortcutCapture();
        }, 100);
    }

    clearModeShortcut(modeKey) {
        const shortcutInput = document.getElementById(`mode-${modeKey}-shortcut`);
        if (shortcutInput) {
            shortcutInput.value = '';
            shortcutInput.removeAttribute('data-electron-shortcut');
        }
        this.currentShortcutData = null;
        console.log('🗑️ Cleared mode shortcut');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Settings window initialized');
    new SettingsWindow();
}); 