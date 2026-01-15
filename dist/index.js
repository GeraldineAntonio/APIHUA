import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import capitulosRoutes from './routes/capitulos.routes.js';
import { SERVER_PORT, CORS_OPTIONS } from './config/constants.js';
import { logger } from './utils/logger.js';
const app = express();
app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});
app.use('/api', capitulosRoutes);
app.get('/', (req, res) => {
    res.json({
        message: '📚 API Monte Hua - Bienvenido',
        version: '1.0.0',
        endpoints: {
            capitulos_espanol: '/api/capitulos/es',
            capitulos_ingles: '/api/capitulos/en',
            contenido: '/api/capitulo/contenido?url=...&fuente=...',
            health: '/api/health'
        }
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
    });
});
app.listen(SERVER_PORT, () => {
    logger.success(`🚀 Servidor en puerto ${SERVER_PORT}`);
    logger.info(`📖 Endpoints:`);
    logger.info(`   GET  http://localhost:${SERVER_PORT}/api/capitulos/es`);
    logger.info(`   GET  http://localhost:${SERVER_PORT}/api/capitulos/en`);
    logger.info(`   GET  http://localhost:${SERVER_PORT}/api/health`);
});
export default app;
//# sourceMappingURL=index.js.map