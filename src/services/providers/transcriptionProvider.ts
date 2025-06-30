export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  timestamp: Date;
}

export interface TranscriptionSettings {
  provider: string;
  model?: string;
  apiKey: string;
  mimeType?: string;
}

export abstract class TranscriptionProvider {
  abstract transcribe(audioBuffer: Buffer, settings: TranscriptionSettings): Promise<TranscriptionResult>;
} 