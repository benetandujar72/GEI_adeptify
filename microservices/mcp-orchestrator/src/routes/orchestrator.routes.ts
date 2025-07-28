import { Router } from 'express';
import { z } from 'zod';
import { MCPRouterService } from '../services/mcp-router.service.js';
import { ContextManagerService } from '../services/context-manager.service.js';
import { AIAgentCoordinatorService } from '../services/ai-agent-coordinator.service.js';
import { 
  logger, 
  logMCPRequest, 
  logMCPResponse, 
  logContextCreation, 
  logContextAccess,
  logAgentRegistration,
  logTaskCreation,
  logWorkflowCreation
} from '../utils/logger.js';
import { RequestPriority, TaskPriority, AgentType, TaskType } from '../types/orchestrator.types.js';

const router = Router();

// Inicializar servicios
const routerService = new MCPRouterService();
const contextService = new ContextManagerService();
const agentService = new AIAgentCoordinatorService();

// ===== SCHEMAS DE VALIDACIÓN =====

// Schema para requests MCP
const mcpRequestSchema = z.object({
  userId: z.string().min(1, 'User ID es requerido'),
  sessionId: z.string().min(1, 'Session ID es requerido'),
  service: z.string().min(1, 'Service es requerido'),
  action: z.string().min(1, 'Action es requerido'),
  data: z.any().optional(),
  priority: z.nativeEnum(RequestPriority).default(RequestPriority.NORMAL),
  timeout: z.number().positive().optional(),
  retries: z.number().int().min(0).optional()
});

// Schema para context creation
const createContextSchema = z.object({
  userId: z.string().min(1, 'User ID es requerido'),
  sessionId: z.string().min(1, 'Session ID es requerido'),
  data: z.record(z.any()).default({}),
  metadata: z.object({
    source: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.number().min(1).max(10).optional()
  }).optional()
});

// Schema para context update
const updateContextSchema = z.object({
  data: z.record(z.any()).optional(),
  metadata: z.object({
    source: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.number().min(1).max(10).optional()
  }).optional()
});

// Schema para context search
const searchContextsSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minPriority: z.number().min(1).max(10).optional(),
  maxAge: z.number().positive().optional()
});

// Schema para agent registration
const registerAgentSchema = z.object({
  name: z.string().min(1, 'Agent name es requerido'),
  type: z.nativeEnum(AgentType),
  capabilities: z.array(z.object({
    name: z.string(),
    version: z.string(),
    parameters: z.record(z.any()).optional(),
    constraints: z.array(z.any()).optional()
  })).min(1, 'Al menos una capacidad es requerida'),
  configuration: z.object({
    discovery: z.object({
      enabled: z.boolean(),
      interval: z.number().positive(),
      timeout: z.number().positive(),
      retries: z.number().int().min(0)
    }).optional(),
    health: z.object({
      enabled: z.boolean(),
      interval: z.number().positive(),
      timeout: z.number().positive(),
      threshold: z.number().int().min(1)
    }).optional(),
    scaling: z.object({
      enabled: z.boolean(),
      minInstances: z.number().int().min(1),
      maxInstances: z.number().int().min(1),
      scaleUpThreshold: z.number().min(0).max(100),
      scaleDownThreshold: z.number().min(0).max(100)
    }).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

// Schema para task creation
const createTaskSchema = z.object({
  agentId: z.string().min(1, 'Agent ID es requerido'),
  type: z.nativeEnum(TaskType),
  data: z.any(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.NORMAL),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().int().min(0).optional()
});

// Schema para workflow creation
const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name es requerido'),
  description: z.string().optional(),
  steps: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['agent_task', 'condition', 'delay', 'transform', 'validate']),
    agentId: z.string().optional(),
    parameters: z.record(z.any()).optional(),
    conditions: z.array(z.any()).optional(),
    timeout: z.number().positive().optional(),
    retries: z.number().int().min(0).optional(),
    dependencies: z.array(z.string()).optional()
  })).min(1, 'Al menos un paso es requerido'),
  triggers: z.array(z.object({
    type: z.enum(['schedule', 'event', 'condition', 'manual']),
    condition: z.any().optional(),
    action: z.any().optional(),
    enabled: z.boolean().default(true)
  })).optional(),
  metadata: z.record(z.any()).optional()
});

