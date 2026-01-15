import type { Capitulo, CapituloUnificado, ContenidoCapitulo } from '../types/index.js';
declare class ScraperService {
    /**
     * Resolver Cloudflare con FlareSolverr
     */
    private solveCloudflare;
    /**
     * Scrape Skydemon
     */
    scrapeSkydemon(): Promise<Capitulo[]>;
    /**
     * Extraer capítulo desde texto y URL
     */
    private extraerCapitulo;
    /**
     * Scrape Blogspot
     */
    scrapeBlogspot(): Promise<Capitulo[]>;
    /**
     * Scrape Maehwasup
     */
    scrapeMaehwasup(): Promise<Capitulo[]>;
    /**
     * Unificar capítulos de inglés
     */
    unificarCapitulosIngles(capitulos: Capitulo[]): CapituloUnificado[];
    /**
     * Scrape contenido de capítulo
     */
    scrapeChapterContent(url: string, fuente: string): Promise<ContenidoCapitulo>;
}
export declare const scraperService: ScraperService;
export {};
