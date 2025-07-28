import express from 'express';
import { createClient } from 'redis';
import winston from 'winston';

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configurar Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Configurar rutas MCP
const router = express.Router();

// Health check para MCP Router
router.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.status(200).json({
      status: 'healthy',
      service: 'mcp-router',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('MCP Router health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'mcp-router',
      error: error.message
    });
  }
});

// Ruta para enrutar requests MCP
router.post('/route', async (req, res) => {
  try {
    const { service, action, data } = req.body;
    
    logger.info(Routing request to service: , action: );
    
    // Determinar el servicio destino basado en el tipo de request
    const serviceMap = {
      'academic': 'http://academic-data-server:3012',
      'resource': 'http://resource-management-server:3013',
      'communication': 'http://communication-server:3014',
      'analytics': 'http://analytics-server:3015'
    };
    
    const targetService = serviceMap[service];
    if (!targetService) {
      return res.status(400).json({
        error: 'Invalid service',
        availableServices: Object.keys(serviceMap)
      });
    }
    
    // Forward request to target service
    const response = await fetch(${targetService}/mcp/, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    res.json(result);
    
  } catch (error) {
    logger.error('MCP routing error:', error);
    res.status(500).json({
      error: 'Routing failed',
      message: error.message
    });
  }
});

// Ruta para obtener estadísticas de routing
router.get('/stats', async (req, res) => {
  try {
    const stats = await redisClient.get('mcp:router:stats');
    res.json({
      stats: stats ? JSON.parse(stats) : {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get router stats:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

export default router;
