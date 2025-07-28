import winston from 'winston';

// Configuración de colores para diferentes niveles de log
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  orchestrator: 'cyan',
  router: 'blue',
  context: 'green',
  agent: 'yellow',
  workflow: 'magenta'
};

winston.addColors(colors);

// Formato para consola
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message, service, component, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}] [${service || 'mcp-orchestrator'}]${component ? ` [${component}]` : ''}: ${message} ${metaStr}`;
    }
  )
);

// Formato para archivos
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Crear logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileLogFormat,
  defaultMeta: { service: 'mcp-orchestrator' },
  transports: [
    // Archivo de logs general
    new winston.transports.File({
      filename: 'logs/mcp-orchestrator.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: 'logs/mcp-orchestrator-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Archivo de logs de orquestación
    new winston.transports.File({
      filename: 'logs/mcp-orchestrator-orchestration.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            component,
            message,
            ...meta
          });
        })
      )
    })
  ]
});

// Agregar transporte de consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: logFormat
    })
  );
}

// Función para logging de requests HTTP
export const logHttpRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      component: 'http'
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Función para logging de errores del orquestador
export const logOrchestratorError = (error: any, context: any = {}) => {
  logger.error('Orchestrator Error', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    component: 'orchestrator'
  });
};

// Función para logging de eventos del orquestador
export const logOrchestratorEvent = (event: string, details: any = {}) => {
  logger.info(`Orchestrator Event: ${event}`, {
    event,
    details,
    component: 'orchestrator'
  });
};

// Función para logging de performance
export const logPerformance = (operation: string, duration: number, metadata: any = {}) => {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration,
    metadata,
    component: 'performance'
  });
};

// ===== ROUTER LOGGING =====

// Función para logging de requests MCP
export const logMCPRequest = (requestId: string, service: string, action: string, userId: string, priority: string) => {
  logger.info('MCP Request Received', {
    requestId,
    service,
    action,
    userId,
    priority,
    component: 'router'
  });
};

// Función para logging de responses MCP
export const logMCPResponse = (requestId: string, service: string, success: boolean, processingTime: number, error?: string) => {
  const logData = {
    requestId,
    service,
    success,
    processingTime,
    component: 'router'
  };

  if (error) {
    logData.error = error;
    logger.warn('MCP Response Error', logData);
  } else {
    logger.info('MCP Response Success', logData);
  }
};

// Función para logging de service discovery
export const logServiceDiscovery = (serviceId: string, action: string, details: any = {}) => {
  logger.info(`Service Discovery: ${action}`, {
    serviceId,
    action,
    details,
    component: 'router'
  });
};

// Función para logging de load balancing
export const logLoadBalancing = (serviceId: string, strategy: string, selectedEndpoint: string, details: any = {}) => {
  logger.debug('Load Balancing Decision', {
    serviceId,
    strategy,
    selectedEndpoint,
    details,
    component: 'router'
  });
};

// Función para logging de circuit breaker
export const logCircuitBreaker = (serviceId: string, state: string, failureCount: number, details: any = {}) => {
  const logData = {
    serviceId,
    state,
    failureCount,
    details,
    component: 'router'
  };

  if (state === 'open') {
    logger.warn('Circuit Breaker Opened', logData);
  } else if (state === 'half_open') {
    logger.info('Circuit Breaker Half-Open', logData);
  } else {
    logger.info('Circuit Breaker Closed', logData);
  }
};

// Función para logging de health checks
export const logHealthCheck = (serviceId: string, status: string, responseTime: number, details: any = {}) => {
  const logData = {
    serviceId,
    status,
    responseTime,
    details,
    component: 'router'
  };

  if (status === 'unhealthy') {
    logger.warn('Health Check Failed', logData);
  } else {
    logger.debug('Health Check Success', logData);
  }
};

// ===== CONTEXT MANAGER LOGGING =====

// Función para logging de context creation
export const logContextCreation = (contextId: string, userId: string, sessionId: string, dataSize: number) => {
  logger.info('Context Created', {
    contextId,
    userId,
    sessionId,
    dataSize,
    component: 'context'
  });
};

// Función para logging de context access
export const logContextAccess = (contextId: string, userId: string, action: string, accessCount: number) => {
  logger.debug('Context Accessed', {
    contextId,
    userId,
    action,
    accessCount,
    component: 'context'
  });
};

// Función para logging de context update
export const logContextUpdate = (contextId: string, userId: string, updates: any, dataSize: number) => {
  logger.info('Context Updated', {
    contextId,
    userId,
    updates: Object.keys(updates),
    dataSize,
    component: 'context'
  });
};

// Función para logging de context deletion
export const logContextDeletion = (contextId: string, userId: string, reason: string) => {
  logger.info('Context Deleted', {
    contextId,
    userId,
    reason,
    component: 'context'
  });
};

// Función para logging de context search
export const logContextSearch = (criteria: any, resultCount: number, duration: number) => {
  logger.debug('Context Search', {
    criteria,
    resultCount,
    duration,
    component: 'context'
  });
};

// Función para logging de policy application
export const logPolicyApplication = (policyName: string, contextId: string, action: string, result: any) => {
  logger.info('Policy Applied', {
    policyName,
    contextId,
    action,
    result,
    component: 'context'
  });
};

// Función para logging de context cleanup
export const logContextCleanup = (cleanedCount: number, remainingCount: number, strategy: string) => {
  logger.info('Context Cleanup Completed', {
    cleanedCount,
    remainingCount,
    strategy,
    component: 'context'
  });
};

// ===== AI AGENT COORDINATOR LOGGING =====

// Función para logging de agent registration
export const logAgentRegistration = (agentId: string, agentName: string, agentType: string, capabilities: number) => {
  logger.info('Agent Registered', {
    agentId,
    agentName,
    agentType,
    capabilities,
    component: 'agent'
  });
};

// Función para logging de agent status change
export const logAgentStatusChange = (agentId: string, agentName: string, previousStatus: string, newStatus: string) => {
  logger.info('Agent Status Changed', {
    agentId,
    agentName,
    previousStatus,
    newStatus,
    component: 'agent'
  });
};

// Función para logging de task creation
export const logTaskCreation = (taskId: string, agentId: string, taskType: string, priority: string, dataSize: number) => {
  logger.info('Task Created', {
    taskId,
    agentId,
    taskType,
    priority,
    dataSize,
    component: 'agent'
  });
};

// Función para logging de task status change
export const logTaskStatusChange = (taskId: string, agentId: string, previousStatus: string, newStatus: string, duration?: number) => {
  const logData = {
    taskId,
    agentId,
    previousStatus,
    newStatus,
    component: 'agent'
  };

  if (duration) {
    logData.duration = duration;
  }

  if (newStatus === 'failed') {
    logger.warn('Task Failed', logData);
  } else if (newStatus === 'completed') {
    logger.info('Task Completed', logData);
  } else {
    logger.debug('Task Status Changed', logData);
  }
};

// Función para logging de workflow creation
export const logWorkflowCreation = (workflowId: string, workflowName: string, steps: number, triggers: number) => {
  logger.info('Workflow Created', {
    workflowId,
    workflowName,
    steps,
    triggers,
    component: 'workflow'
  });
};

// Función para logging de workflow execution
export const logWorkflowExecution = (workflowId: string, workflowName: string, status: string, steps: number, duration?: number) => {
  const logData = {
    workflowId,
    workflowName,
    status,
    steps,
    component: 'workflow'
  };

  if (duration) {
    logData.duration = duration;
  }

  if (status === 'failed') {
    logger.warn('Workflow Failed', logData);
  } else if (status === 'completed') {
    logger.info('Workflow Completed', logData);
  } else {
    logger.debug('Workflow Execution', logData);
  }
};

// Función para logging de workflow step execution
export const logWorkflowStep = (workflowId: string, stepId: string, stepName: string, status: string, duration?: number, error?: string) => {
  const logData = {
    workflowId,
    stepId,
    stepName,
    status,
    component: 'workflow'
  };

  if (duration) {
    logData.duration = duration;
  }

  if (error) {
    logData.error = error;
  }

  if (status === 'failed') {
    logger.warn('Workflow Step Failed', logData);
  } else if (status === 'completed') {
    logger.debug('Workflow Step Completed', logData);
  } else {
    logger.debug('Workflow Step', logData);
  }
};

// Función para logging de agent health check
export const logAgentHealthCheck = (agentId: string, agentName: string, status: string, responseTime: number, errors: any[]) => {
  const logData = {
    agentId,
    agentName,
    status,
    responseTime,
    component: 'agent'
  };

  if (errors.length > 0) {
    logData.errors = errors;
  }

  if (status === 'unhealthy') {
    logger.warn('Agent Health Check Failed', logData);
  } else {
    logger.debug('Agent Health Check Success', logData);
  }
};

// Función para logging de policy application to agents
export const logAgentPolicyApplication = (policyName: string, agentId: string, action: string, result: any) => {
  logger.info('Agent Policy Applied', {
    policyName,
    agentId,
    action,
    result,
    component: 'agent'
  });
};

// ===== METRICS LOGGING =====

// Función para logging de métricas del router
export const logRouterMetrics = (metrics: any) => {
  logger.info('Router Metrics', {
    metrics,
    component: 'metrics'
  });
};

// Función para logging de métricas del context manager
export const logContextMetrics = (metrics: any) => {
  logger.info('Context Manager Metrics', {
    metrics,
    component: 'metrics'
  });
};

// Función para logging de métricas del agent coordinator
export const logAgentMetrics = (metrics: any) => {
  logger.info('Agent Coordinator Metrics', {
    metrics,
    component: 'metrics'
  });
};

// Función para logging de métricas generales del orquestador
export const logOrchestratorMetrics = (metrics: any) => {
  logger.info('Orchestrator Metrics', {
    metrics,
    component: 'metrics'
  });
};

// ===== ERROR LOGGING =====

// Función para logging de errores del router
export const logRouterError = (error: any, context: any = {}) => {
  logger.error('Router Error', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    component: 'router'
  });
};

// Función para logging de errores del context manager
export const logContextError = (error: any, context: any = {}) => {
  logger.error('Context Manager Error', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    component: 'context'
  });
};

// Función para logging de errores del agent coordinator
export const logAgentError = (error: any, context: any = {}) => {
  logger.error('Agent Coordinator Error', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    component: 'agent'
  });
};

// Función para logging de errores de workflow
export const logWorkflowError = (error: any, context: any = {}) => {
  logger.error('Workflow Error', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    component: 'workflow'
  });
};

// ===== DEBUG LOGGING =====

// Función para logging de debug del orquestador
export const logOrchestratorDebug = (message: string, data: any = {}) => {
  logger.debug(`Orchestrator Debug: ${message}`, {
    message,
    data,
    component: 'orchestrator'
  });
};

// Función para logging de debug del router
export const logRouterDebug = (message: string, data: any = {}) => {
  logger.debug(`Router Debug: ${message}`, {
    message,
    data,
    component: 'router'
  });
};

// Función para logging de debug del context manager
export const logContextDebug = (message: string, data: any = {}) => {
  logger.debug(`Context Debug: ${message}`, {
    message,
    data,
    component: 'context'
  });
};

// Función para logging de debug del agent coordinator
export const logAgentDebug = (message: string, data: any = {}) => {
  logger.debug(`Agent Debug: ${message}`, {
    message,
    data,
    component: 'agent'
  });
};

// Exportar logger principal
export { logger }; 