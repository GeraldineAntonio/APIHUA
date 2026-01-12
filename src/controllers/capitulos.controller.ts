// src/controllers/capitulos.controller.ts

import { Request, Response } from 'express';
import { scraperService } from '../services/scraper.service.js';
import { cacheService } from '../services/cache.service.js';
import { ApiResponse, Capitulo, CapituloUnificado, Idioma } from '../types/index.js';

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
      const cachedData = cacheService.get(idioma);
      if (cachedData) {
        console.log(`📦 Usando cache para ${idioma}`);
        res.json({
          success: true,
          data: cachedData,
          total: cachedData.length
        } as ApiResponse<typeof cachedData>);
        return;
      }

      console.log(`🔍 Scraping ${idioma}...`);

      if (idioma === 'es') {
        const capitulos = await scraperService.scrapeBlogspot();
        cacheService.set('es', capitulos);

        res.json({
          success: true,
          data: capitulos,
          total: capitulos.length
        } as ApiResponse<Capitulo[]>);
      } else {
        const capitulosMaehwa = await scraperService.scrapeMaehwasup();
        const capitulosUnificados = scraperService.unificarCapitulosIngles(capitulosMaehwa);
        cacheService.set('en', capitulosUnificados);

        res.json({
          success: true,
          data: capitulosUnificados,
          total: capitulosUnificados.length
        } as ApiResponse<CapituloUnificado[]>);
      }
    } catch (error) {
      console.error('❌ Error:', error);
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
      console.error('❌ Error al obtener contenido:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      } as ApiResponse<never>);
    }
  }

  clearCache(req: Request, res: Response): void {
    cacheService.clear();
    res.json({
      success: true,
      data: { message: 'Cache limpiado exitosamente' }
    } as ApiResponse<{ message: string }>);
  }

  getHealth(req: Request, res: Response): void {
    const cacheStatus = cacheService.getStatus();
    
    res.json({
      success: true,
      data: {
        status: 'online',
        timestamp: new Date().toISOString(),
        cache: cacheStatus
      }
    } as ApiResponse<{
      status: string;
      timestamp: string;
      cache: ReturnType<typeof cacheService.getStatus>;
    }>);
  }
}

export const capitulosController = new CapitulosController();