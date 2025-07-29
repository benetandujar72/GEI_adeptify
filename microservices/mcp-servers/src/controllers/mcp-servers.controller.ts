import { Request, Response } from 'express';
import { 
  MCPServerType, 
  ServerStatus, 
  OperationType,
  OperationRequest,
  OperationResponse,
  Heartbeat,
  MCPServerConfig
} from '@/types/mcp';
import { serverManager } from '@/services/server-manager';
import { FileSystemServer } from '@/services/file-system-server';
import { 
  logMCPOperation, 
  logServerRegistration, 
  logServerError,
  logHealthCheck 
} from '@/utils/logger';

export class MCPServersController {
  async getServers(req: Request, res: Response): Promise<void> {
    try {
      const servers = serverManager.getAllServers();
      const serverData = servers.map(server => ({
        id: server.id,
        name: server.config.name,
        type: server.config.type,
        status: server.status,
        capabilities: server.config.capabilities,
        endpoints: server.config.endpoints,
        description: server.config.description
      }));

      res.json({
        success: true,
        data: serverData,
        count: serverData.length
      });
    } catch (error) {
      logServerError('controller', 'getServers', `Failed to get servers: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get servers'
      });
    }
  }

  async getServerById(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const server = serverManager.getServer(serverId);

      if (!server) {
        res.status(404).json({
          success: false,
          error: 'Server not found'
        });
        return;
      }

      const health = serverManager.getServerHealth(serverId);
      const metrics = serverManager.getServerMetrics(serverId);

      res.json({
        success: true,
        data: {
          id: server.id,
          name: server.config.name,
          type: server.config.type,
          status: server.status,
          capabilities: server.config.capabilities,
          endpoints: server.config.endpoints,
          description: server.config.description,
          health,
          metrics
        }
      });
    } catch (error) {
      logServerError('controller', 'getServerById', `Failed to get server: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get server'
      });
    }
  }

  async getServersByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const serverType = type as MCPServerType;
      
      if (!Object.values(MCPServerType).includes(serverType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid server type'
        });
        return;
      }

      const servers = serverManager.getServersByType(serverType);
      const serverData = servers.map(server => ({
        id: server.id,
        name: server.config.name,
        type: server.config.type,
        status: server.status,
        capabilities: server.config.capabilities,
        endpoints: server.config.endpoints
      }));

      res.json({
        success: true,
        data: serverData,
        count: serverData.length,
        type: serverType
      });
    } catch (error) {
      logServerError('controller', 'getServersByType', `Failed to get servers by type: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get servers by type'
      });
    }
  }

  async getServersByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const serverStatus = status as ServerStatus;
      
      if (!Object.values(ServerStatus).includes(serverStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid server status'
        });
        return;
      }

      const servers = serverManager.getServersByStatus(serverStatus);
      const serverData = servers.map(server => ({
        id: server.id,
        name: server.config.name,
        type: server.config.type,
        status: server.status,
        capabilities: server.config.capabilities
      }));

      res.json({
        success: true,
        data: serverData,
        count: serverData.length,
        status: serverStatus
      });
    } catch (error) {
      logServerError('controller', 'getServersByStatus', `Failed to get servers by status: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get servers by status'
      });
    }
  }

  async createServer(req: Request, res: Response): Promise<void> {
    try {
      const { type, config } = req.body;

      if (!type || !Object.values(MCPServerType).includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid server type'
        });
        return;
      }

      let server;
      switch (type) {
        case MCPServerType.FILE_SYSTEM:
          server = new FileSystemServer(config);
          break;
        // Add other server types here
        default:
          res.status(400).json({
            success: false,
            error: `Server type ${type} not implemented yet`
          });
          return;
      }

      await serverManager.registerServer(server);
      await server.start();

      logServerRegistration(server.id, server.config.type, server.status);

      res.status(201).json({
        success: true,
        data: {
          id: server.id,
          name: server.config.name,
          type: server.config.type,
          status: server.status,
          capabilities: server.config.capabilities,
          endpoints: server.config.endpoints
        }
      });
    } catch (error) {
      logServerError('controller', 'createServer', `Failed to create server: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to create server'
      });
    }
  }

  async deleteServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const server = serverManager.getServer(serverId);

      if (!server) {
        res.status(404).json({
          success: false,
          error: 'Server not found'
        });
        return;
      }

      await server.stop();
      await serverManager.unregisterServer(serverId);

      res.json({
        success: true,
        data: { deleted: true, serverId }
      });
    } catch (error) {
      logServerError('controller', 'deleteServer', `Failed to delete server: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to delete server'
      });
    }
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const requestData: OperationRequest = req.body;

      const server = serverManager.getServer(serverId);
      if (!server) {
        res.status(404).json({
          success: false,
          error: 'Server not found'
        });
        return;
      }

      if (server.status !== ServerStatus.ONLINE) {
        res.status(503).json({
          success: false,
          error: 'Server is not online'
        });
        return;
      }

      logMCPOperation(serverId, requestData.operation, { resource: requestData.resource });

      const response = await server.handleRequest(requestData);

      res.json({
        success: response.success,
        data: response.data,
        error: response.error,
        metadata: response.metadata
      });
    } catch (error) {
      logServerError('controller', 'handleRequest', `Failed to handle request: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to handle request'
      });
    }
  }

  async handleHeartbeat(req: Request, res: Response): Promise<void> {
    try {
      const heartbeatData: Heartbeat = req.body;
      
      serverManager.handleHeartbeat(heartbeatData);

      res.json({
        success: true,
        data: { received: true, timestamp: new Date() }
      });
    } catch (error) {
      logServerError('controller', 'handleHeartbeat', `Failed to handle heartbeat: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to handle heartbeat'
      });
    }
  }

  async getServerMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const metrics = serverManager.getServerMetrics(serverId);

      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'Server metrics not found'
        });
        return;
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logServerError('controller', 'getServerMetrics', `Failed to get server metrics: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get server metrics'
      });
    }
  }

  async getAllMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = serverManager.getAllMetrics();

      res.json({
        success: true,
        data: metrics,
        count: metrics.length
      });
    } catch (error) {
      logServerError('controller', 'getAllMetrics', `Failed to get all metrics: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get all metrics'
      });
    }
  }

  async getServerErrors(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const errors = serverManager.getServerErrors(serverId);

      res.json({
        success: true,
        data: errors,
        count: errors.length
      });
    } catch (error) {
      logServerError('controller', 'getServerErrors', `Failed to get server errors: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get server errors'
      });
    }
  }

  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = serverManager.getEvents(limit);

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      logServerError('controller', 'getEvents', `Failed to get events: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get events'
      });
    }
  }

  async getEventsByServer(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const events = serverManager.getEventsByServer(serverId, limit);

      res.json({
        success: true,
        data: events,
        count: events.length,
        serverId
      });
    } catch (error) {
      logServerError('controller', 'getEventsByServer', `Failed to get events by server: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get events by server'
      });
    }
  }

  async getServerStatistics(req: Request, res: Response): Promise<void> {
    try {
      const totalServers = serverManager.getServerCount();
      const serversByType = serverManager.getServerCountByType();
      const serversByStatus = serverManager.getServerCountByStatus();
      const onlineServers = serverManager.getOnlineServers().length;
      const offlineServers = serverManager.getOfflineServers().length;
      const errorServers = serverManager.getServersInError().length;

      res.json({
        success: true,
        data: {
          total: totalServers,
          byType: serversByType,
          byStatus: serversByStatus,
          online: onlineServers,
          offline: offlineServers,
          error: errorServers
        }
      });
    } catch (error) {
      logServerError('controller', 'getServerStatistics', `Failed to get server statistics: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to get server statistics'
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const totalServers = serverManager.getServerCount();
      const onlineServers = serverManager.getOnlineServers().length;
      const responseTime = Date.now() - startTime;

      const health = {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
        servers: {
          total: totalServers,
          online: onlineServers,
          offline: totalServers - onlineServers
        }
      };

      logHealthCheck('controller', 'healthy', responseTime);

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logServerError('controller', 'healthCheck', `Health check failed: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date()
        }
      });
    }
  }

  async updateServerConfig(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.params;
      const configUpdate: Partial<MCPServerConfig> = req.body;

      const server = serverManager.getServer(serverId);
      if (!server) {
        res.status(404).json({
          success: false,
          error: 'Server not found'
        });
        return;
      }

      server.updateConfig(configUpdate);

      res.json({
        success: true,
        data: {
          id: server.id,
          name: server.config.name,
          type: server.config.type,
          status: server.status,
          capabilities: server.config.capabilities,
          endpoints: server.config.endpoints
        }
      });
    } catch (error) {
      logServerError('controller', 'updateServerConfig', `Failed to update server config: ${error}`, error instanceof Error ? error.stack : undefined);
      res.status(500).json({
        success: false,
        error: 'Failed to update server config'
      });
    }
  }
}

export const mcpServersController = new MCPServersController();