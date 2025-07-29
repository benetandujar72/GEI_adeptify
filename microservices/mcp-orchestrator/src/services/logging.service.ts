import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { format } from 'winston';
import os from 'os';

export interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  service?: string;
  agent?: string;
  context?: string;
  workflow?: string;
  task?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export class LoggingService {
  private logger: winston.Logger;
  private static instance: LoggingService;

  private constructor() {
    this.logger = this.createLogger();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private createLogger(): winston.Logger {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';
    const serviceName = process.env.SERVICE_NAME || 'mcp-orchestrator';

    // Formato personalizado para logs
    const customFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
      format.printf(({ timestamp, level, message, metadata, stack }) => {
        let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
        
        if (metadata && Object.keys(metadata).length > 0) {
          log += ` | ${JSON.stringify(metadata)}`;
        }
        
        if (stack) {
          log += `\n${stack}`;
        }
        
        return log;
      })
    );

    // Configuración de transportes
    const transports: winston.transport[] = [
      // Consola para desarrollo
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          customFormat
        )
      })
    ];

    // Archivo de logs para producción
    if (nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );

      // Elasticsearch para producción
      if (process.env.ELASTICSEARCH_URL) {
        transports.push(
          new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
              node: process.env.ELASTICSEARCH_URL,
              auth: {
                username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
                password: process.env.ELASTICSEARCH_PASSWORD || ''
              }
            },
            indexPrefix: `logs-${serviceName}`,
            ensureMappingTemplate: true,
            mappingTemplate: {
              index_patterns: [`logs-${serviceName}-*`],
              settings: {
                number_of_shards: 1,
                number_of_replicas: 0
              },
              mappings: {
                properties: {
                  '@timestamp': { type: 'date' },
                  level: { type: 'keyword' },
                  message: { type: 'text' },
                  service: { type: 'keyword' },
                  hostname: { type: 'keyword' },
                  userId: { type: 'keyword' },
                  requestId: { type: 'keyword' },
                  sessionId: { type: 'keyword' },
                  ip: { type: 'ip' },
                  endpoint: { type: 'keyword' },
                  method: { type: 'keyword' },
                  statusCode: { type: 'integer' },
                  responseTime: { type: 'float' },
                  userAgent: { type: 'text' },
                  agent: { type: 'keyword' },
                  context: { type: 'keyword' },
                  workflow: { type: 'keyword' },
                  task: { type: 'keyword' },
                  metadata: { type: 'object', dynamic: true }
                }
              }
            }
          })
        );
      }
    }

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      defaultMeta: {
        service: serviceName,
        hostname: os.hostname(),
        environment: nodeEnv
      },
      transports
    });
  }

  // Métodos de logging con contexto
  public info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  public verbose(message: string, context?: LogContext): void {
    this.logger.verbose(message, context);
  }

  // Logging específico para orquestación
  public logOrchestration(action: string, context: LogContext): void {
    this.info(`ORCHESTRATION: ${action}`, {
      ...context,
      category: 'orchestration'
    });
  }

  // Logging específico para routing MCP
  public logMCPRouting(service: string, action: string, context: LogContext): void {
    this.info(`MCP_ROUTING: ${service}.${action}`, {
      ...context,
      category: 'mcp_routing',
      service,
      action
    });
  }

  // Logging específico para gestión de contexto
  public logContextManagement(action: string, contextId: string, context: LogContext): void {
    this.info(`CONTEXT_MGMT: ${action}`, {
      ...context,
      category: 'context_management',
      contextId
    });
  }

  // Logging específico para coordinación de agentes AI
  public logAgentCoordination(action: string, agentId: string, context: LogContext): void {
    this.info(`AGENT_COORD: ${action}`, {
      ...context,
      category: 'agent_coordination',
      agentId
    });
  }

  // Logging específico para workflows
  public logWorkflow(action: string, workflowId: string, context: LogContext): void {
    this.info(`WORKFLOW: ${action}`, {
      ...context,
      category: 'workflow',
      workflowId
    });
  }

  // Logging específico para tareas
  public logTask(action: string, taskId: string, context: LogContext): void {
    this.info(`TASK: ${action}`, {
      ...context,
      category: 'task',
      taskId
    });
  }

  // Logging específico para errores de orquestación
  public logOrchestrationError(error: string, context: LogContext): void {
    this.error(`ORCHESTRATION_ERROR: ${error}`, {
      ...context,
      category: 'orchestration_error'
    });
  }

  // Logging específico para métricas de rendimiento
  public logPerformance(operation: string, duration: number, context: LogContext): void {
    this.info(`PERF: ${operation} took ${duration}ms`, {
      ...context,
      category: 'performance',
      duration
    });
  }

  // Logging específico para auditoría
  public logAudit(action: string, resource: string, context: LogContext): void {
    this.info(`AUDIT: ${action} on ${resource}`, {
      ...context,
      category: 'audit',
      resource
    });
  }

  // Método para obtener el logger interno (para casos especiales)
  public getLogger(): winston.Logger {
    return this.logger;
  }
}

// Exportar instancia singleton
export const logger = LoggingService.getInstance();