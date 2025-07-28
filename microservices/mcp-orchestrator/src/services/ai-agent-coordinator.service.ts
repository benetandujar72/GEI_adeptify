import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import {
  AIAgentCoordinator,
  AIAgent,
  AgentTask,
  AgentWorkflow,
  AgentPolicy,
  AgentType,
  AgentStatus,
  TaskType,
  TaskPriority,
  TaskStatus,
  WorkflowStatus,
  ExecutionStatus,
  StepStatus,
  AgentCapability,
  AgentHealth,
  AgentConfig,
  WorkflowStep,
  WorkflowExecution,
  ExecutionStep,
  PolicyRule,
  PolicyAction,
  PolicyActionType,
  AgentMetrics
} from '../types/orchestrator.types.js';

export class AIAgentCoordinatorService {
  private agents: Map<string, AIAgent>;
  private tasks: Map<string, AgentTask>;
  private workflows: Map<string, AgentWorkflow>;
  private policies: AgentPolicy[];
  private metrics: AgentMetrics;
  private taskQueue: AgentTask[];
  private workflowExecutor: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.workflows = new Map();
    this.policies = [];
    this.taskQueue = [];

    this.metrics = {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0
    };

    this.initializeDefaultAgents();
    this.initializeDefaultPolicies();
    this.startTaskProcessor();
    this.startHealthChecks();
  }

  /**
   * Registra un nuevo agente AI
   */
  registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
    this.updateMetrics();
    
    logger.info(`Agente AI registrado: ${agent.name}`, {
      agentId: agent.id,
      type: agent.type,
      capabilities: agent.capabilities.length,
      status: agent.status
    });
  }

  /**
   * Obtiene un agente por ID
   */
  getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Obtiene agentes por tipo
   */
  getAgentsByType(type: AgentType): AIAgent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.type === type);
  }

  /**
   * Obtiene agentes disponibles (online y no ocupados)
   */
  getAvailableAgents(): AIAgent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === AgentStatus.ONLINE);
  }

  /**
   * Actualiza el estado de un agente
   */
  updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    
    if (agent) {
      agent.status = status;
      this.updateMetrics();
      
      logger.info(`Estado del agente actualizado: ${agent.name}`, {
        agentId,
        status,
        previousStatus: agent.status
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Crea una nueva tarea
   */
  createTask(agentId: string, type: TaskType, data: any, priority: TaskPriority = TaskPriority.NORMAL): AgentTask {
    const taskId = uuidv4();
    const now = new Date();

    const task: AgentTask = {
      id: taskId,
      agentId,
      type,
      priority,
      status: TaskStatus.PENDING,
      data,
      created: now,
      timeout: 300000, // 5 minutos por defecto
      retries: 0,
      maxRetries: 3
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(task);
    
    // Ordenar cola por prioridad
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { [TaskPriority.URGENT]: 4, [TaskPriority.HIGH]: 3, [TaskPriority.NORMAL]: 2, [TaskPriority.LOW]: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    this.updateMetrics();

    logger.info(`Tarea creada: ${taskId}`, {
      agentId,
      type,
      priority,
      dataSize: JSON.stringify(data).length
    });

    return task;
  }

  /**
   * Obtiene una tarea por ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Obtiene tareas por agente
   */
  getTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.agentId === agentId);
  }

  /**
   * Obtiene tareas por estado
   */
  getTasksByStatus(status: TaskStatus): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }

  /**
   * Actualiza el estado de una tarea
   */
  updateTaskStatus(taskId: string, status: TaskStatus, result?: any, error?: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return false;
    }

    const previousStatus = task.status;
    task.status = status;

    if (status === TaskStatus.RUNNING && !task.started) {
      task.started = new Date();
    }

    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      task.completed = new Date();
      if (task.started) {
        const duration = task.completed.getTime() - task.started.getTime();
        this.updateAverageTaskTime(duration);
      }
    }

    if (result) {
      task.result = result;
    }

    if (error) {
      task.error = error;
    }

    this.updateMetrics();

    logger.info(`Estado de tarea actualizado: ${taskId}`, {
      agentId: task.agentId,
      previousStatus,
      newStatus: status,
      duration: task.started && task.completed ? 
        task.completed.getTime() - task.started.getTime() : undefined
    });

    return true;
  }

  /**
   * Cancela una tarea
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    
    if (task && task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.CANCELLED;
      task.completed = new Date();
      
      // Remover de la cola
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
      
      this.updateMetrics();

      logger.info(`Tarea cancelada: ${taskId}`, {
        agentId: task.agentId,
        type: task.type
      });

      return true;
    }
    
    return false;
  }

  /**
   * Crea un nuevo workflow
   */
  createWorkflow(workflow: Omit<AgentWorkflow, 'id' | 'execution'>): AgentWorkflow {
    const workflowId = uuidv4();

    const newWorkflow: AgentWorkflow = {
      ...workflow,
      id: workflowId,
      execution: {
        id: uuidv4(),
        workflowId,
        status: ExecutionStatus.RUNNING,
        currentStep: workflow.steps[0]?.id || '',
        steps: [],
        data: {},
        started: new Date()
      }
    };

    this.workflows.set(workflowId, newWorkflow);
    this.updateMetrics();

    logger.info(`Workflow creado: ${workflow.name}`, {
      workflowId,
      steps: workflow.steps.length,
      triggers: workflow.triggers.length
    });

    return newWorkflow;
  }

  /**
   * Obtiene un workflow por ID
   */
  getWorkflow(workflowId: string): AgentWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Obtiene workflows por estado
   */
  getWorkflowsByStatus(status: WorkflowStatus): AgentWorkflow[] {
    return Array.from(this.workflows.values())
      .filter(workflow => workflow.status === status);
  }

  /**
   * Ejecuta un workflow
   */
  async executeWorkflow(workflowId: string, inputData: Record<string, any> = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow no encontrado: ${workflowId}`);
    }

    const execution = workflow.execution;
    execution.data = { ...execution.data, ...inputData };
    execution.status = ExecutionStatus.RUNNING;
    execution.started = new Date();

    logger.info(`Ejecutando workflow: ${workflow.name}`, {
      workflowId,
      steps: workflow.steps.length,
      inputDataSize: JSON.stringify(inputData).length
    });

    try {
      for (const step of workflow.steps) {
        execution.currentStep = step.id;
        
        const stepExecution: ExecutionStep = {
          stepId: step.id,
          status: StepStatus.RUNNING,
          started: new Date()
        };

        execution.steps.push(stepExecution);

        try {
          // Verificar dependencias
          if (step.dependencies.length > 0) {
            const dependenciesCompleted = step.dependencies.every(depId => {
              const depStep = execution.steps.find(s => s.stepId === depId);
              return depStep && depStep.status === StepStatus.COMPLETED;
            });

            if (!dependenciesCompleted) {
              stepExecution.status = StepStatus.SKIPPED;
              stepExecution.completed = new Date();
              continue;
            }
          }

          // Ejecutar paso
          const result = await this.executeWorkflowStep(step, execution.data);
          
          stepExecution.status = StepStatus.COMPLETED;
          stepExecution.completed = new Date();
          stepExecution.result = result;
          stepExecution.duration = stepExecution.completed.getTime() - stepExecution.started.getTime();

          // Actualizar datos del workflow
          if (result) {
            execution.data[step.id] = result;
          }

        } catch (error) {
          stepExecution.status = StepStatus.FAILED;
          stepExecution.completed = new Date();
          stepExecution.error = error instanceof Error ? error.message : 'Error desconocido';
          stepExecution.duration = stepExecution.completed.getTime() - stepExecution.started.getTime();

          // Verificar si se debe reintentar
          if (step.retries > 0) {
            // Implementar lógica de reintento
            logger.warn(`Paso falló, reintentando: ${step.id}`, {
              error: stepExecution.error,
              retries: step.retries
            });
          } else {
            execution.status = ExecutionStatus.FAILED;
            execution.error = stepExecution.error;
            break;
          }
        }
      }

      if (execution.status === ExecutionStatus.RUNNING) {
        execution.status = ExecutionStatus.COMPLETED;
        execution.completed = new Date();
      }

      this.updateMetrics();

      logger.info(`Workflow completado: ${workflow.name}`, {
        workflowId,
        status: execution.status,
        duration: execution.completed ? 
          execution.completed.getTime() - execution.started.getTime() : undefined
      });

      return execution;

    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.error = error instanceof Error ? error.message : 'Error desconocido';
      execution.completed = new Date();

      logger.error(`Error ejecutando workflow: ${workflow.name}`, {
        workflowId,
        error: execution.error
      });

      return execution;
    }
  }

  /**
   * Ejecuta un paso del workflow
   */
  private async executeWorkflowStep(step: WorkflowStep, workflowData: Record<string, any>): Promise<any> {
    switch (step.type) {
      case 'agent_task':
        return await this.executeAgentTask(step, workflowData);
      
      case 'condition':
        return this.evaluateCondition(step, workflowData);
      
      case 'delay':
        return await this.executeDelay(step);
      
      case 'transform':
        return this.executeTransform(step, workflowData);
      
      case 'validate':
        return this.executeValidation(step, workflowData);
      
      default:
        throw new Error(`Tipo de paso no soportado: ${step.type}`);
    }
  }

  /**
   * Ejecuta una tarea de agente
   */
  private async executeAgentTask(step: WorkflowStep, workflowData: Record<string, any>): Promise<any> {
    const agent = this.agents.get(step.agentId);
    
    if (!agent) {
      throw new Error(`Agente no encontrado: ${step.agentId}`);
    }

    if (agent.status !== AgentStatus.ONLINE) {
      throw new Error(`Agente no disponible: ${agent.name}`);
    }

    // Crear tarea para el agente
    const task = this.createTask(
      step.agentId,
      step.parameters.taskType || TaskType.ANALYSIS,
      { ...step.parameters, workflowData },
      step.parameters.priority || TaskPriority.NORMAL
    );

    // Simular ejecución (en implementación real, esto sería asíncrono)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular resultado
    const result = {
      agentId: step.agentId,
      taskId: task.id,
      result: `Resultado de ${step.name}`,
      timestamp: new Date()
    };

    this.updateTaskStatus(task.id, TaskStatus.COMPLETED, result);

    return result;
  }

  /**
   * Evalúa una condición
   */
  private evaluateCondition(step: WorkflowStep, workflowData: Record<string, any>): boolean {
    const conditions = step.parameters.conditions || [];
    
    return conditions.every(condition => {
      const value = this.getNestedValue(workflowData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'greater_than':
          return typeof value === 'number' && value > condition.value;
        case 'less_than':
          return typeof value === 'number' && value < condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * Ejecuta un delay
   */
  private async executeDelay(step: WorkflowStep): Promise<void> {
    const delayMs = step.parameters.delayMs || 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Ejecuta una transformación
   */
  private executeTransform(step: WorkflowStep, workflowData: Record<string, any>): any {
    const input = this.getNestedValue(workflowData, step.parameters.inputField);
    const transformType = step.parameters.transformType;

    switch (transformType) {
      case 'uppercase':
        return typeof input === 'string' ? input.toUpperCase() : input;
      case 'lowercase':
        return typeof input === 'string' ? input.toLowerCase() : input;
      case 'number':
        return typeof input === 'string' ? parseFloat(input) : input;
      case 'boolean':
        return Boolean(input);
      default:
        return input;
    }
  }

  /**
   * Ejecuta una validación
   */
  private executeValidation(step: WorkflowStep, workflowData: Record<string, any>): boolean {
    const value = this.getNestedValue(workflowData, step.parameters.field);
    const validationType = step.parameters.validationType;

    switch (validationType) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'minLength':
        return typeof value === 'string' && value.length >= step.parameters.minLength;
      case 'maxLength':
        return typeof value === 'string' && value.length <= step.parameters.maxLength;
      default:
        return true;
    }
  }

  /**
   * Obtiene un valor anidado de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Agrega una política de agente
   */
  addPolicy(policy: AgentPolicy): void {
    this.policies.push(policy);
    
    // Ordenar políticas por prioridad
    this.policies.sort((a, b) => b.priority - a.priority);

    logger.info(`Política de agente agregada: ${policy.name}`, {
      priority: policy.priority,
      rules: policy.rules.length,
      actions: policy.actions.length
    });
  }

  /**
   * Aplica políticas a un agente
   */
  private applyPolicies(agent: AIAgent, action: string): void {
    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      // Verificar si la política se aplica al agente
      if (this.evaluatePolicyRules(policy.rules, agent)) {
        // Ejecutar acciones de la política
        for (const policyAction of policy.actions) {
          this.executePolicyAction(policyAction, agent, action);
        }
      }
    }
  }

  /**
   * Evalúa las reglas de una política
   */
  private evaluatePolicyRules(rules: PolicyRule[], agent: AIAgent): boolean {
    return rules.every(rule => {
      const value = this.getNestedValue(agent, rule.condition);
      
      switch (rule.operator) {
        case 'equals':
          return value === rule.value;
        case 'not_equals':
          return value !== rule.value;
        case 'greater_than':
          return typeof value === 'number' && value > rule.value;
        case 'less_than':
          return typeof value === 'number' && value < rule.value;
        default:
          return false;
      }
    });
  }

  /**
   * Ejecuta una acción de política
   */
  private executePolicyAction(action: PolicyAction, agent: AIAgent, triggerAction: string): void {
    try {
      switch (action.type) {
        case PolicyActionType.ALLOW:
          // Permitir acción
          break;
        
        case PolicyActionType.DENY:
          // Denegar acción
          break;
        
        case PolicyActionType.RATE_LIMIT:
          // Aplicar rate limiting
          break;
        
        case PolicyActionType.THROTTLE:
          // Aplicar throttling
          break;
        
        case PolicyActionType.LOG:
          logger.info(`Política aplicada: ${action.target}`, {
            agentId: agent.id,
            action: triggerAction,
            parameters: action.parameters
          });
          break;
        
        case PolicyActionType.ALERT:
          // Enviar alerta
          logger.warn(`Alerta de política: ${action.target}`, {
            agentId: agent.id,
            action: triggerAction,
            parameters: action.parameters
          });
          break;
        
        default:
          logger.warn(`Acción de política no soportada: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Error ejecutando acción de política: ${action.type}`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        agentId: agent.id
      });
    }
  }

  /**
   * Inicializa agentes por defecto
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: AIAgent[] = [
      {
        id: 'chatbot-agent',
        name: 'Chatbot Agent',
        type: AgentType.CHATBOT,
        capabilities: [
          {
            name: 'conversation',
            version: '1.0.0',
            parameters: { maxTokens: 1000 },
            constraints: [],
            performance: {
              averageResponseTime: 2000,
              successRate: 0.95,
              throughput: 10,
              errorRate: 0.05,
              lastUpdated: new Date()
            }
          }
        ],
        status: AgentStatus.ONLINE,
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 1000,
          uptime: 3600000,
          errors: [],
          metrics: {
            requestsPerSecond: 5,
            errorRate: 0.02,
            averageResponseTime: 2000,
            activeConnections: 10,
            memoryUsage: 512,
            cpuUsage: 25
          }
        },
        configuration: {
          discovery: { enabled: true, interval: 30000, timeout: 5000, retries: 3 },
          health: { enabled: true, interval: 30000, timeout: 5000, threshold: 3 },
          scaling: { enabled: false, minInstances: 1, maxInstances: 5, scaleUpThreshold: 80, scaleDownThreshold: 20 },
          policies: { rules: [], actions: [], priority: 1 }
        },
        metadata: { endpoint: 'http://localhost:3007' }
      },
      {
        id: 'analytics-agent',
        name: 'Analytics Agent',
        type: AgentType.ANALYTICS,
        capabilities: [
          {
            name: 'prediction',
            version: '1.0.0',
            parameters: { modelType: 'regression' },
            constraints: [],
            performance: {
              averageResponseTime: 5000,
              successRate: 0.90,
              throughput: 5,
              errorRate: 0.10,
              lastUpdated: new Date()
            }
          }
        ],
        status: AgentStatus.ONLINE,
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 3000,
          uptime: 3600000,
          errors: [],
          metrics: {
            requestsPerSecond: 2,
            errorRate: 0.05,
            averageResponseTime: 5000,
            activeConnections: 5,
            memoryUsage: 1024,
            cpuUsage: 40
          }
        },
        configuration: {
          discovery: { enabled: true, interval: 30000, timeout: 5000, retries: 3 },
          health: { enabled: true, interval: 30000, timeout: 5000, threshold: 3 },
          scaling: { enabled: false, minInstances: 1, maxInstances: 3, scaleUpThreshold: 80, scaleDownThreshold: 20 },
          policies: { rules: [], actions: [], priority: 1 }
        },
        metadata: { endpoint: 'http://localhost:3006' }
      },
      {
        id: 'content-generation-agent',
        name: 'Content Generation Agent',
        type: AgentType.CONTENT_GENERATION,
        capabilities: [
          {
            name: 'text_generation',
            version: '1.0.0',
            parameters: { maxLength: 2000 },
            constraints: [],
            performance: {
              averageResponseTime: 8000,
              successRate: 0.88,
              throughput: 3,
              errorRate: 0.12,
              lastUpdated: new Date()
            }
          }
        ],
        status: AgentStatus.ONLINE,
        health: {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 5000,
          uptime: 3600000,
          errors: [],
          metrics: {
            requestsPerSecond: 1,
            errorRate: 0.08,
            averageResponseTime: 8000,
            activeConnections: 3,
            memoryUsage: 2048,
            cpuUsage: 60
          }
        },
        configuration: {
          discovery: { enabled: true, interval: 30000, timeout: 5000, retries: 3 },
          health: { enabled: true, interval: 30000, timeout: 5000, threshold: 3 },
          scaling: { enabled: false, minInstances: 1, maxInstances: 2, scaleUpThreshold: 80, scaleDownThreshold: 20 },
          policies: { rules: [], actions: [], priority: 1 }
        },
        metadata: { endpoint: 'http://localhost:3005' }
      }
    ];

    defaultAgents.forEach(agent => this.registerAgent(agent));
  }

  /**
   * Inicializa políticas por defecto
   */
  private initializeDefaultPolicies(): void {
    // Política de rate limiting
    this.addPolicy({
      name: 'rate_limiting',
      description: 'Limita el número de tareas por agente',
      rules: [
        {
          condition: 'health.metrics.requestsPerSecond',
          operator: 'greater_than',
          value: 10
        }
      ],
      actions: [
        {
          type: PolicyActionType.RATE_LIMIT,
          target: 'task_creation',
          parameters: { maxRequestsPerSecond: 10 }
        }
      ],
      priority: 1,
      enabled: true
    });

    // Política de health check
    this.addPolicy({
      name: 'health_monitoring',
      description: 'Monitorea la salud de los agentes',
      rules: [
        {
          condition: 'health.status',
          operator: 'not_equals',
          value: 'healthy'
        }
      ],
      actions: [
        {
          type: PolicyActionType.ALERT,
          target: 'admin',
          parameters: { severity: 'warning' }
        }
      ],
      priority: 2,
      enabled: true
    });
  }

  /**
   * Inicia el procesador de tareas
   */
  private startTaskProcessor(): void {
    this.workflowExecutor = setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Procesar cada segundo
  }

  /**
   * Procesa la cola de tareas
   */
  private processTaskQueue(): void {
    if (this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    const agent = this.agents.get(task.agentId);
    if (!agent || agent.status !== AgentStatus.ONLINE) {
      // Reencolar tarea si el agente no está disponible
      this.taskQueue.push(task);
      return;
    }

    // Marcar tarea como en ejecución
    this.updateTaskStatus(task.id, TaskStatus.RUNNING);

    // Simular ejecución (en implementación real, esto sería asíncrono)
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% de éxito
      
      if (success) {
        this.updateTaskStatus(task.id, TaskStatus.COMPLETED, {
          result: `Tarea completada por ${agent.name}`,
          timestamp: new Date()
        });
      } else {
        this.updateTaskStatus(task.id, TaskStatus.FAILED, undefined, 'Error simulado');
      }
    }, Math.random() * 5000 + 1000); // Entre 1-6 segundos
  }

  /**
   * Inicia los health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Cada 30 segundos
  }

  /**
   * Realiza health checks de todos los agentes
   */
  private async performHealthChecks(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        await this.checkAgentHealth(agentId, agent);
      } catch (error) {
        logger.error(`Error en health check para agente ${agentId}`, {
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
  }

  /**
   * Verifica la salud de un agente específico
   */
  private async checkAgentHealth(agentId: string, agent: AIAgent): Promise<void> {
    const startTime = Date.now();
    let success = false;

    try {
      const endpoint = agent.metadata.endpoint;
      if (endpoint) {
        const response = await axios.get(`${endpoint}/health`, {
          timeout: 5000
        });

        if (response.status === 200) {
          success = true;
          agent.health.status = 'healthy';
        }
      }
    } catch (error) {
      agent.health.status = 'unhealthy';
      agent.health.errors.push({
        code: 'HEALTH_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
        count: 1
      });
    }

    const responseTime = Date.now() - startTime;
    agent.health.lastCheck = new Date();
    agent.health.responseTime = responseTime;

    if (success) {
      agent.health.uptime = Date.now() - agent.health.lastCheck.getTime();
      agent.health.errors = [];
    }

    // Actualizar estado del agente basado en health
    if (agent.health.status === 'unhealthy' && agent.status === AgentStatus.ONLINE) {
      agent.status = AgentStatus.ERROR;
    } else if (agent.health.status === 'healthy' && agent.status === AgentStatus.ERROR) {
      agent.status = AgentStatus.ONLINE;
    }
  }

  /**
   * Actualiza el tiempo promedio de tareas
   */
  private updateAverageTaskTime(duration: number): void {
    const totalTasks = this.metrics.completedTasks + this.metrics.failedTasks;
    if (totalTasks > 0) {
      this.metrics.averageTaskTime = 
        (this.metrics.averageTaskTime * (totalTasks - 1) + duration) / totalTasks;
    }
  }

  /**
   * Actualiza métricas generales
   */
  private updateMetrics(): void {
    this.metrics.totalAgents = this.agents.size;
    this.metrics.activeAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === AgentStatus.ONLINE).length;
    
    this.metrics.totalTasks = this.tasks.size;
    this.metrics.completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === TaskStatus.COMPLETED).length;
    this.metrics.failedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === TaskStatus.FAILED).length;
    
    this.metrics.totalWorkflows = this.workflows.size;
    this.metrics.activeWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.execution.status === ExecutionStatus.RUNNING).length;
    this.metrics.completedWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.execution.status === ExecutionStatus.COMPLETED).length;
    this.metrics.failedWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.execution.status === ExecutionStatus.FAILED).length;
  }

  /**
   * Obtiene métricas del coordinador
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  destroy(): void {
    if (this.workflowExecutor) {
      clearInterval(this.workflowExecutor);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
} 