export declare class Logger {
    private static formatDate;
    static info(message: string, ...args: any[]): void;
    static success(message: string, ...args: any[]): void;
    static error(message: string, error?: any): void;
    static warn(message: string, ...args: any[]): void;
}
export declare const logger: typeof Logger;
