import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  MCPRequest,
  MCPResponse,
  MCPContext,
  MCPServerInfo,
  MCPServerStatus,
  MCPRoutingError,
  MCPExecutionError,
  MCPContextError,
  MCPMetrics,
} from '../types/mcp.js';

export class MCPOrchestrator {
  private servers: Map<string, MCPServerInfo> = new Map();
  private contextStore: Map<string, MCPContext> = new Map();
  private metrics: MCPMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeServers: 0,
    totalServers: 0,
    lastUpdated: new Date().toISOString(),
  };

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Registrar un nuevo servidor MCP
   */
  async registerServer(serverInfo: Omit<MCPServerInfo, 'id' | 'status' | 'responseTimeMs' | 'errorCount' | 'successCount'>): Promise<void> {
    const serverId = uuidv4();
    const server: MCPServerInfo = {
      ...serverInfo,
      id: serverId,
      status: MCPServerStatus.OFFLINE,
      responseTimeMs: 0,
      errorCount: 0,
      successCount: 0,
    };

    this.servers.set(serverId, server);
    this.updateMetrics();
    
    console.log(`Registered MCP server: ${server.name} (${serverId})`);
  }

  /**
   * Ejecutar una capacidad MCP
   */
  async executeCapability(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;
      
      // Obtener o crear contexto
      const context = await this.getOrCreateContext(request.sessionId || uuidv4(), request.userId || 'anonymous');
      
      // Determinar servidores objetivo
      const targetServers = this.determineTargetServers(request.capability);
      
      if (targetServers.length === 0) {
        throw new MCPRoutingError(`No available servers for capability: ${request.capability}`);
      }
      
      // Seleccionar servidor usando load balancing
      const selectedServer = this.selectServer(targetServers);
      
      // Ejecutar request
      const response = await this.executeRequest(selectedServer, request, context);
      
      // Actualizar contexto
      await this.updateContext(context, request, response);
      
      // Actualizar métricas
      const executionTime = Date.now() - startTime;
      this.updateServerMetrics(selectedServer.id, executionTime, true);
      this.metrics.successfulRequests++;
      this.metrics.averageResponseTime = this.calculateAverageResponseTime();
      
      return {
        ...response,
        executionTimeMs: executionTime,
        serverId: selectedServer.id,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.metrics.failedRequests++;
      this.metrics.averageResponseTime = this.calculateAverageResponseTime();
      
      if (error instanceof MCPRoutingError || error instanceof MCPExecutionError) {
        throw error;
      }
      
      throw new MCPExecutionError(
        error instanceof Error ? error.message : 'Unknown execution error'
      );
    } finally {
      this.metrics.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Obtener métricas del orchestrator
   */
  getMetrics(): MCPMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtener información de servidores
   */
  getServers(): MCPServerInfo[] {
    return Array.from(this.servers.values());
  }

  /**
   * Determinar servidores objetivo basado en capacidad
   */
  private determineTargetServers(capability: string): MCPServerInfo[] {
    const candidates: MCPServerInfo[] = [];
    
    for (const server of this.servers.values()) {
      if (server.status === MCPServerStatus.HEALTHY || server.status === MCPServerStatus.DEGRADED) {
        if (server.capabilities.includes(capability)) {
          candidates.push(server);
        }
      }
    }
    
    // Ordenar por rendimiento (menor tiempo de respuesta, menor número de errores)
    candidates.sort((a, b) => {
      const aScore = a.responseTimeMs + (a.errorCount * 1000);
      const bScore = b.responseTimeMs + (b.errorCount * 1000);
      return aScore - bScore;
    });
    
    return candidates;
  }

  /**
   * Seleccionar servidor usando load balancing
   */
  private selectServer(servers: MCPServerInfo[]): MCPServerInfo {
    if (servers.length === 0) {
      throw new MCPRoutingError('No servers available');
    }
    
    if (servers.length === 1) {
      return servers[0];
    }
    
    // Algoritmo de round-robin simple
    // En una implementación más avanzada, se podría usar weighted round-robin
    const healthyServers = servers.filter(s => s.status === MCPServerStatus.HEALTHY);
    const availableServers = healthyServers.length > 0 ? healthyServers : servers;
    
    const index = Math.floor(Math.random() * availableServers.length);
    return availableServers[index];
  }

  /**
   * Ejecutar request en servidor seleccionado
   */
  private async executeRequest(server: MCPServerInfo, request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
    const enhancedRequest = {
      ...request,
      context: {
        sessionId: context.sessionId,
        userId: context.userId,
        institutionId: context.institutionId,
        conversationHistory: context.conversationHistory.slice(-10), // Últimas 10 interacciones
        sharedData: context.sharedData,
      },
    };

    try {
      const response = await axios.post(
        `${server.endpoint}/mcp/execute`,
        enhancedRequest,
        {
          timeout: 30000, // 30 segundos
          headers: {
            'Content-Type': 'application/json',
            'X-MCP-Server-ID': server.id,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new MCPExecutionError(
          `Server ${server.name} execution failed: ${error.message}`,
          server.id,
          request.capability
        );
      }
      throw error;
    }
  }

  /**
   * Obtener o crear contexto
   */
  private async getOrCreateContext(sessionId: string, userId: string): Promise<MCPContext> {
    const existingContext = this.contextStore.get(sessionId);
    
    if (existingContext) {
      // Verificar si el contexto ha expirado
      const now = new Date();
      const lastUpdated = new Date(existingContext.lastUpdated);
      const ttlMs = existingContext.ttlSeconds * 1000;
      
      if (now.getTime() - lastUpdated.getTime() > ttlMs) {
        this.contextStore.delete(sessionId);
      } else {
        return existingContext;
      }
    }
    
    // Crear nuevo contexto
    const newContext: MCPContext = {
      sessionId,
      userId,
      conversationHistory: [],
      sharedData: {},
      lastUpdated: new Date().toISOString(),
      ttlSeconds: 1800, // 30 minutos
    };
    
    this.contextStore.set(sessionId, newContext);
    return newContext;
  }

  /**
   * Actualizar contexto con nueva información
   */
  private async updateContext(context: MCPContext, request: MCPRequest, response: MCPResponse): Promise<void> {
    // Agregar entrada a la conversación
    context.conversationHistory.push({
      timestamp: new Date().toISOString(),
      request,
      response,
    });
    
    // Mantener solo las últimas 50 entradas
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
    
    // Actualizar datos compartidos si hay actualizaciones
    if (response.contextUpdates) {
      context.sharedData = { ...context.sharedData, ...response.contextUpdates };
    }
    
    context.lastUpdated = new Date().toISOString();
    this.contextStore.set(context.sessionId, context);
  }

  /**
   * Monitoreo de salud de servidores
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      for (const server of this.servers.values()) {
        await this.performHealthCheck(server);
      }
      this.updateMetrics();
    }, 30000); // Cada 30 segundos
  }

  /**
   * Realizar health check en un servidor
   */
  private async performHealthCheck(server: MCPServerInfo): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${server.endpoint}/health`, {
        timeout: 5000, // 5 segundos
      });
      
      const responseTime = Date.now() - startTime;
      
      // Actualizar estado del servidor
      server.responseTimeMs = responseTime;
      server.lastHealthCheck = new Date().toISOString();
      
      // Determinar estado basado en tiempo de respuesta
      if (responseTime < 1000) {
        server.status = MCPServerStatus.HEALTHY;
      } else if (responseTime < 3000) {
        server.status = MCPServerStatus.DEGRADED;
      } else {
        server.status = MCPServerStatus.UNHEALTHY;
      }
      
    } catch (error) {
      server.status = MCPServerStatus.OFFLINE;
      server.lastHealthCheck = new Date().toISOString();
      console.warn(`Health check failed for ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Actualizar métricas del servidor
   */
  private updateServerMetrics(serverId: string, responseTime: number, success: boolean): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.responseTimeMs = responseTime;
      if (success) {
        server.successCount++;
      } else {
        server.errorCount++;
      }
    }
  }

  /**
   * Calcular tiempo de respuesta promedio
   */
  private calculateAverageResponseTime(): number {
    const servers = Array.from(this.servers.values());
    if (servers.length === 0) return 0;
    
    const totalResponseTime = servers.reduce((sum, server) => sum + server.responseTimeMs, 0);
    return totalResponseTime / servers.length;
  }

  /**
   * Actualizar métricas generales
   */
  private updateMetrics(): void {
    const servers = Array.from(this.servers.values());
    this.metrics.totalServers = servers.length;
    this.metrics.activeServers = servers.filter(s => s.status === MCPServerStatus.HEALTHY).length;
    this.metrics.lastUpdated = new Date().toISOString();
  }
} 