export class Logger {
    static formatDate() {
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
    static info(message, ...args) {
        console.log(`[${this.formatDate()}] ℹ️  INFO: ${message}`, ...args);
    }
    static success(message, ...args) {
        console.log(`[${this.formatDate()}] ✅ SUCCESS: ${message}`, ...args);
    }
    static error(message, error) {
        console.error(`[${this.formatDate()}] ❌ ERROR: ${message}`, error || '');
    }
    static warn(message, ...args) {
        console.warn(`[${this.formatDate()}] ⚠️  WARN: ${message}`, ...args);
    }
}
export const logger = Logger;
//# sourceMappingURL=logger.js.map