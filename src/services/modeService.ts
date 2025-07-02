import { logger } from '../utils/logger';
import { SettingsManager } from '../utils/settingsManager';

export interface ModeConfig {
  name: string;
  prompt: string;
  enabled: boolean;
  shortcut?: string; // Optional keyboard shortcut for this mode
}

export interface ModeSettings {
  userName: string;
  modes: {
    [key: string]: ModeConfig;
  };
}

export class ModeService {
  private settingsManager: SettingsManager;
  private defaultModes: { [key: string]: ModeConfig } = {
    transcript: {
      name: 'Transcript',
      prompt: 'Return the transcript as-is without any modifications.',
      enabled: true,
      shortcut: 'CommandOrControl+T'
    },
    email: {
      name: 'Email',
      prompt: 'Draft a professional email based on the information below. Remove any subject line from the output. Format it as a complete email body. Sign it on behalf of {userName}.',
      enabled: true,
      shortcut: 'CommandOrControl+E'
    },
    slack: {
      name: 'Slack',
      prompt: 'Convert the following into a casual, friendly Slack message. Make it conversational and appropriate for team communication. Keep it concise and engaging.',
      enabled: true,
      shortcut: 'CommandOrControl+S'
    },
    notes: {
      name: 'Meeting Notes',
      prompt: 'Convert the following transcript into structured meeting notes. Organize the content with clear headings, key points, and action items if mentioned.',
      enabled: true,
      shortcut: 'CommandOrControl+N'
    },
    tasks: {
      name: 'Action Items',
      prompt: 'Extract and format action items from the following transcript. Present them as a clear, numbered list with any mentioned deadlines or responsible parties.',
      enabled: true,
      shortcut: 'CommandOrControl+A'
    }
  };

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  async getModeSettings(): Promise<ModeSettings> {
    try {
      const settings = await this.settingsManager.getSettings();
      
      // Return defaults if no mode settings exist
      if (!settings.modeSettings) {
        return {
          userName: 'User',
          modes: this.defaultModes
        };
      }

      // Merge with defaults to ensure all modes exist
      const modes = { ...this.defaultModes, ...settings.modeSettings.modes };
      
      return {
        userName: settings.modeSettings.userName || 'User',
        modes
      };
    } catch (error) {
      logger.error('Error getting mode settings:', error);
      return {
        userName: 'User',
        modes: this.defaultModes
      };
    }
  }

  async saveModeSettings(modeSettings: ModeSettings): Promise<void> {
    try {
      const currentSettings = await this.settingsManager.getSettings();
      await this.settingsManager.saveSettings({
        ...currentSettings,
        modeSettings
      });
      logger.log('Mode settings saved successfully');
    } catch (error) {
      logger.error('Error saving mode settings:', error);
      throw error;
    }
  }

  async transformTranscript(transcript: string, mode: string): Promise<string> {
    try {
      // If transcript mode, return as-is
      if (mode === 'transcript') {
        return transcript;
      }

      const modeSettings = await this.getModeSettings();
      const modeConfig = modeSettings.modes[mode];
      
      if (!modeConfig || !modeConfig.enabled) {
        throw new Error(`Mode "${mode}" is not available or enabled`);
      }

      // Replace {userName} placeholder in prompt
      const prompt = modeConfig.prompt.replace('{userName}', modeSettings.userName);
      
      // Get OpenAI API key
      const apiKey = await this.settingsManager.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      logger.log(`🤖 Transforming transcript using ${modeConfig.name} mode...`);

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: transcript
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json() as any;
      const transformedContent = data.choices?.[0]?.message?.content;

      if (!transformedContent) {
        throw new Error('No content received from OpenAI API');
      }

      logger.log(`✅ Successfully transformed transcript using ${modeConfig.name} mode`);
      return transformedContent.trim();

    } catch (error) {
      logger.error(`❌ Error transforming transcript with mode "${mode}":`, error);
      throw error;
    }
  }

  async getAvailableModes(): Promise<ModeConfig[]> {
    try {
      const modeSettings = await this.getModeSettings();
      return Object.entries(modeSettings.modes)
        .filter(([_, config]) => config.enabled)
        .map(([key, config]) => ({ ...config, key } as ModeConfig & { key: string }));
    } catch (error) {
      logger.error('Error getting available modes:', error);
      return Object.entries(this.defaultModes)
        .filter(([_, config]) => config.enabled)
        .map(([key, config]) => ({ ...config, key } as ModeConfig & { key: string }));
    }
  }
} 