// src/services/scraper.service.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Capitulo, CapituloUnificado, ContenidoCapitulo, FlareSolverrResponse } from '../types/index.js';
import { SOURCES, FLARESOLVERR_URL } from '../config/constants.js';

class ScraperService {

  /**
   * Resolver Cloudflare con FlareSolverr
   */
  private async solveCloudflare(url: string, maxTimeout = 60000): Promise<string> {
    try {
      console.log(`🔓 Resolviendo Cloudflare para: ${url}`);
      console.log(`⏳ Tiempo máximo de espera: ${maxTimeout / 1000} segundos...`);

      const response = await axios.post<FlareSolverrResponse>(
        FLARESOLVERR_URL,
        {
          cmd: 'request.get',
          url: url,
          maxTimeout: maxTimeout
        },
        {
          timeout: maxTimeout + 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'ok' && response.data.solution) {
        console.log(`✅ Cloudflare resuelto exitosamente`);
        console.log(`📊 Status HTTP: ${response.data.solution.status}`);
        console.log(`📦 HTML recibido: ${response.data.solution.response.length} caracteres`);
        return response.data.solution.response;
      } else {
        throw new Error(`FlareSolverr failed: ${response.data.message}`);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          '❌ FlareSolverr no está corriendo. Ejecuta: docker start flaresolverr'
        );
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error('❌ Timeout esperando respuesta de FlareSolverr. Intenta aumentar maxTimeout.');
      }
      throw new Error(`Error resolviendo Cloudflare: ${error.message}`);
    }
  }

  /**
   * Scrape Skydemon con FlareSolverr
   */
  async scrapeSkydemon(): Promise<Capitulo[]> {
    try {
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📖 Scraping Skydemon Order (Inglés) con FlareSolverr');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`📍 URL: ${SOURCES.ENGLISH_SKYDEMON}`);

      const html = await this.solveCloudflare(SOURCES.ENGLISH_SKYDEMON, 90000);

      const $ = cheerio.load(html);
      const capitulos: Capitulo[] = [];

      console.log('\n🔍 Analizando HTML...');

      // Estadísticas
      let totalLinks = 0;
      const patterns = {
        chapter: 0,
        chapterInUrl: 0,
        skydemonLinks: 0,
        validChapters: 0
      };

      // Buscar todos los enlaces
      $('a').each((_, element) => {
        totalLinks++;
        const $element = $(element);
        const titulo = $element.text().trim();
        const href = $element.attr('href') || '';

        // Estadísticas
        if (titulo.toLowerCase().includes('chapter')) patterns.chapter++;
        if (href.toLowerCase().includes('chapter')) patterns.chapterInUrl++;
        if (href.includes('skydemonorder.com')) patterns.skydemonLinks++;

        // Construir URL completa
        let url = href;
        if (href && !href.startsWith('http')) {
          url = href.startsWith('/')
            ? `https://skydemonorder.com${href}`
            : `https://skydemonorder.com/${href}`;
        }

        // Buscar patrón "Chapter XXX"
        const numeroMatchTitulo = titulo.match(/chapter\s*[:\-]?\s*(\d+)/i);
        const numeroMatchUrl = href.match(/chapter[\/\-_]?(\d+)/i);
        const numeroMatch = numeroMatchTitulo || numeroMatchUrl;

        if (numeroMatch) {
          const numero = parseInt(numeroMatch[1]);

          if (numero > 0 && numero < 10000) {
            patterns.validChapters++;

            // Log primeros 5 matches
            if (capitulos.length < 5) {
              console.log(`   ✓ Match #${capitulos.length + 1}: Chapter ${numero}`);
              console.log(`     Título: "${titulo.substring(0, 50)}"`);
              console.log(`     URL: ${url.substring(0, 70)}...\n`);
            }

            if (!capitulos.find(c => c.numero === numero)) {
              capitulos.push({
                titulo: titulo || `Chapter ${numero}`,
                url: url,
                numero: numero,
                idioma: 'en',
                fuente: 'skydemon'
              });
            }
          }
        }
      });

      // Mostrar estadísticas
      console.log('═══════════════════════════════════════════════════');
      console.log('📊 ESTADÍSTICAS DE SCRAPING');
      console.log('═══════════════════════════════════════════════════');
      console.log(`   Total de enlaces analizados: ${totalLinks}`);
      console.log(`   Enlaces con "chapter" en texto: ${patterns.chapter}`);
      console.log(`   Enlaces con "chapter" en URL: ${patterns.chapterInUrl}`);
      console.log(`   Enlaces de skydemonorder.com: ${patterns.skydemonLinks}`);
      console.log(`   Capítulos válidos encontrados: ${patterns.validChapters}`);
      console.log(`   Capítulos únicos extraídos: ${capitulos.length}`);
      console.log('═══════════════════════════════════════════════════\n');

      // Debug si no encuentra nada
      if (capitulos.length === 0) {
        console.log('⚠️  NO SE ENCONTRARON CAPÍTULOS - MODO DEBUG ACTIVADO\n');

        // Guardar HTML para análisis
        try {
          const fs = await import('fs/promises');
          await fs.writeFile('debug-skydemon.html', html);
          console.log('✅ HTML guardado en: debug-skydemon.html\n');
        } catch (e) {
          console.log('❌ No se pudo guardar debug HTML\n');
        }

        // Análisis de estructura
        console.log('📋 ANÁLISIS DE ESTRUCTURA HTML:');
        console.log(`   - Título página: ${$('title').text()}`);
        console.log(`   - Total elementos <a>: ${$('a').length}`);
        console.log(`   - Elementos [class*="chapter"]: ${$('[class*="chapter"]').length}`);
        console.log(`   - Elementos [id*="chapter"]: ${$('[id*="chapter"]').length}`);
        console.log(`   - Longitud HTML: ${html.length} chars\n`);

        // Verificar bloqueos
        if (html.includes('challenge-platform') || html.includes('cf-challenge')) {
          console.log('❌ CLOUDFLARE CHALLENGE DETECTADO');
          console.log('   La página aún muestra el challenge de Cloudflare\n');
        }

        if (html.includes('Just a moment')) {
          console.log('❌ CLOUDFLARE "JUST A MOMENT" DETECTADO');
          console.log('   Aumenta el timeout o revisa FlareSolverr\n');
        }

        if (html.length < 5000) {
          console.log('❌ HTML MUY CORTO - POSIBLE ERROR');
          console.log(`   Contenido:\n${html.substring(0, 500)}\n`);
        }

        // Mostrar primeros enlaces
        console.log('📎 PRIMEROS 10 ENLACES EN LA PÁGINA:');
        $('a').slice(0, 10).each((i, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const href = $el.attr('href');
          console.log(`   ${i + 1}. "${text.substring(0, 50)}"`);
          console.log(`      → ${href}\n`);
        });

        // Buscar patrones alternativos
        console.log('🔎 BÚSQUEDA DE PATRONES ALTERNATIVOS:');
        const altPatterns = ['cap ', 'ch ', 'ch-', 'ep ', 'episode', 'capítulo', 'chapters'];
        altPatterns.forEach(pattern => {
          const count = html.toLowerCase().split(pattern).length - 1;
          if (count > 0) {
            console.log(`   - "${pattern}": ${count} ocurrencias`);
          }
        });
        console.log('');
      }

      const sorted = capitulos.sort((a, b) => a.numero - b.numero);

      if (sorted.length > 0) {
        console.log('✅ CAPÍTULOS ENCONTRADOS:');
        console.log(`   Total: ${sorted.length} capítulos\n`);
        console.log('📋 PRIMEROS 10 CAPÍTULOS:');
        sorted.slice(0, 10).forEach((cap, i) => {
          console.log(`   ${i + 1}. Chapter ${cap.numero}: ${cap.titulo.substring(0, 50)}`);
        });
        console.log('');
      }

      return sorted;
    } catch (error) {
      console.error('\n❌ ERROR EN SCRAPING DE SKYDEMON:', error);
      throw error;
    }
  }

