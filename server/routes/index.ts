import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import instituteRoutes from './institutes.js';
import academicYearRoutes from './academic-years.js';
import evaluationRoutes from './evaluation.js';
import attendanceRoutes from './attendance.js';
import guardRoutes from './guards.js';
import surveyRoutes from './surveys.js';
import resourceRoutes from './resources.js';
import analyticsRoutes from './analytics.js';
import aiRoutes from './ai.js';
import adeptifyRoutes from './adeptify.js';
import assistatutRoutes from './assistatut.js';
import competencyRoutes from './competency.js';
import guardAutomationRoutes from './guard-automation.js';
import attendanceCoreRoutes from './attendance-core.js';
import communicationRoutes from './communication.js';
import scheduleRoutes from './schedule.js';
import dashboardRoutes from './dashboard.js';

/**
 * Configura todas las rutas de la API
 */
export function setupRoutes(): Router {
  const router = Router();

  // Rutas de autenticación (públicas)
  router.use('/auth', authRoutes);

  // Rutas protegidas
  router.use('/users', userRoutes);
  router.use('/institutes', instituteRoutes);
  router.use('/academic-years', academicYearRoutes);
  router.use('/evaluation', evaluationRoutes);
  router.use('/attendance', attendanceRoutes);
  router.use('/guards', guardRoutes);
  router.use('/surveys', surveyRoutes);
  router.use('/resources', resourceRoutes);
  router.use('/analytics', analyticsRoutes);
  router.use('/ai', aiRoutes);
  
  // Módulos específicos
  router.use('/adeptify', adeptifyRoutes);
  router.use('/assistatut', assistatutRoutes);
  router.use('/competencies', competencyRoutes);
  router.use('/guard-automation', guardAutomationRoutes);
  router.use('/attendance', attendanceCoreRoutes);
  router.use('/communication', communicationRoutes);
  router.use('/schedule', scheduleRoutes);
  router.use('/dashboard', dashboardRoutes);

  // Ruta de prueba
  router.get('/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
  });

  return router;
} 