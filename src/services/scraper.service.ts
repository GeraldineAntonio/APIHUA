// src/services/scraper.service.ts

import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import type { Capitulo, CapituloUnificado, ContenidoCapitulo } from '../types/index.js';
import { SOURCES, PUPPETEER_CONFIG } from '../config/constants.js';

interface CapituloRaw {
  titulo: string;
  url: string;
  numero: number;
  idioma: string;
  fuente: string;
}

class ScraperService {
  private browser: Browser | null = null;

  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch(PUPPETEER_CONFIG);
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeBlogspot(): Promise<Capitulo[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      console.log(`📖 Scraping Blogspot (Español)...`);
      
      await page.goto(SOURCES.SPANISH_BLOGSPOT, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const capitulos = await page.evaluate(() => {
        const enlaces: Array<{
          titulo: string;
          url: string;
          numero: number;
          idioma: string;
          fuente: string;
        }> = [];
        
        const links = document.querySelectorAll('a');

        links.forEach((link) => {
          const texto = link.textContent?.trim() || '';
          const url = (link as HTMLAnchorElement).href;

          if (
            texto &&
            url &&
            (texto.toLowerCase().includes('capítulo') ||
              texto.toLowerCase().includes('capitulo') ||
              /cap[ií]tulo\s*\d+/i.test(texto))
          ) {
            const numeroMatch = texto.match(/\d+/);
            enlaces.push({
              titulo: texto,
              url: url,
              numero: numeroMatch ? parseInt(numeroMatch[0]) : 0,
              idioma: 'es',
              fuente: 'blogspot'
            });
          }
        });

        return enlaces.sort((a, b) => a.numero - b.numero);
      });

      console.log(`✅ Encontrados ${capitulos.length} capítulos en español`);
      
      await page.close();
      
      // Convertir a tipo Capitulo
      return capitulos.map(cap => ({
        ...cap,
        idioma: 'es' as const
      }));
    } catch (error) {
      await page.close();
      throw new Error(`Error scraping Blogspot: ${error}`);
    }
  }

  async scrapeMaehwasup(): Promise<Capitulo[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    const capitulos: Capitulo[] = [];

    try {
      for (let pageNum = 1; pageNum <= 50; pageNum++) {
        const url =
          pageNum === 1
            ? SOURCES.ENGLISH_MAEHWASUP
            : `${SOURCES.ENGLISH_MAEHWASUP}page/${pageNum}/`;

        console.log(`📖 Scraping página ${pageNum}: ${url}`);

        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        const pageCapitulos = await page.evaluate(() => {
          const caps: Array<{
            titulo: string;
            url: string;
            numero: number;
            idioma: string;
            fuente: string;
          }> = [];
          
          // Buscar todos los enlaces que contienen "Chapter"
          const links = document.querySelectorAll('a');

          links.forEach((link) => {
            const titulo = link.textContent?.trim() || '';
            const url = (link as HTMLAnchorElement).href;
            
            // Buscar patrón "Chapter XXXX"
            const numeroMatch = titulo.match(/chapter\s*(\d+)/i);

            if (numeroMatch && url.includes('maehwasup.com')) {
              const numero = parseInt(numeroMatch[1]);
              
              // Evitar duplicados
              if (!caps.find(c => c.numero === numero)) {
                caps.push({
                  titulo: titulo,
                  url: url,
                  numero: numero,
                  idioma: 'en',
                  fuente: 'maehwasup'
                });
              }
            }
          });

          return caps;
        });

        console.log(`   ✅ Encontrados ${pageCapitulos.length} capítulos`);

        // Convertir a tipo Capitulo
        const capsTyped = pageCapitulos.map(cap => ({
          ...cap,
          idioma: 'en' as const
        }));

        capitulos.push(...capsTyped);

        // Si no hay capítulos, salir
        if (pageCapitulos.length === 0) {
          console.log(`   ⚠️  No hay más capítulos, deteniendo...`);
          break;
        }

        // Pausa entre requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await page.close();
      
      // Eliminar duplicados por número
      const capitulosUnicos = Array.from(
        new Map(capitulos.map(cap => [cap.numero, cap])).values()
      );
      
      console.log(`🎉 Total de capítulos únicos: ${capitulosUnicos.length}`);
      
      return capitulosUnicos.sort((a, b) => a.numero - b.numero);
    } catch (error) {
      await page.close();
      throw new Error(`Error scraping Maehwasup: ${error}`);
    }
  }

  unificarCapitulosIngles(capitulos: Capitulo[]): CapituloUnificado[] {
    const capitulosMap = new Map<number, CapituloUnificado>();

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

  async scrapeChapterContent(url: string, fuente: string): Promise<ContenidoCapitulo> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const contenido = await page.evaluate((source) => {
        let content = '';

        if (source === 'blogspot') {
          const article = document.querySelector('.post-body, article, .entry-content');
          content = article?.textContent?.trim() || '';
        } else if (source === 'maehwasup') {
          const article = document.querySelector('.entry-content, article');
          content = article?.textContent?.trim() || '';
        } else {
          const article = document.querySelector('article, .chapter-content, .content');
          content = article?.textContent?.trim() || '';
        }

        return content;
      }, fuente);

      await page.close();

      return {
        contenido,
        url,
        fuente
      };
    } catch (error) {
      await page.close();
      throw new Error(`Error scraping content: ${error}`);
    }
  }
}

export const scraperService = new ScraperService();