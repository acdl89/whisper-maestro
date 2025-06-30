import Store from 'electron-store';
import { app } from 'electron';
import * as crypto from 'crypto';

interface AppSettings {
  provider: string;
  model: string;
  recordingShortcut: string;
  theme: 'light' | 'dark' | 'system';
  apiKeyHash?: string; // Encrypted API key
  [key: string]: any;
}

export class SettingsManager {
  private store: Store<AppSettings>;
  private readonly ENCRYPTION_KEY!: string;

  constructor() {
    // Initialize encryption key
    this.ENCRYPTION_KEY = this.generateEncryptionKey();
    
    // Use different storage for development vs production  
    const storeName = app.isPackaged ? 'config-prod' : 'config-dev';
    
    this.store = new Store<AppSettings>({
      name: storeName,
      defaults: {
        provider: 'openai',
        model: 'whisper-1',
        recordingShortcut: 'CommandOrControl+,',
        theme: 'system'
      }
    });
  }

  async getSettings(): Promise<AppSettings & { apiKey: string }> {
    const settings = this.store.store;
    const apiKey = await this.getApiKey();
    return {
      ...settings,
      apiKey
    };
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    // Remove undefined values before saving
    const filtered: Partial<AppSettings> = {};
    for (const key in settings) {
      if (settings[key] !== undefined) {
        filtered[key] = settings[key];
      }
    }
    this.store.set(filtered);
  }

  private generateEncryptionKey(): string {
    // Generate a machine-specific key based on app name and user directory
    const identifier = `WhisperMaestro-${app.getPath('userData')}`;
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipher('aes-256-cbc', this.ENCRYPTION_KEY);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.warn('Failed to decrypt API key:', error);
      return '';
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    if (apiKey.trim() === '') {
      this.store.delete('apiKeyHash');
      return;
    }
    
    const encrypted = this.encrypt(apiKey);
    this.store.set('apiKeyHash', encrypted);
  }

  async getApiKey(): Promise<string> {
    const encrypted = this.store.get('apiKeyHash');
    if (!encrypted) return '';
    
    return this.decrypt(encrypted);
  }

  async deleteApiKey(): Promise<void> {
    this.store.delete('apiKeyHash');
  }
} 