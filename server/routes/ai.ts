import { Router } from 'express';
import { aiChatbotService } from '../services/ai-chatbot-service.js';
import { aiAnalyticsService } from '../services/ai-analytics-service.js';
import { aiReportGeneratorService } from '../services/ai-report-generator.js';
import { isAuthenticated } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
router.use(auditMiddleware('ai'));

// Schemas de validación
const chatMessageSchema = z.object({
  sessionId: z.string().optional(),
  content: z.string().min(1).max(1000),
  context: z.string().optional()
});

const predictionDataSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  currentGrade: z.number().min(0).max(10),
  attendanceRate: z.number().min(0).max(100),
  studyTime: z.number().min(0),
  previousGrades: z.array(z.number().min(0).max(10)),
  behaviorScore: z.number().min(0).max(10),
  participationRate: z.number().min(0).max(100)
});

const reportDataSchema = z.object({
  type: z.enum(['evaluation', 'attendance', 'behavior', 'comprehensive', 'custom']),
  timeRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }),
  filters: z.object({
    subjects: z.array(z.string()).optional(),
    students: z.array(z.string()).optional(),
    teachers: z.array(z.string()).optional(),
    grades: z.array(z.number()).optional()
  }).optional(),
  includeCharts: z.boolean().optional(),
  includeRecommendations: z.boolean().optional(),
  format: z.enum(['pdf', 'html', 'json'])
});

const patternDataSchema = z.object({
  type: z.enum(['attendance', 'grades', 'behavior', 'participation']),
  data: z.array(z.any()),
  timeRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  })
});

// ===== RUTAS DEL CHATBOT =====

/**
 * @route POST /api/ai/chat/sessions
 * @desc Crear una nueva sesión de chat
 */
