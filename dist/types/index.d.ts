export interface Capitulo {
    numero: number;
    titulo: string;
    url?: string;
    idioma: 'es' | 'en';
    fuente?: string;
    fuentes?: Fuente[];
}
export interface Fuente {
    nombre: string;
    url: string;
}
export interface CapituloUnificado {
    numero: number;
    titulo: string;
    fuentes: Fuente[];
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    total?: number;
    lastUpdate?: string;
}
export interface CacheData {
    spanish: Capitulo[] | null;
    english: CapituloUnificado[] | null;
    lastUpdate: {
        spanish?: number;
        english?: number;
    };
}
export type Idioma = 'es' | 'en';
export interface ContenidoCapitulo {
    contenido: string;
    url: string;
    fuente: string;
}
export interface FlareSolverrResponse {
    status: string;
    message: string;
    solution: {
        url: string;
        status: number;
        response: string;
        cookies: any[];
        userAgent: string;
    };
}
