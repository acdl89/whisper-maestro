// History window functionality
console.log('📋 History window script loaded');

class HistoryWindow {
    constructor() {
        this.history = [];
        this.filteredHistory = [];
        this.initializeEventListeners();
        this.loadHistory();
    }

    initializeEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closeHistory');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

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



        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeWindow();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                searchInput?.focus();
            }
        });
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
                        <button onclick="historyWindow.copyHistoryItem('${item.text.replace(/'/g, "\\'")}', event)" title="Copy" class="history-action-btn">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button onclick="historyWindow.deleteHistoryItem('${item.id}', event)" title="Delete" class="history-action-btn">
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



    closeWindow() {
        console.log('🔒 Closing history window...');
        if (typeof window.electronAPI !== 'undefined') {
            window.close();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
}

// Initialize when DOM is loaded
let historyWindow;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 History window initialized');
    historyWindow = new HistoryWindow();
}); 