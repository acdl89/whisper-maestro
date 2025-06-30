import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

class Logger {
  private logFile: string = '';
  private isProduction: boolean;

  constructor() {
    this.isProduction = app.isPackaged;
    
    if (this.isProduction) {
      // Create logs directory in user data folder
      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'logs');
      
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      this.logFile = path.join(logsDir, `whisper-maestro-${new Date().toISOString().split('T')[0]}.log`);
      
      // Log startup info
      this.writeToFile('='.repeat(80));
      this.writeToFile(`WhisperMaestro started at ${new Date().toISOString()}`);
      this.writeToFile(`App version: ${app.getVersion()}`);
      this.writeToFile(`Platform: ${process.platform} ${process.arch}`);
      this.writeToFile(`Node version: ${process.version}`);
      this.writeToFile(`User data path: ${userDataPath}`);
      this.writeToFile('='.repeat(80));
    }
  }

  private writeToFile(message: string) {
    if (this.isProduction && this.logFile) {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      
      try {
        fs.appendFileSync(this.logFile, logEntry);
      } catch (error) {
        // Fallback to console if file writing fails
        console.error('Failed to write to log file:', error);
        console.log(message);
      }
    }
  }

  log(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    if (this.isProduction) {
      this.writeToFile(`LOG: ${message}`);
    } else {
      console.log(...args);
    }
  }

  error(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    if (this.isProduction) {
      this.writeToFile(`ERROR: ${message}`);
    } else {
      console.error(...args);
    }
  }

  warn(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    if (this.isProduction) {
      this.writeToFile(`WARN: ${message}`);
    } else {
      console.warn(...args);
    }
  }

  getLogFilePath(): string | null {
    return this.isProduction ? this.logFile : null;
  }

  // Method to get recent logs for debugging
  getRecentLogs(lines: number = 100): string {
    if (!this.isProduction || !this.logFile) {
      return 'Logging only available in production builds';
    }

    try {
      if (!fs.existsSync(this.logFile)) {
        return 'No log file found';
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const allLines = content.split('\n');
      const recentLines = allLines.slice(-lines).join('\n');
      return recentLines;
    } catch (error) {
      return `Error reading log file: ${error}`;
    }
  }
}

// Export singleton instance
export const logger = new Logger(); 