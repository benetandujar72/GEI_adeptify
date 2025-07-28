import axios, { AxiosInstance } from 'axios';

export interface MCPRequest {
  capability: string;
  parameters: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  contextUpdates?: Record<string, any>;
  executionTimeMs: number;
  serverId: string;
  timestamp: string;
}

export class MCPClient {
  private client: AxiosInstance;
  private sessionId: string | null = null;
  private userId: string | null = null;

  constructor(baseURL: string = 'http://localhost:8201') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('MCP Client Error:', error);
        throw error;
      }
    );
  }

  /**
   * Configurar sesión y usuario
   */
  setSession(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Limpiar sesión
   */
  clearSession() {
    this.sessionId = null;
    this.userId = null;
  }

  /**
   * Ejecutar una capacidad MCP
   */
  async execute(capability: string, parameters: Record<string, any> = {}): Promise<MCPResponse> {
    try {
      const request: MCPRequest = {
        capability,
        parameters,
        sessionId: this.sessionId || undefined,
        userId: this.userId || undefined,
      };

      const response = await this.client.post('/mcp/execute', request);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Obtener información de servidores
   */
  async getServers() {
    try {
      const response = await this.client.get('/mcp/servers');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get servers:', error);
      return [];
    }
  }

  /**
   * Obtener métricas del orchestrator
   */
  async getMetrics() {
    try {
      const response = await this.client.get('/mcp/metrics');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return null;
    }
  }

  /**
   * Obtener capacidades disponibles
   */
  async getCapabilities() {
    try {
      const response = await this.client.get('/mcp/capabilities');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      return [];
    }
  }

  /**
   * Health check del orchestrator
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/mcp/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy' };
    }
  }
}

// Instancia global del cliente MCP
export const mcpClient = new MCPClient(import.meta.env.VITE_MCP_URL || 'http://localhost:8201'); 