import { Router } from 'express';
import { capitulosController } from '../controllers/capitulos.controller.js';

const router = Router();

router.get('/capitulos/:idioma', (req, res) =>
  capitulosController.getCapitulos(req, res)
);

router.get('/capitulo/contenido', (req, res) =>
  capitulosController.getContenido(req, res)
);

router.post('/cache/clear', (req, res) =>
  capitulosController.clearCache(req, res)
);

router.get('/health', (req, res) =>
  capitulosController.getHealth(req, res)
);

export default router;