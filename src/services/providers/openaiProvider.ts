import OpenAI from 'openai';
import { TranscriptionProvider, TranscriptionResult, TranscriptionSettings } from './transcriptionProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../utils/logger';

export class OpenAIProvider extends TranscriptionProvider {
  async transcribe(audioBuffer: Buffer, settings: TranscriptionSettings): Promise<TranscriptionResult> {
    logger.log('🤖 OpenAIProvider: Starting transcription...');
    logger.log('🤖 OpenAIProvider: Audio buffer size:', audioBuffer.length, 'bytes');
    logger.log('🤖 OpenAIProvider: Model:', settings.model || 'whisper-1');
    logger.log('🤖 OpenAIProvider: Has API key:', !!settings.apiKey);
    logger.log('🤖 OpenAIProvider: MIME type:', (settings as any).mimeType);
    
    const openai = new OpenAI({
      apiKey: settings.apiKey
    });

    // Determine correct file extension based on MIME type
    const mimeType = (settings as any).mimeType || 'audio/webm';
    let fileExtension = '.webm'; // default
    
    if (mimeType.includes('mp4')) {
      fileExtension = '.mp4';
    } else if (mimeType.includes('webm')) {
      fileExtension = '.webm';
    } else if (mimeType.includes('wav')) {
      fileExtension = '.wav';
    } else if (mimeType.includes('ogg')) {
      fileExtension = '.ogg';
    } else if (mimeType.includes('m4a')) {
      fileExtension = '.m4a';
    }
    
    // Save audio buffer to temporary file with correct extension
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `whisper-${Date.now()}${fileExtension}`);
    logger.log('📁 OpenAIProvider: Creating temp file:', tempFile);
    logger.log('🎵 OpenAIProvider: File extension based on MIME type:', fileExtension);
    
    try {
      // Write the audio buffer directly to file
      logger.log('💾 OpenAIProvider: Writing audio buffer to file...');
      fs.writeFileSync(tempFile, audioBuffer);
      logger.log('✅ OpenAIProvider: Audio file created successfully, size:', audioBuffer.length, 'bytes');
      
      logger.log('🚀 OpenAIProvider: Making API call to OpenAI...');
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: settings.model || 'whisper-1',
        response_format: 'verbose_json'
      });
      logger.log('✅ OpenAIProvider: API call successful');
      logger.log('📝 OpenAIProvider: Transcription text:', transcription.text);
      logger.log('🌍 OpenAIProvider: Detected language:', transcription.language);

      const result = {
        text: transcription.text,
        confidence: transcription.words && transcription.words.length > 0 ? 
          (transcription.words[0] as any).confidence : undefined,
        language: transcription.language,
        timestamp: new Date()
      };
      
      logger.log('📤 OpenAIProvider: Returning result:', result);
      return result;
    } catch (error) {
      logger.error('❌ OpenAIProvider: API call failed:', error);
      throw error;
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFile)) {
        logger.log('🧹 OpenAIProvider: Cleaning up temp file');
        fs.unlinkSync(tempFile);
      }
    }
  }


} 