// Schema para workflow execution
const executeWorkflowSchema = z.object({
  inputData: z.record(z.any()).optional()
});

// ===== RUTAS MCP ROUTER =====

// POST /api/orchestrator/route - Enrutar request MCP
router.post('/route', async (req, res) => {
  try {
    const validatedData = mcpRequestSchema.parse(req.body);
    
    const request = {
      id: req.headers['x-request-id'] as string || `req_${Date.now()}`,
      ...validatedData,
      context: {
        user: { id: validatedData.userId, role: 'user', permissions: [], preferences: {}, lastActivity: new Date() },
        session: { id: validatedData.sessionId, startTime: new Date(), lastActivity: new Date(), data: {}, state: 'active' },
        environment: { platform: 'web', version: '1.0.0', locale: 'es', timezone: 'UTC', device: { type: 'desktop', os: 'unknown', browser: 'unknown', screen: { width: 1920, height: 1080, colorDepth: 24 } } },
        preferences: { language: 'es', theme: 'light', notifications: { email: true, push: true, sms: false, inApp: true }, accessibility: { highContrast: false, fontSize: 16, screenReader: false, keyboardNavigation: true }, privacy: { dataSharing: true, analytics: true, marketing: false, thirdParty: false } },
        history: []
      },
      timestamp: new Date()
    };

    logMCPRequest(request.id, request.service, request.action, request.userId, request.priority);

    const response = await routerService.processRequest(request);
    
    logMCPResponse(request.id, request.service, response.success, response.processingTime, response.error);

    res.status(response.success ? 200 : 500).json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in MCP route request', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error processing MCP route request', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/services - Obtener servicios registrados
router.get('/services', (req, res) => {
  try {
    const services = Array.from(routerService['serviceRegistry'].services.values()).map(service => ({
      id: service.id,
      name: service.name,
      version: service.version,
      capabilities: service.capabilities,
      health: routerService.getServiceHealth(service.id),
      circuitBreaker: routerService.getCircuitBreaker(service.id)
    }));

    res.json({
      success: true,
      data: services,
      total: services.length
    });

  } catch (error) {
    logger.error('Error getting services', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/services/:serviceId - Obtener servicio específico
router.get('/services/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    const service = routerService.getServiceInfo(serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...service,
        health: routerService.getServiceHealth(serviceId),
        circuitBreaker: routerService.getCircuitBreaker(serviceId)
      }
    });

  } catch (error) {
    logger.error('Error getting service', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      serviceId: req.params.serviceId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/metrics - Obtener métricas del router
router.get('/metrics', (req, res) => {
  try {
    const metrics = routerService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting router metrics', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===== RUTAS CONTEXT MANAGER =====

// POST /api/orchestrator/contexts - Crear contexto
router.post('/contexts', async (req, res) => {
  try {
    const validatedData = createContextSchema.parse(req.body);
    
    const context = contextService.createContext(
      validatedData.userId,
      validatedData.sessionId,
      validatedData.data,
      validatedData.metadata
    );

    logContextCreation(context.id, context.userId, context.sessionId, context.metadata.size);

    res.status(201).json({
      success: true,
      data: context
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in context creation', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error creating context', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/contexts/:contextId - Obtener contexto
router.get('/contexts/:contextId', (req, res) => {
  try {
    const { contextId } = req.params;
    const context = contextService.getContext(contextId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Context not found'
      });
    }

    logContextAccess(contextId, context.userId, 'get', context.accessCount);

    res.json({
      success: true,
      data: context
    });

  } catch (error) {
    logger.error('Error getting context', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      contextId: req.params.contextId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/orchestrator/contexts/:contextId - Actualizar contexto
router.put('/contexts/:contextId', async (req, res) => {
  try {
    const { contextId } = req.params;
    const validatedData = updateContextSchema.parse(req.body);
    
    const context = contextService.updateContext(contextId, validatedData);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Context not found'
      });
    }

    res.json({
      success: true,
      data: context
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in context update', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error updating context', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      contextId: req.params.contextId,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/orchestrator/contexts/:contextId - Eliminar contexto
router.delete('/contexts/:contextId', (req, res) => {
  try {
    const { contextId } = req.params;
    const deleted = contextService.deleteContext(contextId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Context not found'
      });
    }

    res.json({
      success: true,
      message: 'Context deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting context', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      contextId: req.params.contextId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/orchestrator/contexts/search - Buscar contextos
router.post('/contexts/search', async (req, res) => {
  try {
    const validatedData = searchContextsSchema.parse(req.body);
    
    const contexts = contextService.searchContexts(validatedData);

    res.json({
      success: true,
      data: contexts,
      total: contexts.length
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in context search', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error searching contexts', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/contexts/user/:userId - Obtener contextos por usuario
router.get('/contexts/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const contexts = contextService.getContextsByUser(userId);

    res.json({
      success: true,
      data: contexts,
      total: contexts.length
    });

  } catch (error) {
    logger.error('Error getting contexts by user', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/contexts/session/:sessionId - Obtener contextos por sesión
router.get('/contexts/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const contexts = contextService.getContextsBySession(sessionId);

    res.json({
      success: true,
      data: contexts,
      total: contexts.length
    });

  } catch (error) {
    logger.error('Error getting contexts by session', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      sessionId: req.params.sessionId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/contexts/metrics - Obtener métricas del context manager
router.get('/contexts/metrics', (req, res) => {
  try {
    const metrics = contextService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting context metrics', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===== RUTAS AI AGENT COORDINATOR =====

// POST /api/orchestrator/agents - Registrar agente
router.post('/agents', async (req, res) => {
  try {
    const validatedData = registerAgentSchema.parse(req.body);
    
    const agent = {
      id: `agent_${Date.now()}`,
      ...validatedData,
      status: 'online',
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 0,
        uptime: 0,
        errors: [],
        metrics: {
          requestsPerSecond: 0,
          errorRate: 0,
          averageResponseTime: 0,
          activeConnections: 0,
          memoryUsage: 0,
          cpuUsage: 0
        }
      },
      configuration: validatedData.configuration || {
        discovery: { enabled: true, interval: 30000, timeout: 5000, retries: 3 },
        health: { enabled: true, interval: 30000, timeout: 5000, threshold: 3 },
        scaling: { enabled: false, minInstances: 1, maxInstances: 5, scaleUpThreshold: 80, scaleDownThreshold: 20 },
        policies: { rules: [], actions: [], priority: 1 }
      },
      metadata: validatedData.metadata || {}
    };

    agentService.registerAgent(agent);

    logAgentRegistration(agent.id, agent.name, agent.type, agent.capabilities.length);

    res.status(201).json({
      success: true,
      data: agent
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in agent registration', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error registering agent', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/agents - Obtener agentes
router.get('/agents', (req, res) => {
  try {
    const agents = Array.from(agentService['agents'].values());

    res.json({
      success: true,
      data: agents,
      total: agents.length
    });

  } catch (error) {
    logger.error('Error getting agents', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/agents/:agentId - Obtener agente específico
router.get('/agents/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = agentService.getAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent
    });

  } catch (error) {
    logger.error('Error getting agent', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      agentId: req.params.agentId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/agents/type/:type - Obtener agentes por tipo
router.get('/agents/type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const agents = agentService.getAgentsByType(type as AgentType);

    res.json({
      success: true,
      data: agents,
      total: agents.length
    });

  } catch (error) {
    logger.error('Error getting agents by type', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      type: req.params.type
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/orchestrator/tasks - Crear tarea
router.post('/tasks', async (req, res) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);
    
    const task = agentService.createTask(
      validatedData.agentId,
      validatedData.type,
      validatedData.data,
      validatedData.priority
    );

    logTaskCreation(task.id, task.agentId, task.type, task.priority, JSON.stringify(task.data).length);

    res.status(201).json({
      success: true,
      data: task
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in task creation', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error creating task', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/tasks - Obtener tareas
router.get('/tasks', (req, res) => {
  try {
    const { agentId, status } = req.query;
    let tasks = Array.from(agentService['tasks'].values());

    if (agentId) {
      tasks = tasks.filter(task => task.agentId === agentId);
    }

    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    res.json({
      success: true,
      data: tasks,
      total: tasks.length
    });

  } catch (error) {
    logger.error('Error getting tasks', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/tasks/:taskId - Obtener tarea específica
router.get('/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = agentService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (error) {
    logger.error('Error getting task', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      taskId: req.params.taskId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/orchestrator/workflows - Crear workflow
router.post('/workflows', async (req, res) => {
  try {
    const validatedData = createWorkflowSchema.parse(req.body);
    
    const workflow = agentService.createWorkflow(validatedData);

    logWorkflowCreation(workflow.id, workflow.name, workflow.steps.length, workflow.triggers.length);

    res.status(201).json({
      success: true,
      data: workflow
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in workflow creation', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error creating workflow', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/workflows - Obtener workflows
router.get('/workflows', (req, res) => {
  try {
    const { status } = req.query;
    let workflows = Array.from(agentService['workflows'].values());

    if (status) {
      workflows = workflows.filter(workflow => workflow.status === status);
    }

    res.json({
      success: true,
      data: workflows,
      total: workflows.length
    });

  } catch (error) {
    logger.error('Error getting workflows', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/workflows/:workflowId - Obtener workflow específico
router.get('/workflows/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = agentService.getWorkflow(workflowId);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: workflow
    });

  } catch (error) {
    logger.error('Error getting workflow', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      workflowId: req.params.workflowId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/orchestrator/workflows/:workflowId/execute - Ejecutar workflow
router.post('/workflows/:workflowId/execute', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const validatedData = executeWorkflowSchema.parse(req.body);
    
    const execution = await agentService.executeWorkflow(workflowId, validatedData.inputData);

    res.json({
      success: true,
      data: execution
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in workflow execution', {
        errors: error.errors,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    logger.error('Error executing workflow', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      workflowId: req.params.workflowId,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/orchestrator/agents/metrics - Obtener métricas del agent coordinator
router.get('/agents/metrics', (req, res) => {
  try {
    const metrics = agentService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting agent metrics', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ===== RUTAS GENERALES =====

// GET /api/orchestrator/health - Health check
router.get('/health', (req, res) => {
  try {
    const routerMetrics = routerService.getMetrics();
    const contextMetrics = contextService.getMetrics();
    const agentMetrics = agentService.getMetrics();

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      components: {
        router: {
          status: 'healthy',
          services: routerMetrics.totalServices,
          healthyServices: routerMetrics.healthyServices
        },
        context: {
          status: 'healthy',
          contexts: contextMetrics.totalContexts
        },
        agents: {
          status: 'healthy',
          agents: agentMetrics.totalAgents,
          activeAgents: agentMetrics.activeAgents
        }
      },
      version: '1.0.0',
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error in health check', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// GET /api/orchestrator/metrics - Métricas generales
router.get('/metrics', (req, res) => {
  try {
    const routerMetrics = routerService.getMetrics();
    const contextMetrics = contextService.getMetrics();
    const agentMetrics = agentService.getMetrics();

    const metrics = {
      router: routerMetrics,
      context: contextMetrics,
      agents: agentMetrics,
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting general metrics', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 