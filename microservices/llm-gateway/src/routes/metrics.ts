import { Router } from 'express';
import { getMetrics, getCustomMetrics, resetMetrics } from '../middleware/metrics';

const router = Router();

// Métricas Prometheus
router.get('/prometheus', getMetrics);

// Métricas personalizadas
router.get('/custom', getCustomMetrics);

// Resetear métricas (solo en desarrollo)
router.post('/reset', resetMetrics);

export { router as metricsRoutes };