import { Router } from 'express';
import { mcpController } from '../controllers/mcp.controller';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { 
  ServiceRegistrationSchema, 
  ContextSchema, 
  RoutingRequestSchema,
  AgentConfigSchema 
} from '../types/mcp';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Main routing endpoint
router.post('/route', 
  validateRequest(RoutingRequestSchema),
  mcpController.routeRequest.bind(mcpController)
);

// Service Management Routes
router.post('/services/register',
  validateRequest(ServiceRegistrationSchema),
  mcpController.registerService.bind(mcpController)
);

router.get('/services',
  mcpController.getServices.bind(mcpController)
);

router.get('/services/:serviceName',
  mcpController.getServiceStatus.bind(mcpController)
);

router.delete('/services',
  mcpController.removeService.bind(mcpController)
);

// Context Management Routes
router.post('/contexts',
  validateRequest(ContextSchema),
  mcpController.createContext.bind(mcpController)
);

router.get('/contexts/:contextId',
  mcpController.getContext.bind(mcpController)
);

router.put('/contexts/:contextId',
  mcpController.updateContext.bind(mcpController)
);

router.delete('/contexts/:contextId',
  mcpController.deleteContext.bind(mcpController)
);

router.get('/contexts/user/:userId',
  mcpController.getContextsByUser.bind(mcpController)
);

router.get('/contexts/summary',
  mcpController.getContextSummary.bind(mcpController)
);

// Agent Management Routes
router.post('/agents',
  validateRequest(AgentConfigSchema),
  mcpController.registerAgent.bind(mcpController)
);

router.delete('/agents/:agentId',
  mcpController.unregisterAgent.bind(mcpController)
);

router.put('/agents/:agentId/status',
  mcpController.updateAgentStatus.bind(mcpController)
);

router.post('/agents/:agentId/heartbeat',
  mcpController.heartbeat.bind(mcpController)
);

router.get('/agents',
  mcpController.getAgents.bind(mcpController)
);

router.get('/agents/:agentId/metrics',
  mcpController.getAgentMetrics.bind(mcpController)
);

router.get('/agents/metrics/all',
  mcpController.getAllAgentMetrics.bind(mcpController)
);

// Task Management Routes
router.post('/tasks',
  mcpController.createTask.bind(mcpController)
);

router.put('/tasks/:taskId/complete',
  mcpController.completeTask.bind(mcpController)
);

router.get('/tasks',
  mcpController.getTasks.bind(mcpController)
);

router.get('/tasks/queue',
  mcpController.getTaskQueue.bind(mcpController)
);

// Workflow Management Routes
router.post('/workflows',
  mcpController.createWorkflow.bind(mcpController)
);

router.post('/workflows/:workflowId/execute',
  mcpController.executeWorkflow.bind(mcpController)
);

router.get('/workflows',
  mcpController.getWorkflows.bind(mcpController)
);

// Health Check Route
router.get('/health',
  mcpController.healthCheck.bind(mcpController)
);

export default router;