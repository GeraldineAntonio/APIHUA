// src/index.ts

import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import capitulosRoutes from './routes/capitulos.routes.js';
import { SERVER_PORT, CORS_OPTIONS } from './config/constants.js';
import { logger } from './utils/logger.js';

const app: Application = express();

// Middlewares
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', capitulosRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '📚 API Monte Hua - Bienvenido',
    version: '1.0.0',
    endpoints: {
      capitulos_espanol: '/api/capitulos/es',
      capitulos_ingles: '/api/capitulos/en',
      contenido: '/api/capitulo/contenido?url=...&fuente=...',
      limpiar_cache: '/api/cache/clear',
      health: '/api/health'
    },
    status: 'online'
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Error Handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar servidor
const server = app.listen(SERVER_PORT, () => {
  logger.success(`🚀 Servidor corriendo en puerto ${SERVER_PORT}`);
  logger.info('📖 Endpoints disponibles:');
  logger.info(`   GET  http://localhost:${SERVER_PORT}/api/capitulos/es`);
  logger.info(`   GET  http://localhost:${SERVER_PORT}/api/capitulos/en`);
  logger.info(`   GET  http://localhost:${SERVER_PORT}/api/capitulo/contenido`);
  logger.info(`   GET  http://localhost:${SERVER_PORT}/api/health`);
  logger.info(`   POST http://localhost:${SERVER_PORT}/api/cache/clear`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

export default app;