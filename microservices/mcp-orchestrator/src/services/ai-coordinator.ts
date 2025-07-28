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

// Interfaces para el AI Coordinator
interface AIRequest {
  id: string;
  type: 'llm' | 'content' | 'analytics' | 'personalization' | 'ml';
  service: string;
  action: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
  sessionId?: string;
}

interface AIResponse {
  id: string;
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  timestamp: Date;
}

interface AIServiceConfig {
  name: string;
  url: string;
  health: boolean;
  load: number;
  lastCheck: Date;
}

class AICoordinator {
  private services: Map<string, AIServiceConfig> = new Map();
  private requestQueue: AIRequest[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices() {
    this.services.set('llm-gateway', {
      name: 'LLM Gateway',
      url: 'http://llm-gateway:3006',
      health: false,
      load: 0,
      lastCheck: new Date()
    });

    this.services.set('content-generation', {
      name: 'Content Generation',
      url: 'http://content-generation:3007',
      health: false,
      load: 0,
      lastCheck: new Date()
    });

    this.services.set('predictive-analytics', {
      name: 'Predictive Analytics',
      url: 'http://predictive-analytics:3008',
      health: false,
      load: 0,
      lastCheck: new Date()
    });

    this.services.set('personalization-engine', {
      name: 'Personalization Engine',
      url: 'http://personalization-engine:3012',
      health: false,
      load: 0,
      lastCheck: new Date()
    });

    this.services.set('ml-pipeline', {
      name: 'ML Pipeline',
      url: 'http://ml-pipeline:3013',
      health: false,
      load: 0,
      lastCheck: new Date()
    });
  }

  async submitRequest(request: AIRequest): Promise<string> {
    request.id = this.generateRequestId();
    this.requestQueue.push(request);
    
    logger.info(Submitted AI request: , type: , service: );
    
    // Procesar cola si no está procesando
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return request.id;
  }

  async getRequestStatus(requestId: string): Promise<AIResponse | null> {
    const responseData = await redisClient.get(i:response:);
    return responseData ? JSON.parse(responseData) : null;
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        const startTime = Date.now();
        const response = await this.processRequest(request);
        const processingTime = Date.now() - startTime;

        const aiResponse: AIResponse = {
          id: this.generateRequestId(),
          requestId: request.id,
          success: true,
          data: response,
          processingTime,
          timestamp: new Date()
        };

        // Guardar respuesta en Redis
        await redisClient.setEx(
          i:response:,
          3600, // 1 hora TTL
          JSON.stringify(aiResponse)
        );

        logger.info(Processed AI request: , time: ms);

      } catch (error) {
        logger.error(Failed to process AI request: , error);
        
        const aiResponse: AIResponse = {
          id: this.generateRequestId(),
          requestId: request.id,
          success: false,
          error: error.message,
          processingTime: 0,
          timestamp: new Date()
        };

        await redisClient.setEx(
          i:response:,
          3600,
          JSON.stringify(aiResponse)
        );
      }
    }

    this.isProcessing = false;
  }

  private async processRequest(request: AIRequest): Promise<any> {
    const service = this.services.get(request.service);
    if (!service || !service.health) {
      throw new Error(Service  is not available);
    }

    const response = await fetch(${service.url}/ai/, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer 
      },
      body: JSON.stringify(request.data)
    });

    if (!response.ok) {
      throw new Error(AI service error: );
    }

    return await response.json();
  }

  private async startHealthChecks() {
    setInterval(async () => {
      for (const [serviceName, service] of this.services) {
        try {
          const response = await fetch(${service.url}/health, {
            method: 'GET',
            timeout: 5000
          });

          service.health = response.ok;
          service.lastCheck = new Date();
          
          if (response.ok) {
            const healthData = await response.json();
            service.load = healthData.load || 0;
          }

        } catch (error) {
          service.health = false;
          service.lastCheck = new Date();
          logger.warn(Health check failed for :, error.message);
        }
      }
    }, 30000); // Cada 30 segundos
  }

  private generateRequestId(): string {
    return i__;
  }

  async getServiceStatus(): Promise<Record<string, AIServiceConfig>> {
    const status: Record<string, AIServiceConfig> = {};
    for (const [name, config] of this.services) {
      status[name] = { ...config };
    }
    return status;
  }

  async getQueueStatus(): Promise<Record<string, any>> {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      timestamp: new Date().toISOString()
    };
  }
}

export default new AICoordinator();
