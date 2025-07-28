import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { MCPOrchestrator } from '../services/mcp-orchestrator.service.js';
import { MCPRequest, MCPRoutingError, MCPExecutionError } from '../types/mcp.js';

const router = Router();
const orchestrator = new MCPOrchestrator();

// Middleware para manejar errores de validación
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route POST /mcp/execute
 * @desc Ejecutar una capacidad MCP
 * @access Public
 */
router.post('/execute', [
  body('capability').isString().notEmpty(),
  body('parameters').isObject(),
  body('sessionId').optional().isString(),
  body('userId').optional().isString(),
  handleValidationErrors,
], async (req, res) => {
  try {
    const request: MCPRequest = {
      capability: req.body.capability,
      parameters: req.body.parameters,
      sessionId: req.body.sessionId,
      userId: req.body.userId,
      timestamp: new Date().toISOString(),
    };

    const response = await orchestrator.executeCapability(request);
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof MCPRoutingError) {
      res.status(503).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else if (error instanceof MCPExecutionError) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
});

/**
 * @route POST /mcp/register-server
 * @desc Registrar un nuevo servidor MCP
 * @access Public
 */
router.post('/register-server', [
  body('name').isString().notEmpty(),
  body('domain').isString().notEmpty(),
  body('endpoint').isURL(),
  body('capabilities').isArray(),
  body('capabilities.*').isString(),
  body('metadata').optional().isObject(),
  handleValidationErrors,
], async (req, res) => {
  try {
    await orchestrator.registerServer({
      name: req.body.name,
      domain: req.body.domain,
      endpoint: req.body.endpoint,
      capabilities: req.body.capabilities,
      metadata: req.body.metadata,
    });

    res.status(201).json({
      success: true,
      message: 'Server registered successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

/**
 * @route GET /mcp/servers
 * @desc Obtener información de servidores registrados
 * @access Public
 */
router.get('/servers', (req, res) => {
  try {
    const servers = orchestrator.getServers();
    
    res.json({
      success: true,
      data: servers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get servers',
    });
  }
});

/**
 * @route GET /mcp/metrics
 * @desc Obtener métricas del orchestrator
 * @access Public
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = orchestrator.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics',
    });
  }
});

/**
 * @route GET /mcp/capabilities
 * @desc Obtener todas las capacidades disponibles
 * @access Public
 */
router.get('/capabilities', (req, res) => {
  try {
    const servers = orchestrator.getServers();
    const capabilities = new Set<string>();
    
    servers.forEach(server => {
      server.capabilities.forEach(capability => {
        capabilities.add(capability);
      });
    });
    
    res.json({
      success: true,
      data: Array.from(capabilities),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get capabilities',
    });
  }
});

/**
 * @route GET /mcp/health
 * @desc Health check del orchestrator
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    const metrics = orchestrator.getMetrics();
    const servers = orchestrator.getServers();
    
    const healthyServers = servers.filter(s => s.status === 'healthy').length;
    const totalServers = servers.length;
    
    const status = totalServers === 0 ? 'no_servers' : 
                   healthyServers === totalServers ? 'healthy' : 
                   healthyServers > 0 ? 'degraded' : 'unhealthy';
    
    res.json({
      service: 'mcp-orchestrator',
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        totalServers,
        healthyServers,
        totalRequests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0 ? 
          (metrics.successfulRequests / metrics.totalRequests) * 100 : 0,
      },
    });
  } catch (error) {
    res.status(503).json({
      service: 'mcp-orchestrator',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

export default router; 