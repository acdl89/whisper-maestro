// Settings window functionality
console.log('🔧 Settings window script loaded');

class SettingsWindow {
    constructor() {
        this.isCapturingShortcut = false;
        this.currentShortcutData = null;
        this.currentModeSettings = null;
        this.personalizationEntries = [];
        
        // History functionality
        this.history = [];
        this.filteredHistory = [];
        
        this.initializeEventListeners();
        this.loadSettings();
        this.loadPermissionStatuses();
        this.loadModeSettings();
        this.loadAppVersion();
        this.loadPersonalization();
        this.loadHistory();
    }

    initializeEventListeners() {
        // Sidebar navigation
        this.initializeSidebarNavigation();

        // Close button
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
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
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                // Focus search when in history section
                const historySection = document.getElementById('historySection');
                if (historySection && historySection.classList.contains('active')) {
                    e.preventDefault();
                    const searchInput = document.getElementById('historySearch');
                    searchInput?.focus();
                }
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

        // Personalization handlers
        this.initializePersonalizationHandlers();
        
        // History handlers
        this.initializeHistoryHandlers();
    }

    initializeSidebarNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const contentSections = document.querySelectorAll('.content-section');
        const contentTitle = document.getElementById('contentTitle');
        
        const sectionTitles = {
            'general': 'General Settings',
            'modes': 'Modes & Prompts',
            'personalization': 'AI Personalization',
            'history': 'History'
        };

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetSection = item.getAttribute('data-section');
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update active content section
                contentSections.forEach(section => section.classList.remove('active'));
                const targetSectionElement = document.getElementById(targetSection + 'Section');
                if (targetSectionElement) {
                    targetSectionElement.classList.add('active');
                }
                
                // Update content title
                if (contentTitle) {
                    contentTitle.textContent = sectionTitles[targetSection] || 'Settings';
                }
                
