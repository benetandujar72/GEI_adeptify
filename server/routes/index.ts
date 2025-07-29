import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import instituteRoutes from './institutes';
import academicYearRoutes from './academic-years';
import evaluationRoutes from './evaluation';
import attendanceRoutes from './attendance';
import guardRoutes from './guards';
import surveyRoutes from './surveys';
import resourceRoutes from './resources';
import analyticsRoutes from './analytics';
import aiRoutes from './ai';
import adeptifyRoutes from './adeptify';
import assistatutRoutes from './assistatut';
import competencyRoutes from './competency';
import guardAutomationRoutes from './guard-automation';
import attendanceCoreRoutes from './attendance-core';
import communicationRoutes from './communication';
import scheduleRoutes from './schedule';
import dashboardRoutes from './dashboard';
// import googleSheetsRoutes from './google-sheets'; // COMPLETAMENTE DESHABILITADO
import auditRoutes from './audit';
import reportRoutes from './reports';
import exportRoutes from './export';
import optimizationRoutes from './optimization';
import calendarRoutes from './calendar';

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
  console.log('✅ Dashboard routes mounted successfully');
  
  // Integraciones externas
  // router.use('/google-sheets', googleSheetsRoutes); // COMPLETAMENTE DESHABILITADO
  
  // Sistema de auditoría
  router.use('/audit', auditRoutes);
  
  // Sistema de reportes
  router.use('/reports', reportRoutes);
  
  // Sistema de exportación
  router.use('/export', exportRoutes);
  
  // Sistema de optimización
  router.use('/optimization', optimizationRoutes);
  
  // Sistema de calendario
  router.use('/calendar', calendarRoutes);

  // Ruta de prueba
  router.get('/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
  });

  return router;
} 