import { v4 as uuidv4 } from 'uuid';
import { 
  MCPServer, 
  MCPServerConfig, 
  ServerStatus, 
  MCPServerType, 
  ServerManager as IServerManager,
  Heartbeat,
  MCPServerMetrics,
  MCPServerError,
  MCPServerEvent
} from '@/types/mcp';
import { 
  logServerRegistration, 
  logServerHeartbeat, 
  logServerError,
  logMCPOperation 
} from '@/utils/logger';

export class ServerManager implements IServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private heartbeats: Map<string, Date> = new Map();
  private metrics: Map<string, MCPServerMetrics> = new Map();
  private errors: Map<string, MCPServerError[]> = new Map();
  private events: MCPServerEvent[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeatMonitoring();
    this.startCleanupInterval();
  }

  async registerServer(server: MCPServer): Promise<void> {
    try {
      this.servers.set(server.id, server);
      this.heartbeats.set(server.id, new Date());
      this.metrics.set(server.id, this.initializeMetrics(server.id));
      this.errors.set(server.id, []);

      logServerRegistration(server.id, server.config.type, server.status);

      this.addEvent({
        type: 'server_started',
        serverId: server.id,
        timestamp: new Date(),
        data: { type: server.config.type, status: server.status }
      });

      logMCPOperation(server.id, 'register', { type: server.config.type });
    } catch (error) {
      logServerError(server.id, `Failed to register server: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async unregisterServer(serverId: string): Promise<void> {
    try {
      const server = this.servers.get(serverId);
      if (server) {
        this.servers.delete(serverId);
        this.heartbeats.delete(serverId);
        this.metrics.delete(serverId);
        this.errors.delete(serverId);

        this.addEvent({
          type: 'server_stopped',
          serverId,
          timestamp: new Date(),
          data: { type: server.config.type }
        });

        logMCPOperation(serverId, 'unregister', { type: server.config.type });
      }
    } catch (error) {
      logServerError(serverId, `Failed to unregister server: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getServersByType(type: MCPServerType): MCPServer[] {
    return Array.from(this.servers.values()).filter(server => server.config.type === type);
  }

  updateServerStatus(serverId: string, status: ServerStatus): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      this.heartbeats.set(serverId, new Date());

      if (status === ServerStatus.ERROR) {
        this.addEvent({
          type: 'server_error',
          serverId,
          timestamp: new Date(),
          data: { status }
        });
      }
    }
  }

  handleHeartbeat(heartbeat: Heartbeat): void {
    try {
      const server = this.servers.get(heartbeat.serverId);
      if (server) {
        this.heartbeats.set(heartbeat.serverId, heartbeat.timestamp);
        server.status = heartbeat.status;

        if (heartbeat.metrics) {
          this.updateMetrics(heartbeat.serverId, heartbeat.metrics);
        }

        logServerHeartbeat(heartbeat.serverId, heartbeat.status, heartbeat.metrics);

        this.addEvent({
          type: 'heartbeat',
          serverId: heartbeat.serverId,
          timestamp: heartbeat.timestamp,
          data: { status: heartbeat.status, metrics: heartbeat.metrics }
        });
      }
    } catch (error) {
      logServerError(heartbeat.serverId, `Failed to handle heartbeat: ${error}`, error instanceof Error ? error.stack : undefined);
    }
  }

  getServerHealth(serverId: string): { status: ServerStatus; lastHeartbeat: Date | null; uptime: number } {
    const server = this.servers.get(serverId);
    const lastHeartbeat = this.heartbeats.get(serverId);
    
    if (!server) {
      return { status: ServerStatus.OFFLINE, lastHeartbeat: null, uptime: 0 };
    }

    const uptime = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : 0;
    
    return {
      status: server.status,
      lastHeartbeat: lastHeartbeat || null,
      uptime
    };
  }

  getServerMetrics(serverId: string): MCPServerMetrics | null {
    return this.metrics.get(serverId) || null;
  }

  getAllMetrics(): MCPServerMetrics[] {
    return Array.from(this.metrics.values());
  }

  getServerErrors(serverId: string): MCPServerError[] {
    return this.errors.get(serverId) || [];
  }

  addServerError(serverId: string, error: MCPServerError): void {
    const serverErrors = this.errors.get(serverId) || [];
    serverErrors.push(error);
    this.errors.set(serverId, serverErrors.slice(-100)); // Keep last 100 errors
  }

  getEvents(limit: number = 100): MCPServerEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByServer(serverId: string, limit: number = 50): MCPServerEvent[] {
    return this.events
      .filter(event => event.serverId === serverId)
      .slice(-limit);
  }

  getServersByStatus(status: ServerStatus): MCPServer[] {
    return Array.from(this.servers.values()).filter(server => server.status === status);
  }

  getOnlineServers(): MCPServer[] {
    return this.getServersByStatus(ServerStatus.ONLINE);
  }

  getOfflineServers(): MCPServer[] {
    return this.getServersByStatus(ServerStatus.OFFLINE);
  }

  getServersInError(): MCPServer[] {
    return this.getServersByStatus(ServerStatus.ERROR);
  }

  getServersInMaintenance(): MCPServer[] {
    return this.getServersByStatus(ServerStatus.MAINTENANCE);
  }

  getServerCount(): number {
    return this.servers.size;
  }

  getServerCountByType(): Record<MCPServerType, number> {
    const counts: Record<MCPServerType, number> = {} as Record<MCPServerType, number>;
    
    for (const server of this.servers.values()) {
      const type = server.config.type;
      counts[type] = (counts[type] || 0) + 1;
    }
    
    return counts;
  }

  getServerCountByStatus(): Record<ServerStatus, number> {
    const counts: Record<ServerStatus, number> = {} as Record<ServerStatus, number>;
    
    for (const server of this.servers.values()) {
      const status = server.status;
      counts[status] = (counts[status] || 0) + 1;
    }
    
    return counts;
  }

  private initializeMetrics(serverId: string): MCPServerMetrics {
    return {
      serverId,
      timestamp: new Date(),
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsError: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      errors: []
    };
  }

  private updateMetrics(serverId: string, heartbeatMetrics: any): void {
    const metrics = this.metrics.get(serverId);
    if (metrics) {
      metrics.cpuUsage = heartbeatMetrics.cpu || 0;
      metrics.memoryUsage = heartbeatMetrics.memory || 0;
      metrics.activeConnections = heartbeatMetrics.activeConnections || 0;
      metrics.timestamp = new Date();
    }
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const heartbeatTimeout = 30000; // 30 seconds

      for (const [serverId, lastHeartbeat] of this.heartbeats.entries()) {
        const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          const server = this.servers.get(serverId);
          if (server && server.status !== ServerStatus.OFFLINE) {
            this.updateServerStatus(serverId, ServerStatus.ERROR);
            
            this.addServerError(serverId, {
              code: 'HEARTBEAT_TIMEOUT',
              message: `Server heartbeat timeout after ${timeSinceLastHeartbeat}ms`,
              timestamp: now,
              serverId
            });
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up old events (keep last 1000)
      if (this.events.length > 1000) {
        this.events = this.events.slice(-1000);
      }

      // Clean up old errors (keep last 50 per server)
      for (const [serverId, errors] of this.errors.entries()) {
        if (errors.length > 50) {
          this.errors.set(serverId, errors.slice(-50));
        }
      }
    }, 60000); // Clean up every minute
  }

  private addEvent(event: MCPServerEvent): void {
    this.events.push(event);
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop all servers
    for (const server of this.servers.values()) {
      try {
        await server.stop();
      } catch (error) {
        logServerError(server.id, `Failed to stop server during shutdown: ${error}`, error instanceof Error ? error.stack : undefined);
      }
    }

    this.servers.clear();
    this.heartbeats.clear();
    this.metrics.clear();
    this.errors.clear();
    this.events = [];
  }
}

// Export singleton instance
export const serverManager = new ServerManager();