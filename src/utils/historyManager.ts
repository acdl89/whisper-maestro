import Store from 'electron-store';
import { app } from 'electron';

interface TranscriptionHistoryItem {
  id: string;
  text: string;
  timestamp: Date;
  provider: string;
  model: string;
  language?: string;
  confidence?: number;
}

export class HistoryManager {
  private store: Store<{ history: TranscriptionHistoryItem[] }>;

  constructor() {
    // Use different storage for development vs production
    const storeName = app.isPackaged 
      ? 'transcription-history-prod' 
      : 'transcription-history-dev';
      
    this.store = new Store<{ history: TranscriptionHistoryItem[] }>({
      name: storeName,
      // Ensure production uses proper app data directory
      cwd: undefined, // Use default user data directory
      defaults: {
        history: []
      }
    });
  }

  async addTranscription(transcription: any): Promise<void> {
    const history = this.getHistory();
    const newItem: TranscriptionHistoryItem = {
      id: Date.now().toString(),
      text: transcription.text,
      timestamp: new Date(),
      provider: transcription.provider || 'unknown',
      model: transcription.model || 'unknown',
      language: transcription.language,
      confidence: transcription.confidence
    };

    history.unshift(newItem);
    
    // Keep only last 100 transcriptions
    if (history.length > 100) {
      history.splice(100);
    }

    this.store.set('history', history);
  }

  getHistory(): TranscriptionHistoryItem[] {
    return this.store.get('history', []);
  }

  async deleteItem(id: string): Promise<void> {
    const history = this.getHistory();
    const filteredHistory = history.filter(item => item.id !== id);
    this.store.set('history', filteredHistory);
  }

  async clearHistory(): Promise<void> {
    this.store.delete('history');
  }
} 