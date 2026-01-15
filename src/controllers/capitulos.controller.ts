// src/controllers/capitulos.controller.ts

import { Request, Response } from 'express';
import { scraperService } from '../services/scraper.service.js';
import { cacheService } from '../services/cache.service.js';
import { ApiResponse, Capitulo, CapituloUnificado, Idioma } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';

// Variable para caché del JSON
let jsonData: any = null;

// Función para cargar datos desde JSON
async function loadFromJson() {
  if (jsonData) return jsonData;
  
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'capitulos.json');
    const data = await fs.readFile(jsonPath, 'utf-8');
    jsonData = JSON.parse(data);
    logger.info('📦 Datos cargados desde JSON');
    return jsonData;
  } catch (error) {
    logger.warn('⚠️  No se pudo cargar JSON, usando scraping en vivo');
    return null;
  }
}

export class CapitulosController {
  async getCapitulos(req: Request, res: Response): Promise<void> {
    const idioma = req.params.idioma as Idioma;

    if (!['es', 'en'].includes(idioma)) {
      res.status(400).json({
        success: false,
        error: 'Idioma no válido. Usa "es" o "en"'
      } as ApiResponse<never>);
      return;
    }

    try {
      // Intentar cargar desde JSON primero (en producción)
      if (process.env.NODE_ENV === 'production') {
        const data = await loadFromJson();
        if (data) {
          const capitulos = idioma === 'es' ? data.espanol : data.ingles;
          
          res.json({
            success: true,
            data: capitulos,
            total: capitulos.length,
            lastUpdate: data.lastUpdate
          } as ApiResponse<typeof capitulos>);
          return;
        }
      }

      // Verificar caché
      const cachedData = cacheService.get(idioma);
      if (cachedData) {
        logger.info(`📦 Usando cache para ${idioma}`);
        res.json({
          success: true,
          data: cachedData,
          total: cachedData.length
        } as ApiResponse<typeof cachedData>);
        return;
      }

      logger.info(`🔍 Scraping ${idioma}...`);

      // Scraping en vivo (solo en desarrollo)
      if (idioma === 'es') {
        const capitulos = await scraperService.scrapeBlogspot();
        cacheService.set('es', capitulos);

        res.json({
          success: true,
          data: capitulos,
          total: capitulos.length
        } as ApiResponse<Capitulo[]>);
      } else {
        const [capitulosMaehwa, capitulosSkydemon] = await Promise.allSettled([
          scraperService.scrapeMaehwasup(),
          scraperService.scrapeSkydemon()
        ]);

        const todosCapitulos: Capitulo[] = [];

        if (capitulosMaehwa.status === 'fulfilled') {
          todosCapitulos.push(...capitulosMaehwa.value);
        }

        if (capitulosSkydemon.status === 'fulfilled') {
          todosCapitulos.push(...capitulosSkydemon.value);
        }

        const capitulosUnificados = scraperService.unificarCapitulosIngles(todosCapitulos);
        cacheService.set('en', capitulosUnificados);

        res.json({
          success: true,
          data: capitulosUnificados,
          total: capitulosUnificados.length
        } as ApiResponse<CapituloUnificado[]>);
      }
    } catch (error) {
      logger.error('Error en getCapitulos:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      } as ApiResponse<never>);
    }
  }

  async getContenido(req: Request, res: Response): Promise<void> {
    const { url, fuente } = req.query;

    if (!url || !fuente) {
      res.status(400).json({
        success: false,
        error: 'Parámetros "url" y "fuente" son requeridos'
      } as ApiResponse<never>);
      return;
    }

    try {
      const contenido = await scraperService.scrapeChapterContent(
        url as string,
        fuente as string
      );

      res.json({
        success: true,
        data: contenido
      } as ApiResponse<typeof contenido>);
    } catch (error) {
      logger.error('Error al obtener contenido:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      } as ApiResponse<never>);
    }
  }

  clearCache(req: Request, res: Response): void {
    cacheService.clear();
    jsonData = null; // Limpiar también caché del JSON
    
    res.json({
      success: true,
      data: { message: 'Cache limpiado exitosamente' }
    } as ApiResponse<{ message: string }>);
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    const cacheStatus = cacheService.getStatus();
    const data = await loadFromJson();

    res.json({
      success: true,
      data: {
        status: 'online',
        timestamp: new Date().toISOString(),
        cache: cacheStatus,
        jsonData: data ? {
          lastUpdate: data.lastUpdate,
          stats: data.stats
        } : null
      }
    } as ApiResponse<any>);
  }
}

export const capitulosController = new CapitulosController();