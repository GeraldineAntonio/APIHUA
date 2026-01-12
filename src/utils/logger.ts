// src/utils/logger.ts

export class Logger {
  private static formatDate(): string {
    return new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  static info(message: string, ...args: any[]): void {
    console.log(`[${this.formatDate()}] ℹ️  INFO: ${message}`, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.log(`[${this.formatDate()}] ✅ SUCCESS: ${message}`, ...args);
  }

  static error(message: string, error?: any): void {
    console.error(`[${this.formatDate()}] ❌ ERROR: ${message}`, error || '');
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`[${this.formatDate()}] ⚠️  WARN: ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.formatDate()}] 🐛 DEBUG: ${message}`, ...args);
    }
  }
}

export const logger = Logger;