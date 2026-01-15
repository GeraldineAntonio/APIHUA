// src/services/scraper.service.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SOURCES, FLARESOLVERR_URL } from '../config/constants.js';
class ScraperService {
    /**
     * Resolver Cloudflare con FlareSolverr
     */
    async solveCloudflare(url, maxTimeout = 60000) {
        try {
            console.log(`🔓 Resolviendo Cloudflare para: ${url}`);
            const response = await axios.post(FLARESOLVERR_URL, {
                cmd: 'request.get',
                url: url,
                maxTimeout: maxTimeout
            }, {
                timeout: maxTimeout + 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.status === 'ok' && response.data.solution) {
                console.log(`✅ Cloudflare resuelto exitosamente`);
                return response.data.solution.response;
            }
            else {
                throw new Error(`FlareSolverr failed: ${response.data.message}`);
            }
        }
        catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('❌ FlareSolverr no está corriendo');
            }
            throw new Error(`Error resolviendo Cloudflare: ${error.message}`);
        }
    }
    /**
     * Scrape Skydemon
     */
    async scrapeSkydemon() {
        try {
            console.log('📖 Scraping Skydemon...');
            const html = await this.solveCloudflare(SOURCES.ENGLISH_SKYDEMON, 90000);
            const $ = cheerio.load(html);
            const capitulosEncontrados = new Map();
            // Analizar todos los enlaces
            $('a').each((_, el) => {
                const $el = $(el);
                const texto = $el.text().trim();
                const href = $el.attr('href') || '';
                const esCapituloSkydemon = /\/projects\/[\w-]+\/\d+-/.test(href);
                if (esCapituloSkydemon) {
                    const cap = this.extraerCapitulo(texto, href);
                    if (cap && !capitulosEncontrados.has(cap.numero)) {
                        // FILTRAR CAPÍTULOS DE PAGA
                        const esDePaga = /^episode\s+\d+/i.test(texto.trim());
                        if (!esDePaga) {
                            capitulosEncontrados.set(cap.numero, cap);
                        }
                        else {
                            console.log(`   💰 [PAGA] Ignorando: ${texto.substring(0, 50)}`);
                        }
                    }
                }
            });
            const capitulos = Array.from(capitulosEncontrados.values()).sort((a, b) => a.numero - b.numero);
            console.log(`✅ Skydemon: ${capitulos.length} capítulos\n`);
            return capitulos;
        }
        catch (error) {
            console.error('❌ Error en Skydemon:', error);
            throw error;
        }
    }
    /**
     * Extraer capítulo desde texto y URL
     */
    extraerCapitulo(texto, href) {
        const patronSkydemon = /\/projects\/[\w-]+\/(\d+)-/;
        const matchSkydemon = href.match(patronSkydemon);
        if (!matchSkydemon)
            return null;
        const numero = parseInt(matchSkydemon[1]);
        if (numero <= 0 || numero >= 10000)
            return null;
        let url = href;
        if (!href.startsWith('http')) {
            url = href.startsWith('/')
                ? `https://skydemonorder.com${href}`
                : `https://skydemonorder.com/${href}`;
        }
        return {
            numero,
            titulo: texto || `Chapter ${numero}`,
            url,
            idioma: 'en',
            fuente: 'skydemon'
        };
    }
    /**
     * Scrape Blogspot
     */
    async scrapeBlogspot() {
        try {
            console.log('📖 Scraping Blogspot...');
            const response = await axios.get(SOURCES.SPANISH_BLOGSPOT, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            const capitulos = [];
            $('a').each((_, element) => {
                const $element = $(element);
                const texto = $element.text().trim();
                const url = $element.attr('href') || '';
                if (texto &&
                    url &&
                    (texto.toLowerCase().includes('capítulo') ||
                        texto.toLowerCase().includes('capitulo'))) {
                    const numeroMatch = texto.match(/\d+/);
                    if (numeroMatch) {
                        capitulos.push({
                            titulo: texto,
                            url: url,
                            numero: parseInt(numeroMatch[0]),
                            idioma: 'es',
                            fuente: 'blogspot'
                        });
                    }
                }
            });
            const sorted = capitulos.sort((a, b) => a.numero - b.numero);
            console.log(`✅ Blogspot: ${sorted.length} capítulos\n`);
            return sorted;
        }
        catch (error) {
            throw new Error(`Error scraping Blogspot: ${error}`);
        }
    }
    /**
     * Scrape Maehwasup
     */
    async scrapeMaehwasup() {
        const capitulos = [];
        try {
            console.log('📖 Scraping Maehwasup...');
            for (let pageNum = 1; pageNum <= 50; pageNum++) {
                const url = pageNum === 1
                    ? SOURCES.ENGLISH_MAEHWASUP
                    : `${SOURCES.ENGLISH_MAEHWASUP}page/${pageNum}/`;
                const response = await axios.get(url, {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
                const $ = cheerio.load(response.data);
                let pageCount = 0;
                $('a').each((_, element) => {
                    const $element = $(element);
                    const titulo = $element.text().trim();
                    const href = $element.attr('href') || '';
                    const numeroMatch = titulo.match(/chapter\s*(\d+)/i);
                    if (numeroMatch && href.includes('maehwasup.com')) {
                        const numero = parseInt(numeroMatch[1]);
                        if (!capitulos.find(c => c.numero === numero)) {
                            capitulos.push({
                                titulo: titulo,
                                url: href,
                                numero: numero,
                                idioma: 'en',
                                fuente: 'maehwasup'
                            });
                            pageCount++;
                        }
                    }
                });
                if (pageCount === 0)
                    break;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            const sorted = Array.from(new Map(capitulos.map(cap => [cap.numero, cap])).values()).sort((a, b) => a.numero - b.numero);
            console.log(`✅ Maehwasup: ${sorted.length} capítulos\n`);
            return sorted;
        }
        catch (error) {
            throw new Error(`Error scraping Maehwasup: ${error}`);
        }
    }
    /**
     * Unificar capítulos de inglés
     */
    unificarCapitulosIngles(capitulos) {
        const capitulosMap = new Map();
        capitulos.forEach((cap) => {
            if (!capitulosMap.has(cap.numero)) {
                capitulosMap.set(cap.numero, {
                    numero: cap.numero,
                    titulo: cap.titulo,
                    fuentes: []
                });
            }
            const capUnificado = capitulosMap.get(cap.numero);
            if (capUnificado) {
                capUnificado.fuentes.push({
                    nombre: cap.fuente || 'unknown',
                    url: cap.url || ''
                });
            }
        });
        return Array.from(capitulosMap.values()).sort((a, b) => a.numero - b.numero);
    }
    /**
     * Scrape contenido de capítulo
     */
    async scrapeChapterContent(url, fuente) {
        try {
            const html = url.includes('skydemonorder.com')
                ? await this.solveCloudflare(url, 60000)
                : (await axios.get(url, {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                })).data;
            const $ = cheerio.load(html);
            let contenido = '';
            if (fuente === 'blogspot') {
                contenido = $('.post-body, article, .entry-content').text().trim();
            }
            else if (fuente === 'maehwasup' || fuente === 'skydemon') {
                contenido = $('.entry-content, article, .chapter-content, .reading-content, .page-body, .text-left, #chapter-content').text().trim();
            }
            else {
                contenido = $('article, .chapter-content, .content').text().trim();
            }
            if (contenido.length < 500) {
                throw new Error('Contenido muy corto - puede estar bloqueado');
            }
            return {
                contenido,
                url,
                fuente
            };
        }
        catch (error) {
            throw new Error(`Error scraping content: ${error}`);
        }
    }
}
export const scraperService = new ScraperService();
//# sourceMappingURL=scraper.service.js.map