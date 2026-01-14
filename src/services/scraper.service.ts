// src/services/scraper.service.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Capitulo, CapituloUnificado, ContenidoCapitulo, FlareSolverrResponse } from '../types/index.js';
import { SOURCES, FLARESOLVERR_URL } from '../config/constants.js';

class ScraperService {

  /**
   * Resolver Cloudflare con FlareSolverr - VERSIÓN SIMPLE
   */
  private async solveCloudflare(url: string, maxTimeout = 60000): Promise<string> {
    try {
      console.log(`🔓 Resolviendo Cloudflare para: ${url}`);

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
        return response.data.solution.response;
      } else {
        throw new Error(`FlareSolverr failed: ${response.data.message}`);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('❌ FlareSolverr no está corriendo. Ejecuta: docker start flaresolverr');
      }
      throw new Error(`Error resolviendo Cloudflare: ${error.message}`);
    }
  }

  /**
   * Scrape Skydemon - VERSIÓN SIMPLIFICADA Y ROBUSTA
   */
  async scrapeSkydemon(): Promise<Capitulo[]> {
    try {
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📖 Scraping Skydemon Order (Inglés)');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`📍 URL: ${SOURCES.ENGLISH_SKYDEMON}\n`);

      // Obtener HTML
      const html = await this.solveCloudflare(SOURCES.ENGLISH_SKYDEMON, 90000);
      
      // Guardar HTML para debug
      try {
        const fs = await import('fs/promises');
        await fs.writeFile('debug-skydemon.html', html);
        console.log('✅ HTML guardado en: debug-skydemon.html\n');
      } catch (e) {
        console.log('⚠️  No se pudo guardar debug HTML\n');
      }

      const $ = cheerio.load(html);
      
      console.log('📊 ANÁLISIS DE LA PÁGINA:');
      console.log(`   - Total de enlaces: ${$('a').length}`);
      console.log(`   - Título de la página: ${$('title').text()}`);
      console.log(`   - H1: ${$('h1').first().text().substring(0, 100)}`);
      console.log('');

      // Buscar capítulos con MÚLTIPLES estrategias
      const capitulosEncontrados = new Map<number, Capitulo>();

      // ESTRATEGIA 1: Selectores específicos de WordPress/Manga
      console.log('🔍 ESTRATEGIA 1: Selectores específicos de manga');
      const selectorsManga = [
        '.wp-manga-chapter',
        '.listing-chapters_wrap li',
        '.version-chap',
        'li.wp-manga-chapter',
        '.chapter-release-date'
      ];

      for (const selector of selectorsManga) {
        const elementos = $(selector);
        if (elementos.length > 0) {
          console.log(`   ✓ Encontrados ${elementos.length} con selector: ${selector}`);
          
          elementos.each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a').first().length > 0 ? $el.find('a').first() : $el;
            
            const texto = $link.text().trim();
            const href = $link.attr('href') || '';
            
            console.log(`      Texto: "${texto.substring(0, 60)}"`);
            console.log(`      URL: ${href.substring(0, 80)}\n`);
            
            const cap = this.extraerCapitulo(texto, href);
            if (cap && !capitulosEncontrados.has(cap.numero)) {
              capitulosEncontrados.set(cap.numero, cap);
            }
          });
        }
      }

      console.log(`   📌 Capítulos encontrados con selectores manga: ${capitulosEncontrados.size}\n`);

      // ESTRATEGIA 2: Buscar en TODOS los enlaces
      console.log('🔍 ESTRATEGIA 2: Análisis de todos los enlaces');
      let contadorLinks = 0;
      
      $('a').each((_, el) => {
        const $el = $(el);
        const texto = $el.text().trim();
        const href = $el.attr('href') || '';
        
        // PATRÓN ESPECÍFICO: enlaces que contienen /projects/ID/NUMERO-
        const esCapituloSkydemon = /\/projects\/[\w-]+\/\d+-/.test(href);
        
        // Solo analizar enlaces que parezcan capítulos
        const pareceCapitulo = 
          esCapituloSkydemon ||
          /chapter/i.test(texto) || 
          /chapter/i.test(href) ||
          /ch[\-_\s]?\d+/i.test(texto) ||
          /ch[\-_\s]?\d+/i.test(href) ||
          /cap[íi]tulo/i.test(texto);
        
        if (pareceCapitulo) {
          contadorLinks++;
          
          if (contadorLinks <= 50) { // Mostrar los primeros 50
            console.log(`   ${contadorLinks}. "${texto.substring(0, 50)}"`);
            console.log(`      → ${href.substring(0, 100)}\n`);
          }
          
          const cap = this.extraerCapitulo(texto, href);
          if (cap && !capitulosEncontrados.has(cap.numero)) {
            capitulosEncontrados.set(cap.numero, cap);
          }
        }
      });

      console.log(`   📌 Total de enlaces analizados: ${contadorLinks}`);
      console.log(`   📌 Capítulos únicos encontrados: ${capitulosEncontrados.size}\n`);

      // ESTRATEGIA 3: Buscar en elementos con data-* attributes
      console.log('🔍 ESTRATEGIA 3: Atributos data-*');
      const elementosConData = $('[data-chapter], [data-id], [data-post-id], [data-num]');
      
      if (elementosConData.length > 0) {
        console.log(`   ✓ Encontrados ${elementosConData.length} elementos con atributos data-*`);
        
        elementosConData.each((_, el) => {
          const $el = $(el);
          const dataChapter = $el.attr('data-chapter');
          const dataId = $el.attr('data-id');
          const dataPost = $el.attr('data-post-id');
          const dataNum = $el.attr('data-num');
          
          const numero = parseInt(dataChapter || dataId || dataPost || dataNum || '0');
          
          if (numero > 0 && numero < 10000) {
            const texto = $el.text().trim();
            const href = $el.attr('href') || $el.find('a').first().attr('href') || '';
            
            console.log(`   📌 data=${numero}, texto="${texto.substring(0, 40)}", href=${href.substring(0, 60)}\n`);
            
            if (!capitulosEncontrados.has(numero)) {
              let url = href;
              if (href && !href.startsWith('http')) {
                url = href.startsWith('/') 
                  ? `https://skydemonorder.com${href}`
                  : `https://skydemonorder.com/${href}`;
              }
              
              capitulosEncontrados.set(numero, {
                numero,
                titulo: texto || `Chapter ${numero}`,
                url: url || `https://skydemonorder.com/chapter-${numero}`,
                idioma: 'en',
                fuente: 'skydemon'
              });
            }
          }
        });
      }

      console.log(`   📌 Capítulos con data-*: ${capitulosEncontrados.size}\n`);

      // ESTRATEGIA 4: Buscar JSON embebido
      console.log('🔍 ESTRATEGIA 4: JSON embebido en scripts');
      $('script[type="application/json"], script[type="application/ld+json"]').each((i, el) => {
        const contenido = $(el).html() || '';
        if (contenido.includes('chapter') || contenido.includes('Chapter')) {
          console.log(`   📋 JSON encontrado (${contenido.length} caracteres)`);
          console.log(`      ${contenido.substring(0, 200)}...\n`);
          
          try {
            const json = JSON.parse(contenido);
            const capsFromJson = this.extraerCapitulosDeJSON(json);
            
            capsFromJson.forEach(cap => {
              if (!capitulosEncontrados.has(cap.numero)) {
                capitulosEncontrados.set(cap.numero, cap);
              }
            });
            
            if (capsFromJson.length > 0) {
              console.log(`   ✅ Extraídos ${capsFromJson.length} capítulos del JSON\n`);
            }
          } catch (e) {
            console.log(`   ⚠️  No se pudo parsear JSON\n`);
          }
        }
      });

      // Convertir a array y ordenar
      const capitulos = Array.from(capitulosEncontrados.values()).sort((a, b) => a.numero - b.numero);

      // Resultados finales
      console.log('═══════════════════════════════════════════════════');
      console.log('📊 RESULTADOS FINALES');
      console.log('═══════════════════════════════════════════════════');
      console.log(`   Total de capítulos: ${capitulos.length}`);
      
      if (capitulos.length > 0) {
        console.log(`   Rango: Capítulo ${capitulos[0].numero} - ${capitulos[capitulos.length - 1].numero}\n`);
        
        console.log('📋 LISTA DE CAPÍTULOS:');
        capitulos.forEach((cap, i) => {
          if (i < 15 || i >= capitulos.length - 5) {
            console.log(`   ${cap.numero}. ${cap.titulo.substring(0, 60)}`);
          } else if (i === 15) {
            console.log(`   ... (${capitulos.length - 20} más) ...`);
          }
        });
      } else {
        console.log('\n⚠️  NO SE ENCONTRARON CAPÍTULOS');
        console.log('\n💡 SUGERENCIAS:');
        console.log('   1. Revisa el archivo debug-skydemon.html');
        console.log('   2. Busca manualmente cómo se muestran los capítulos en el HTML');
        console.log('   3. Verifica que la URL sea correcta');
        console.log('   4. Puede que el sitio use carga dinámica con JavaScript');
      }
      
      console.log('═══════════════════════════════════════════════════\n');

      return capitulos;

    } catch (error) {
      console.error('\n❌ ERROR EN SCRAPING DE SKYDEMON:', error);
      throw error;
    }
  }

  /**
   * Extraer información de capítulo desde texto y URL
   */
  private extraerCapitulo(texto: string, href: string): Capitulo | null {
    let numero = 0;

    // PATRÓN ESPECÍFICO PARA SKYDEMON: /projects/ID/NUMERO-titulo
    const patronSkydemon = /\/projects\/[\w-]+\/(\d+)-/;
    const matchSkydemon = href.match(patronSkydemon);
    
    if (matchSkydemon) {
      numero = parseInt(matchSkydemon[1]);
    }

    // Si no funcionó el patrón de Skydemon, intentar patrones generales
    if (numero === 0) {
      const patrones = [
        /chapter\s*[:\-]?\s*(\d+)/i,
        /ch\.?\s*[:\-]?\s*(\d+)/i,
        /cap[íi]tulo\s*[:\-]?\s*(\d+)/i,
        /ep(?:isode)?\s*[:\-]?\s*(\d+)/i,
        /\bch[\-_]?(\d+)\b/i,
        /chapter[\-_\/](\d+)/i,
        /\/(\d+)-/,  // Número antes de guión
        /\/(\d+)\/?$/,
        /\b(\d+)\b/
      ];

      // Buscar en el texto primero
      for (const patron of patrones) {
        const match = texto.match(patron);
        if (match) {
          numero = parseInt(match[1]);
          break;
        }
      }

      // Si no se encontró en el texto, buscar en la URL
      if (numero === 0) {
        for (const patron of patrones) {
          const match = href.match(patron);
          if (match) {
            numero = parseInt(match[1]);
            break;
          }
        }
      }
    }

    // Validar número
    if (numero <= 0 || numero >= 10000) {
      return null;
    }

    // Validar que no sea un enlace inválido
    const patronesInvalidos = [
      '/tag/', '/category/', '/author/', '/page/', '/search/',
      'facebook.com', 'twitter.com', 'instagram.com', 'discord.com',
      'patreon.com', 'youtube.com', 'reddit.com', 'pinterest.com'
    ];

    const urlLower = href.toLowerCase();
    if (patronesInvalidos.some(invalido => urlLower.includes(invalido))) {
      return null;
    }

    // Construir URL completa
    let url = href;
    if (href && !href.startsWith('http')) {
      url = href.startsWith('/') 
        ? `https://skydemonorder.com${href}`
        : `https://skydemonorder.com/${href}`;
    }

    return {
      numero,
      titulo: texto || `Chapter ${numero}`,
      url: url || `https://skydemonorder.com/chapter-${numero}`,
      idioma: 'en',
      fuente: 'skydemon'
    };
  }

  /**
   * Extraer capítulos de un objeto JSON
   */
  private extraerCapitulosDeJSON(json: any): Capitulo[] {
    const capitulos: Capitulo[] = [];
    
    const procesarObjeto = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      // Si es un array, procesar cada elemento
      if (Array.isArray(obj)) {
        obj.forEach(item => procesarObjeto(item));
        return;
      }
      
      // Buscar propiedades relevantes
      const numero = 
        obj.chapter || 
        obj.chapter_number || 
        obj.number || 
        obj.num || 
        obj.id;
        
      const titulo = 
        obj.title || 
        obj.name || 
        obj.chapter_name || 
        obj.post_title;
        
      const url = 
        obj.url || 
        obj.link || 
        obj.permalink || 
        obj.href;
      
      if (numero) {
        const num = parseInt(String(numero).match(/\d+/)?.[0] || '0');
        if (num > 0 && num < 10000) {
          let urlFinal = url || '';
          if (urlFinal && !urlFinal.startsWith('http')) {
            urlFinal = `https://skydemonorder.com${urlFinal.startsWith('/') ? urlFinal : '/' + urlFinal}`;
          }
          
          capitulos.push({
            numero: num,
            titulo: titulo || `Chapter ${num}`,
            url: urlFinal || `https://skydemonorder.com/chapter-${num}`,
            idioma: 'en',
            fuente: 'skydemon'
          });
        }
      }
      
      // Recorrer propiedades del objeto recursivamente
      Object.values(obj).forEach(valor => {
        if (typeof valor === 'object' && valor !== null) {
          procesarObjeto(valor);
        }
      });
    };
    
    procesarObjeto(json);
    return capitulos;
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