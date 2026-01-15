import { Capitulo, CapituloUnificado, Idioma } from '../types/index.js';
declare class CacheService {
    private cache;
    get(idioma: Idioma): Capitulo[] | CapituloUnificado[] | null;
    set(idioma: Idioma, data: Capitulo[] | CapituloUnificado[]): void;
    clear(): void;
    getStatus(): {
        spanish: {
            count: number;
            lastUpdate: string | null;
        };
        english: {
            count: number;
            lastUpdate: string | null;
        };
    };
}
export declare const cacheService: CacheService;
export {};
