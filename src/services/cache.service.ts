import { CacheData, Capitulo, CapituloUnificado, Idioma } from '../types/index.js';
import { CACHE_TTL } from '../config/constants.js';

class CacheService {
  private cache: CacheData = {
    spanish: null,
    english: null,
    lastUpdate: {}
  };

  get(idioma: Idioma): Capitulo[] | CapituloUnificado[] | null {
    const cacheKey = idioma === 'es' ? 'spanish' : 'english';
    const lastUpdate = this.cache.lastUpdate[cacheKey];

    if (this.cache[cacheKey] && lastUpdate) {
      const isValid = Date.now() - lastUpdate < CACHE_TTL;
      if (isValid) {
        return this.cache[cacheKey];
      }
    }

    return null;
  }

  set(idioma: Idioma, data: Capitulo[] | CapituloUnificado[]): void {
    const cacheKey = idioma === 'es' ? 'spanish' : 'english';
    this.cache[cacheKey] = data as any;
    this.cache.lastUpdate[cacheKey] = Date.now();
  }

  clear(): void {
    this.cache = {
      spanish: null,
      english: null,
      lastUpdate: {}
    };
  }

  getStatus() {
    return {
      spanish: {
        count: this.cache.spanish?.length || 0,
        lastUpdate: this.cache.lastUpdate.spanish
          ? new Date(this.cache.lastUpdate.spanish).toISOString()
          : null
      },
      english: {
        count: this.cache.english?.length || 0,
        lastUpdate: this.cache.lastUpdate.english
          ? new Date(this.cache.lastUpdate.english).toISOString()
          : null
      }
    };
  }
}

export const cacheService = new CacheService();