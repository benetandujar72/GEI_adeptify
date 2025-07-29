import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

// Health check básico
router.get('/', healthController.health.bind(healthController));

// Health check detallado
router.get('/detailed', healthController.detailedHealth.bind(healthController));

// Health check de dependencias
router.get('/dependencies', healthController.dependenciesHealth.bind(healthController));

// Health check de LLM providers
router.get('/providers', healthController.providersHealth.bind(healthController));

// Health check de cache
router.get('/cache', healthController.cacheHealth.bind(healthController));

// Health check de cost tracking
router.get('/costs', healthController.costTrackingHealth.bind(healthController));

export { router as healthRoutes };