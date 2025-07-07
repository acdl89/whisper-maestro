import Store from 'electron-store';
import { app } from 'electron';
import * as crypto from 'crypto';

interface AppSettings {
  provider: string;
  model: string;
  chatGptModel: string; // Model for ChatGPT transformations
  recordingShortcut: string;
  theme: 'light' | 'dark' | 'system';
  apiKeyHash?: string; // Encrypted API key
  personalization?: string[]; // Personalization entries
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
        chatGptModel: 'gpt-3.5-turbo',
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

  async getPersonalization(): Promise<string[]> {
    return this.store.get('personalization', []);
  }

  async savePersonalization(entries: string[]): Promise<void> {
    // Filter out empty entries and trim whitespace
    const cleanEntries = entries
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0);
    
    this.store.set('personalization', cleanEntries);
  }

  async addPersonalizationEntry(entry: string): Promise<string[]> {
    const current = await this.getPersonalization();
    const trimmed = entry.trim();
    
    if (trimmed && !current.includes(trimmed)) {
      current.push(trimmed);
      await this.savePersonalization(current);
    }
    
    return current;
  }

  async removePersonalizationEntry(index: number): Promise<string[]> {
    const current = await this.getPersonalization();
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      await this.savePersonalization(current);
    }
    
    return current;
  }

  async updatePersonalizationEntry(index: number, newEntry: string): Promise<string[]> {
    const current = await this.getPersonalization();
    const trimmed = newEntry.trim();
    
    if (index >= 0 && index < current.length && trimmed) {
      current[index] = trimmed;
      await this.savePersonalization(current);
    }
    
    return current;
  }

  async reorderPersonalizationEntries(entries: string[]): Promise<string[]> {
    await this.savePersonalization(entries);
    return entries;
  }

  async getLastUsedMode(): Promise<string> {
    return this.store.get('lastUsedMode', 'none');
  }

  async setLastUsedMode(mode: string): Promise<void> {
    this.store.set('lastUsedMode', mode);
  }
} 