  /**
   * Scrape Blogspot
   */
  async scrapeBlogspot(): Promise<Capitulo[]> {
    try {
      console.log('\n📖 Scraping Blogspot (Español)...');

      const response = await axios.get(SOURCES.SPANISH_BLOGSPOT, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const capitulos: Capitulo[] = [];

      $('a').each((_, element) => {
        const $element = $(element);
        const texto = $element.text().trim();
        const url = $element.attr('href') || '';

        if (
          texto &&
          url &&
          (texto.toLowerCase().includes('capítulo') ||
            texto.toLowerCase().includes('capitulo') ||
            /cap[ií]tulo\s*\d+/i.test(texto))
        ) {
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
      console.log(`✅ Encontrados ${sorted.length} capítulos en español\n`);

      return sorted;
    } catch (error) {
      throw new Error(`Error scraping Blogspot: ${error}`);
    }
  }

  /**
   * Scrape Maehwasup
   */
  async scrapeMaehwasup(): Promise<Capitulo[]> {
    const capitulos: Capitulo[] = [];

    try {
      console.log('\n📖 Scraping Maehwasup (Inglés)...');

      for (let pageNum = 1; pageNum <= 50; pageNum++) {
        const url =
          pageNum === 1
            ? SOURCES.ENGLISH_MAEHWASUP
            : `${SOURCES.ENGLISH_MAEHWASUP}page/${pageNum}/`;

        console.log(`   Página ${pageNum}...`);

        const response = await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

        if (pageCount === 0) {
          console.log(`   ⚠️  No hay más capítulos, deteniendo...\n`);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const capitulosUnicos = Array.from(
        new Map(capitulos.map(cap => [cap.numero, cap])).values()
      );

      const sorted = capitulosUnicos.sort((a, b) => a.numero - b.numero);
      console.log(`✅ Total: ${sorted.length} capítulos únicos de Maehwasup\n`);

      return sorted;
    } catch (error) {
      throw new Error(`Error scraping Maehwasup: ${error}`);
    }
  }

  /**
   * Unificar capítulos de inglés
   */
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

  /**
   * Scrape contenido de capítulo
   */
  async scrapeChapterContent(url: string, fuente: string): Promise<ContenidoCapitulo> {
    try {
      console.log(`\n📄 Obteniendo contenido de: ${url}`);

      // Si es Skydemon, usar FlareSolverr
      const html = url.includes('skydemonorder.com')
        ? await this.solveCloudflare(url, 60000)
        : (await axios.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })).data;

      const $ = cheerio.load(html);
      let contenido = '';

      // Selectores según la fuente
      if (fuente === 'blogspot') {
        contenido = $('.post-body, article, .entry-content').text().trim();
      } else if (fuente === 'maehwasup' || fuente === 'skydemon') {
        contenido = $('.entry-content, article, .chapter-content, .reading-content, .page-body, .text-left, #chapter-content').text().trim();
      } else {
        contenido = $('article, .chapter-content, .content').text().trim();
      }

      console.log(`✅ Contenido obtenido: ${contenido.length} caracteres\n`);

      return {
        contenido,
        url,
        fuente
      };
    } catch (error) {
      throw new Error(`Error scraping content: ${error}`);
    }
  }
}

export const scraperService = new ScraperService();