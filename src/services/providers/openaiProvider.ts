import OpenAI from 'openai';
import { TranscriptionProvider, TranscriptionResult, TranscriptionSettings } from './transcriptionProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class OpenAIProvider extends TranscriptionProvider {
  async transcribe(audioBuffer: Buffer, settings: TranscriptionSettings): Promise<TranscriptionResult> {
    console.log('🤖 OpenAIProvider: Starting transcription...');
    console.log('🤖 OpenAIProvider: Audio buffer size:', audioBuffer.length, 'bytes');
    console.log('🤖 OpenAIProvider: Model:', settings.model || 'whisper-1');
    console.log('🤖 OpenAIProvider: Language:', settings.language);
    console.log('🤖 OpenAIProvider: Has API key:', !!settings.apiKey);
    
    const openai = new OpenAI({
      apiKey: settings.apiKey
    });

    // Save audio buffer to temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `whisper-${Date.now()}.webm`);
    console.log('📁 OpenAIProvider: Creating temp file:', tempFile);
    
    try {
      // Write the audio buffer directly to file (no WAV conversion)
      console.log('💾 OpenAIProvider: Writing audio buffer to file...');
      fs.writeFileSync(tempFile, audioBuffer);
      console.log('✅ OpenAIProvider: Audio file created successfully, size:', audioBuffer.length, 'bytes');
      
      console.log('🚀 OpenAIProvider: Making API call to OpenAI...');
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: settings.model || 'whisper-1',
        language: settings.language,
        response_format: 'verbose_json'
      });
      console.log('✅ OpenAIProvider: API call successful');
      console.log('📝 OpenAIProvider: Transcription text:', transcription.text);
      console.log('🌍 OpenAIProvider: Detected language:', transcription.language);

      const result = {
        text: transcription.text,
        confidence: transcription.words && transcription.words.length > 0 ? 
          (transcription.words[0] as any).confidence : undefined,
        language: transcription.language,
        timestamp: new Date()
      };
      
      console.log('📤 OpenAIProvider: Returning result:', result);
      return result;
    } catch (error) {
      console.error('❌ OpenAIProvider: API call failed:', error);
      throw error;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFile)) {
        console.log('🧹 OpenAIProvider: Cleaning up temp file');
        fs.unlinkSync(tempFile);
      }
    }
  }

  private async bufferToWav(buffer: Buffer, outputPath: string): Promise<void> {
    console.log('🔄 OpenAIProvider: Creating WAV file from buffer...');
    
    try {
      // Create a simple WAV file header
      const sampleRate = 16000;
      const channels = 1;
      const bitDepth = 16;
      const bytesPerSample = bitDepth / 8;
      const blockAlign = channels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = buffer.length;
      const fileSize = 36 + dataSize;
      
      // Create WAV header
      const header = Buffer.alloc(44);
      
      // RIFF header
      header.write('RIFF', 0);
      header.writeUInt32LE(fileSize, 4);
      header.write('WAVE', 8);
      
      // fmt chunk
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16); // fmt chunk size
      header.writeUInt16LE(1, 20); // PCM format
      header.writeUInt16LE(channels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(byteRate, 28);
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitDepth, 34);
      
      // data chunk
      header.write('data', 36);
      header.writeUInt32LE(dataSize, 40);
      
      // Combine header and audio data
      const wavFile = Buffer.concat([header, buffer]);
      
      // Write to file
      const fs = require('fs');
      fs.writeFileSync(outputPath, wavFile);
      
      console.log('✅ OpenAIProvider: WAV file created successfully, size:', wavFile.length, 'bytes');
    } catch (error) {
      console.error('❌ OpenAIProvider: Failed to create WAV file:', error);
      throw error;
    }
  }
} 