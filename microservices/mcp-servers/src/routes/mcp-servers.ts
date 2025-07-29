import { Router } from 'express';
import { mcpServersController } from '@/controllers/mcp-servers.controller';
import { authMiddleware } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { 
  MCPServerConfigSchema, 
  OperationRequestSchema, 
  HeartbeatSchema 
} from '@/types/mcp';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Health check
router.get('/health', mcpServersController.healthCheck.bind(mcpServersController));

// Server management routes
router.get('/servers', mcpServersController.getServers.bind(mcpServersController));
router.get('/servers/statistics', mcpServersController.getServerStatistics.bind(mcpServersController));
router.get('/servers/type/:type', mcpServersController.getServersByType.bind(mcpServersController));
router.get('/servers/status/:status', mcpServersController.getServersByStatus.bind(mcpServersController));
router.get('/servers/:serverId', mcpServersController.getServerById.bind(mcpServersController));

// Server creation and deletion
router.post('/servers', 
  validateRequest({ body: { type: 'string', config: 'object' } }),
  mcpServersController.createServer.bind(mcpServersController)
);
router.delete('/servers/:serverId', mcpServersController.deleteServer.bind(mcpServersController));

// Server configuration
router.put('/servers/:serverId/config', 
  validateRequest({ body: MCPServerConfigSchema.partial() }),
  mcpServersController.updateServerConfig.bind(mcpServersController)
);

// Server operations
router.post('/servers/:serverId/request', 
  validateRequest({ body: OperationRequestSchema }),
  mcpServersController.handleRequest.bind(mcpServersController)
);

// Heartbeat
router.post('/heartbeat', 
  validateRequest({ body: HeartbeatSchema }),
  mcpServersController.handleHeartbeat.bind(mcpServersController)
);

// Metrics and monitoring
router.get('/metrics', mcpServersController.getAllMetrics.bind(mcpServersController));
router.get('/servers/:serverId/metrics', mcpServersController.getServerMetrics.bind(mcpServersController));
router.get('/servers/:serverId/errors', mcpServersController.getServerErrors.bind(mcpServersController));

// Events
router.get('/events', mcpServersController.getEvents.bind(mcpServersController));
router.get('/servers/:serverId/events', mcpServersController.getEventsByServer.bind(mcpServersController));

export default router;