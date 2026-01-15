import { CACHE_TTL } from '../config/constants.js';
class CacheService {
    constructor() {
        this.cache = {
            spanish: null,
            english: null,
            lastUpdate: {}
        };
    }
    get(idioma) {
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
    set(idioma, data) {
        const cacheKey = idioma === 'es' ? 'spanish' : 'english';
        this.cache[cacheKey] = data;
        this.cache.lastUpdate[cacheKey] = Date.now();
    }
    clear() {
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
//# sourceMappingURL=cache.service.js.map