                // Load history if switching to history section
                if (targetSection === 'history') {
                    this.loadHistory();
                }
            });
        });
    }

    initializeHistoryHandlers() {
        // Search
        const searchInput = document.getElementById('historySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterHistory(e.target.value);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadHistory();
            });
        }
    }

    async loadHistory() {
        console.log('📋 Loading history...');
        
        if (typeof window.electronAPI !== 'undefined') {
            try {
                this.history = await window.electronAPI.getHistory();
                console.log('📊 History loaded:', this.history.length, 'items');
                this.filteredHistory = [...this.history];
                this.renderHistory();
                
            } catch (error) {
                console.error('❌ Failed to load history:', error);
                this.showNotification('Failed to load history', 'error');
            }
        } else {
            console.warn('⚠️ Electron API not available');
        }
    }

    filterHistory(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredHistory = [...this.history];
        } else {
            this.filteredHistory = this.history.filter(item => 
                item.text.toLowerCase().includes(term) ||
                new Date(item.timestamp).toLocaleString().toLowerCase().includes(term)
            );
        }
        
        console.log('🔍 Filtered history:', this.filteredHistory.length, 'items');
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyState');
        
        if (!historyList || !emptyState) return;
        
        if (this.filteredHistory.length === 0) {
            historyList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        historyList.style.display = 'block';
        emptyState.style.display = 'none';
        historyList.innerHTML = '';
        
        this.filteredHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-date">${new Date(item.timestamp).toLocaleString()}</span>
                    <div class="history-item-actions">
                        <button onclick="settingsWindow.copyHistoryItem('${item.text.replace(/'/g, "\\'")}', event)" title="Copy" class="history-action-btn">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button onclick="settingsWindow.deleteHistoryItem('${item.id}', event)" title="Delete" class="history-action-btn">
                            <span class="material-icons">delete_outline</span>
                        </button>
                    </div>
                </div>
                <div class="history-item-text">${this.escapeHtml(item.text)}</div>
            `;
            historyList.appendChild(historyItem);
        });
    }

    async copyHistoryItem(text, event) {
        event?.stopPropagation();
        
        if (typeof window.electronAPI !== 'undefined') {
            try {
                await window.electronAPI.copyToClipboard(text);
                this.showNotification('Copied to clipboard!');
            } catch (error) {
                console.error('❌ Failed to copy:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(text);
                this.showNotification('Copied to clipboard!');
            } catch (error) {
                console.error('❌ Failed to copy:', error);
            }
        }
    }

    async deleteHistoryItem(id, event) {
        event?.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this transcription?')) {
            return;
        }
        
        if (typeof window.electronAPI !== 'undefined') {
            try {
                await window.electronAPI.deleteHistoryItem(id);
                this.showNotification('Item deleted!');
                await this.loadHistory(); // Refresh the list
            } catch (error) {
                console.error('❌ Failed to delete item:', error);
                this.showNotification('Failed to delete item', 'error');
            }
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
        const builtInModes = ['none', 'enhanced', 'email', 'slack', 'whatsapp', 'linkedin'];
        
        Object.entries(this.currentModeSettings.modes).forEach(([modeKey, modeConfig]) => {
            const isCustomMode = !builtInModes.includes(modeKey);
            const isRawTranscript = modeKey === 'none';
            
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
                
                ${!isRawTranscript ? `
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
                ` : `
                <div class="prompt-group" style="background: #f0f8ff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #666; font-size: 13px;">
                        <span class="material-icons" style="font-size: 16px; color: #2196f3;">info</span>
                        <span>This mode returns the transcript as-is without any AI processing. No prompt configuration needed.</span>
                    </div>
                </div>
                `}
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
            none: {
                prompt: 'Return the transcript as-is without any modifications.',
                shortcut: 'CommandOrControl+Shift+1'
            },
            enhanced: {
                prompt: 'Clean up this transcript by removing filler words (um, uh, like, you know), fixing contradictions and corrections (e.g., "tell john wait it\'s jack" becomes "tell jack"), improving grammar and clarity while maintaining the original meaning and tone.',
                shortcut: 'CommandOrControl+Shift+2'
            },
            email: {
                prompt: 'Draft a professional email based on the information below. Remove any subject line from the output. Format it as a complete email body. Sign it on behalf of {userName}.',
                shortcut: 'CommandOrControl+Shift+3'
            },
            slack: {
                prompt: 'Convert the following into a casual, friendly Slack message. Make it conversational and appropriate for team communication. Keep it concise and engaging.',
                shortcut: 'CommandOrControl+Shift+4'
            },
            whatsapp: {
                prompt: 'Convert the following into a casual WhatsApp message. Make it friendly, conversational, and suitable for personal or informal business communication. Keep it concise and use emojis sparingly if appropriate.',
                shortcut: 'CommandOrControl+Shift+5'
            },
            linkedin: {
                prompt: 'Convert the following into a professional LinkedIn post or message. Make it engaging, professional, and suitable for business networking. Include relevant insights and maintain a thought-leadership tone.',
                shortcut: 'CommandOrControl+Shift+6'
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
            shortcutInput.setAttribute('data-electron-shortcut', '');
            shortcutInput.placeholder = 'Click and press keys...';
        }
    }

    getModeDisplayName(modeKey) {
        const modeNames = {
            none: '📝 Raw Transcript',
            enhanced: '✨ Enhanced Transcript',
            email: '📧 Email',
            slack: '💬 Slack',
            whatsapp: '📱 WhatsApp',
            linkedin: '💼 LinkedIn'
        };
        return modeNames[modeKey] || modeKey;
    }

    // Personalization functionality
    initializePersonalizationHandlers() {
        const addBtn = document.getElementById('addPersonalizationBtn');
        const newEntryInput = document.getElementById('newPersonalizationEntry');

        if (addBtn && newEntryInput) {
            addBtn.addEventListener('click', () => {
                this.addPersonalizationEntry();
            });

            newEntryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addPersonalizationEntry();
                }
            });
        }
    }

    async loadPersonalization() {
        console.log('🎭 Loading personalization entries...');
        
        if (typeof window.electronAPI !== 'undefined' && window.electronAPI.getPersonalization) {
            try {
                this.personalizationEntries = await window.electronAPI.getPersonalization();
                console.log('📋 Personalization entries loaded:', this.personalizationEntries);
                this.renderPersonalizationList();
            } catch (error) {
                console.error('❌ Failed to load personalization entries:', error);
                this.personalizationEntries = [];
                this.renderPersonalizationList();
            }
        } else {
            console.warn('⚠️ Personalization API not available');
            this.personalizationEntries = [];
            this.renderPersonalizationList();
        }
    }

    renderPersonalizationList() {
        const listContainer = document.getElementById('personalizationList');
        const emptyState = document.getElementById('personalizationEmptyState');
        
        if (!listContainer || !emptyState) return;

        if (this.personalizationEntries.length === 0) {
            listContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        listContainer.style.display = 'block';
        emptyState.style.display = 'none';
        listContainer.innerHTML = '';

        this.personalizationEntries.forEach((entry, index) => {
            const itemElement = this.createPersonalizationItem(entry, index);
            listContainer.appendChild(itemElement);
        });
    }

    createPersonalizationItem(entry, index) {
        const item = document.createElement('div');
        item.className = 'personalization-item';
        item.setAttribute('data-index', index);
        
        item.innerHTML = `
            <span class="personalization-drag-handle material-icons" title="Drag to reorder">drag_indicator</span>
            <span class="personalization-text">${this.escapeHtml(entry)}</span>
            <input type="text" class="personalization-input" value="${this.escapeHtml(entry)}" style="display: none;">
            <div class="personalization-actions">
                <button class="personalization-btn edit-btn" title="Edit">
                    <span class="material-icons">edit</span>
                </button>
                <button class="personalization-btn delete-btn" title="Delete">
                    <span class="material-icons">delete</span>
                </button>
                <button class="personalization-btn save-btn" title="Save" style="display: none;">
                    <span class="material-icons">check</span>
                </button>
                <button class="personalization-btn cancel-btn" title="Cancel" style="display: none;">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `;

        // Add event listeners
        const textSpan = item.querySelector('.personalization-text');
        const input = item.querySelector('.personalization-input');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        const saveBtn = item.querySelector('.save-btn');
        const cancelBtn = item.querySelector('.cancel-btn');

        // Edit functionality
        textSpan.addEventListener('click', () => this.editPersonalizationEntry(index));
        editBtn.addEventListener('click', () => this.editPersonalizationEntry(index));
        
        // Delete functionality
        deleteBtn.addEventListener('click', () => this.deletePersonalizationEntry(index));
        
        // Save functionality
        saveBtn.addEventListener('click', () => this.savePersonalizationEntry(index));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.savePersonalizationEntry(index);
            } else if (e.key === 'Escape') {
                this.cancelEditPersonalizationEntry(index);
            }
        });
        
        // Cancel functionality
        cancelBtn.addEventListener('click', () => this.cancelEditPersonalizationEntry(index));

        // Drag and drop functionality
        const dragHandle = item.querySelector('.personalization-drag-handle');
        this.setupDragAndDrop(item, dragHandle, index);

        return item;
    }

    editPersonalizationEntry(index) {
        const item = document.querySelector(`[data-index="${index}"]`);
        if (!item) return;

        const textSpan = item.querySelector('.personalization-text');
        const input = item.querySelector('.personalization-input');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        const saveBtn = item.querySelector('.save-btn');
        const cancelBtn = item.querySelector('.cancel-btn');

        // Switch to edit mode
        item.classList.add('editing');
        textSpan.style.display = 'none';
        input.style.display = 'block';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = 'flex';
        cancelBtn.style.display = 'flex';

        // Focus input and select text
        input.focus();
        input.select();
    }

    async savePersonalizationEntry(index) {
        const item = document.querySelector(`[data-index="${index}"]`);
        if (!item) return;

        const input = item.querySelector('.personalization-input');
        const newValue = input.value.trim();

        if (!newValue) {
            this.showNotification('Entry cannot be empty', 'error');
            return;
        }

        try {
            this.personalizationEntries = await window.electronAPI.updatePersonalizationEntry(index, newValue);
            this.renderPersonalizationList();
            this.showNotification('Entry updated successfully');
        } catch (error) {
            console.error('❌ Failed to update personalization entry:', error);
            this.showNotification('Failed to update entry', 'error');
        }
    }

    cancelEditPersonalizationEntry(index) {
        const item = document.querySelector(`[data-index="${index}"]`);
        if (!item) return;

        const textSpan = item.querySelector('.personalization-text');
        const input = item.querySelector('.personalization-input');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        const saveBtn = item.querySelector('.save-btn');
        const cancelBtn = item.querySelector('.cancel-btn');

        // Reset input value
        input.value = this.personalizationEntries[index];

        // Switch back to view mode
        item.classList.remove('editing');
        textSpan.style.display = 'block';
        input.style.display = 'none';
        editBtn.style.display = 'flex';
        deleteBtn.style.display = 'flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    }

    async addPersonalizationEntry() {
        const input = document.getElementById('newPersonalizationEntry');
        if (!input) return;

        const entry = input.value.trim();
        if (!entry) {
            this.showNotification('Please enter a personalization entry', 'error');
            return;
        }

        try {
            this.personalizationEntries = await window.electronAPI.addPersonalizationEntry(entry);
            input.value = '';
            this.renderPersonalizationList();
            this.showNotification('Entry added successfully');
        } catch (error) {
            console.error('❌ Failed to add personalization entry:', error);
            this.showNotification('Failed to add entry', 'error');
        }
    }

    async deletePersonalizationEntry(index) {
        if (!confirm('Are you sure you want to delete this personalization entry?')) {
            return;
        }

        try {
            this.personalizationEntries = await window.electronAPI.removePersonalizationEntry(index);
            this.renderPersonalizationList();
            this.showNotification('Entry deleted successfully');
        } catch (error) {
            console.error('❌ Failed to delete personalization entry:', error);
            this.showNotification('Failed to delete entry', 'error');
        }
    }

    setupDragAndDrop(item, handle, index) {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            let isDragging = false;
            const startY = e.clientY;
            const itemRect = item.getBoundingClientRect();
            
            const mouseMoveHandler = (e) => {
                if (!isDragging && Math.abs(e.clientY - startY) > 5) {
                    isDragging = true;
                    item.classList.add('dragging');
                    document.body.style.cursor = 'grabbing';
                }
                
                if (isDragging) {
                    // Simple visual feedback - could implement full drag and drop later
                    const deltaY = e.clientY - startY;
                    item.style.transform = `translateY(${deltaY}px)`;
                }
            };
            
            const mouseUpHandler = async (e) => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                
                if (isDragging) {
                    item.classList.remove('dragging');
                    item.style.transform = '';
                    document.body.style.cursor = '';
                    
                    // For now, just show a message - full drag and drop can be implemented later
                    console.log('Drag and drop functionality can be enhanced later');
                }
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Settings window initialized');
    new SettingsWindow();
}); 