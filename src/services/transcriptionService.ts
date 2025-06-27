import { OpenAIProvider } from './providers/openaiProvider';
import { TranscriptionProvider } from './providers/transcriptionProvider';

export class TranscriptionService {
  private providers: Map<string, TranscriptionProvider> = new Map();

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
    // Future providers can be added here
    // this.providers.set('assemblyai', new AssemblyAIProvider());
    // this.providers.set('deepgram', new DeepGramProvider());
  }

  async transcribe(audioBuffer: Buffer, settings: any): Promise<any> {
    console.log('🔍 TranscriptionService: Starting transcription...');
    console.log('🔍 TranscriptionService: Audio buffer size:', audioBuffer.length, 'bytes');
    console.log('🔍 TranscriptionService: Settings provider:', settings.provider);
    
    const provider = this.providers.get(settings.provider);
    if (!provider) {
      console.error('❌ TranscriptionService: Provider not found:', settings.provider);
      throw new Error(`Provider ${settings.provider} not found`);
    }

    console.log('✅ TranscriptionService: Provider found, calling transcribe method...');
    const result = await provider.transcribe(audioBuffer, settings);
    console.log('📝 TranscriptionService: Provider returned result:', result);
    
    return result;
  }
} 