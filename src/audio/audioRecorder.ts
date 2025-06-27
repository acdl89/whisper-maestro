import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class AudioRecorder {
  private isRecording = false;
  private tempFile: string = '';

  async startRecording(onAudioData?: (data: any) => void): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    this.isRecording = true;
    this.tempFile = path.join(os.tmpdir(), `whisper-${Date.now()}.wav`);

    // Simulate waveform data for UI
    if (onAudioData) {
      this.simulateWaveformData(onAudioData);
    }
  }

  async stopRecording(): Promise<Buffer> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    this.isRecording = false;
    
    // For now, create a dummy audio file for testing
    // In a real implementation, this would contain actual recorded audio
    const dummyAudioData = this.createDummyAudioFile();
    
    try {
      fs.writeFileSync(this.tempFile, dummyAudioData);
      const audioBuffer = fs.readFileSync(this.tempFile);
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(this.tempFile);
      } catch (e) {
        console.warn('Could not delete temp file:', e);
      }
      
      return audioBuffer;
    } catch (error) {
      console.error('Error with audio file:', error);
      throw error;
    }
  }

  private simulateWaveformData(onAudioData: (data: any) => void): void {
    const interval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(interval);
        return;
      }

      // Generate simulated waveform data
      const amplitudes = [];
      for (let i = 0; i < 50; i++) {
        amplitudes.push(Math.random() * 0.5 + 0.1);
      }

      onAudioData({
        amplitudes,
        timestamp: Date.now()
      });
    }, 100);
  }

  private createDummyAudioFile(): Buffer {
    // Create a minimal WAV file header for testing
    const sampleRate = 16000;
    const duration = 3; // 3 seconds
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * 2; // 16-bit samples
    
    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(1, 22); // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buffer.writeUInt16LE(2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Add some dummy audio data (silence)
    for (let i = 0; i < numSamples; i++) {
      buffer.writeInt16LE(0, 44 + i * 2);
    }
    
    return buffer;
  }
} 