import Store from 'electron-store';
import * as keytar from 'keytar';

interface AppSettings {
  provider: string;
  model: string;
  language?: string;
  autoCopy: boolean;
  saveAudio: boolean;
  theme: 'light' | 'dark' | 'system';
  [key: string]: any;
}

export class SettingsManager {
  private store: Store<AppSettings>;
  private readonly SERVICE_NAME = 'WhisperMaestro';
  private readonly ACCOUNT_NAME = 'api-key';

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: {
        provider: 'openai',
        model: 'whisper-1',
        language: undefined,
        autoCopy: true,
        saveAudio: false,
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

  async saveApiKey(apiKey: string): Promise<void> {
    await keytar.setPassword(this.SERVICE_NAME, this.ACCOUNT_NAME, apiKey);
  }

  async getApiKey(): Promise<string> {
    const apiKey = await keytar.getPassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
    return apiKey || '';
  }

  async deleteApiKey(): Promise<void> {
    await keytar.deletePassword(this.SERVICE_NAME, this.ACCOUNT_NAME);
  }
} 