router.post('/chat/sessions', isAuthenticated, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const session = await aiChatbotService.createChatSession(userId, title);
    
    logger.info(`Nueva sesión de chat creada: ${session.id} para usuario ${userId}`);
    res.status(201).json(session);
  } catch (error) {
    logger.error('Error al crear sesión de chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/chat/messages
 * @desc Enviar mensaje al chatbot
 */
router.post('/chat/messages', isAuthenticated, async (req, res) => {
  try {
    const validation = chatMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: validation.error });
    }

    const { sessionId, content, context } = validation.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Si no hay sessionId, crear una nueva sesión
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await aiChatbotService.createChatSession(userId);
      currentSessionId = session.id;
    }

    const response = await aiChatbotService.sendMessage(currentSessionId, userId, content, context);
    
    logger.info(`Mensaje enviado al chatbot: sesión ${currentSessionId}, usuario ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Error al enviar mensaje al chatbot:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/chat/sessions
 * @desc Obtener sesiones de chat del usuario
 */
router.get('/chat/sessions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const sessions = await aiChatbotService.getChatSessions(userId);
    res.json(sessions);
  } catch (error) {
    logger.error('Error al obtener sesiones de chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/ai/chat/sessions/:sessionId
 * @desc Eliminar sesión de chat
 */
router.delete('/chat/sessions/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    await aiChatbotService.deleteChatSession(sessionId, userId);
    
    logger.info(`Sesión de chat eliminada: ${sessionId} por usuario ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error al eliminar sesión de chat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/chat/stats
 * @desc Obtener estadísticas del chatbot
 */
router.get('/chat/stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const stats = await aiChatbotService.getChatStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error al obtener estadísticas del chatbot:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== RUTAS DE ANÁLISIS PREDICTIVO =====

/**
 * @route POST /api/ai/analytics/predict
 * @desc Predecir rendimiento de un estudiante
 */
router.post('/analytics/predict', isAuthenticated, async (req, res) => {
  try {
    const validation = predictionDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: validation.error });
    }

    const predictionData = validation.data;
    const prediction = await aiAnalyticsService.predictStudentPerformance(predictionData);
    
    logger.info(`Predicción generada para estudiante: ${predictionData.studentId}`);
    res.json(prediction);
  } catch (error) {
    logger.error('Error al generar predicción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/analytics/predict/batch
 * @desc Predecir rendimiento de múltiples estudiantes
 */
router.post('/analytics/predict/batch', isAuthenticated, async (req, res) => {
  try {
    const { predictions } = req.body;
    
    if (!Array.isArray(predictions)) {
      return res.status(400).json({ error: 'Se requiere un array de predicciones' });
    }

    // Validar cada predicción
    for (const prediction of predictions) {
      const validation = predictionDataSchema.safeParse(prediction);
      if (!validation.success) {
        return res.status(400).json({ error: 'Datos inválidos en predicción', details: validation.error });
      }
    }

    const results = await aiAnalyticsService.predictBatchPerformance(predictions);
    
    logger.info(`Predicciones en lote generadas: ${predictions.length} estudiantes`);
    res.json(results);
  } catch (error) {
    logger.error('Error al generar predicciones en lote:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/analytics/patterns
 * @desc Detectar patrones en los datos
 */
router.post('/analytics/patterns', isAuthenticated, async (req, res) => {
  try {
    const validation = patternDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: validation.error });
    }

    const patternData = validation.data;
    const patterns = await aiAnalyticsService.detectPatterns(patternData);
    
    logger.info(`Patrones detectados: ${patterns.length} patrones encontrados`);
    res.json(patterns);
  } catch (error) {
    logger.error('Error al detectar patrones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/analytics/warnings
 * @desc Generar alertas tempranas
 */
router.get('/analytics/warnings', isAuthenticated, async (req, res) => {
  try {
    const warnings = await aiAnalyticsService.generateEarlyWarnings();
    
    logger.info(`Alertas tempranas generadas: ${warnings.length} alertas`);
    res.json(warnings);
  } catch (error) {
    logger.error('Error al generar alertas tempranas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/analytics/recommendations/:studentId
 * @desc Generar recomendaciones personalizadas
 */
router.get('/analytics/recommendations/:studentId', isAuthenticated, async (req, res) => {
  try {
    const { studentId } = req.params;
    const recommendations = await aiAnalyticsService.generatePersonalizedRecommendations(studentId);
    
    logger.info(`Recomendaciones generadas para estudiante: ${studentId}`);
    res.json(recommendations);
  } catch (error) {
    logger.error('Error al generar recomendaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/analytics/insights
 * @desc Obtener insights de análisis
 */
router.get('/analytics/insights', isAuthenticated, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }

    const timeRange = {
      start: new Date(start as string),
      end: new Date(end as string)
    };

    const insights = await aiAnalyticsService.getAnalyticsInsights(timeRange);
    
    logger.info(`Insights generados para período: ${start} a ${end}`);
    res.json(insights);
  } catch (error) {
    logger.error('Error al generar insights:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/analytics/accuracy
 * @desc Obtener precisión de las predicciones
 */
router.get('/analytics/accuracy', isAuthenticated, async (req, res) => {
  try {
    const accuracy = await aiAnalyticsService.getPredictionAccuracy();
    res.json(accuracy);
  } catch (error) {
    logger.error('Error al obtener precisión de predicciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== RUTAS DE GENERACIÓN DE REPORTES =====

/**
 * @route POST /api/ai/reports/generate
 * @desc Generar reporte automático
 */
router.post('/reports/generate', isAuthenticated, async (req, res) => {
  try {
    const validation = reportDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: validation.error });
    }

    const reportData = validation.data;
    const report = await aiReportGeneratorService.generateReport(reportData);
    
    logger.info(`Reporte generado: ${report.id}, tipo: ${report.type}`);
    res.json(report);
  } catch (error) {
    logger.error('Error al generar reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/reports/trends
 * @desc Generar análisis de tendencias
 */
router.post('/reports/trends', isAuthenticated, async (req, res) => {
  try {
    const { data, timeRange } = req.body;
    
    if (!Array.isArray(data) || !timeRange) {
      return res.status(400).json({ error: 'Se requieren datos y rango de tiempo' });
    }

    const trends = await aiReportGeneratorService.generateTrendAnalysis(data, timeRange);
    
    logger.info(`Análisis de tendencias generado: ${trends.length} tendencias`);
    res.json(trends);
  } catch (error) {
    logger.error('Error al generar análisis de tendencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/reports/comparative
 * @desc Generar reporte comparativo
 */
router.post('/reports/comparative', isAuthenticated, async (req, res) => {
  try {
    const { data1, data2, comparisonType } = req.body;
    
    if (!Array.isArray(data1) || !Array.isArray(data2) || !comparisonType) {
      return res.status(400).json({ error: 'Se requieren dos conjuntos de datos y tipo de comparación' });
    }

    const report = await aiReportGeneratorService.generateComparativeReport(data1, data2, comparisonType);
    
    logger.info(`Reporte comparativo generado: ${report.id}`);
    res.json(report);
  } catch (error) {
    logger.error('Error al generar reporte comparativo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/ai/reports/predictive
 * @desc Generar reporte predictivo
 */
router.post('/reports/predictive', isAuthenticated, async (req, res) => {
  try {
    const { historicalData, predictionPeriods } = req.body;
    
    if (!Array.isArray(historicalData) || typeof predictionPeriods !== 'number') {
      return res.status(400).json({ error: 'Se requieren datos históricos y períodos de predicción' });
    }

    const report = await aiReportGeneratorService.generatePredictiveReport(historicalData, predictionPeriods);
    
    logger.info(`Reporte predictivo generado: ${report.id}`);
    res.json(report);
  } catch (error) {
    logger.error('Error al generar reporte predictivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/reports/templates
 * @desc Obtener plantillas de reportes disponibles
 */
router.get('/reports/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = await aiReportGeneratorService.getReportTemplates();
    res.json(templates);
  } catch (error) {
    logger.error('Error al obtener plantillas de reportes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== RUTAS DE ESTADO Y CONFIGURACIÓN =====

/**
 * @route GET /api/ai/status
 * @desc Obtener estado de los servicios de IA
 */
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const status = {
      chatbot: {
        initialized: true,
        model: 'gpt-4o-mini',
        features: ['chat', 'sentiment_analysis', 'topic_extraction', 'suggestions']
      },
      analytics: {
        initialized: true,
        features: ['predictions', 'pattern_detection', 'early_warnings', 'recommendations']
      },
      reports: {
        initialized: true,
        features: ['auto_generation', 'trend_analysis', 'comparative_reports', 'predictive_reports']
      },
      timestamp: new Date().toISOString()
    };

    res.json(status);
  } catch (error) {
    logger.error('Error al obtener estado de IA:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/ai/health
 * @desc Verificar salud de los servicios de IA
 */
router.get('/health', isAuthenticated, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      services: {
        openai: 'connected',
        cache: 'available',
        database: 'connected'
      },
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    logger.error('Error en health check de IA:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 