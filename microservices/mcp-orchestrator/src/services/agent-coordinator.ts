import { v4 as uuidv4 } from 'uuid';
import { AgentType, ServiceStatus, Context } from '../types/mcp';
import { logAgent, logError } from '../utils/logger';

// Agent interfaces
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: ServiceStatus;
  capabilities: string[];
  config: Record<string, any>;
  lastHeartbeat: Date;
  activeTasks: number;
  maxConcurrency: number;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  agentId: string;
  type: string;
  priority: number;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  contextId?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: AgentType;
  action: string;
  data: any;
  dependencies: string[];
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  timeoutMs?: number;
}

export interface WorkflowTrigger {
  id: string;
  type: 'event' | 'schedule' | 'manual';
  condition: any;
  enabled: boolean;
}

export interface AgentMetrics {
  agentId: string;
  tasksProcessed: number;
  tasksFailed: number;
  averageProcessingTime: number;
  uptime: number;
  lastActivity: Date;
}

export class AgentCoordinator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private taskQueue: Task[] = [];
  private agentTasks: Map<string, string[]> = new Map(); // agentId -> taskIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private taskProcessorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeatMonitoring();
    this.startTaskProcessor();
  }

  // Agent Management
  async registerAgent(agent: Omit<Agent, 'id' | 'status' | 'lastHeartbeat' | 'activeTasks'>): Promise<Agent> {
    const agentId = uuidv4();
    const newAgent: Agent = {
      ...agent,
      id: agentId,
      status: ServiceStatus.ACTIVE,
      lastHeartbeat: new Date(),
      activeTasks: 0
    };

    this.agents.set(agentId, newAgent);
    this.agentTasks.set(agentId, []);

    logAgent(agent.type, 'register', { agentId, name: agent.name, capabilities: agent.capabilities });

    return newAgent;
  }

  async unregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Cancel all active tasks for this agent
    const agentTaskIds = this.agentTasks.get(agentId) || [];
    for (const taskId of agentTaskIds) {
      await this.cancelTask(taskId);
    }

    this.agents.delete(agentId);
    this.agentTasks.delete(agentId);

    logAgent(agent.type, 'unregister', { agentId, name: agent.name });

    return true;
  }

  async updateAgentStatus(agentId: string, status: ServiceStatus): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const previousStatus = agent.status;
    agent.status = status;
    agent.lastHeartbeat = new Date();

    logAgent(agent.type, 'status_update', { 
      agentId, 
      name: agent.name, 
      previousStatus, 
      newStatus: status 
    });

    return true;
  }

  async heartbeat(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    agent.lastHeartbeat = new Date();
    return true;
  }

  // Task Management
  async createTask(
    agentType: AgentType,
    taskType: string,
    data: any,
    priority: number = 5,
    contextId?: string
  ): Promise<Task> {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      agentId: '', // Will be assigned when task is picked up
      type: taskType,
      priority,
      data,
      status: 'pending',
      createdAt: new Date(),
      contextId
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(task);

    // Sort queue by priority (higher priority first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    logAgent(agentType, 'task_created', { taskId, taskType, priority, contextId });

    return task;
  }

  async assignTaskToAgent(taskId: string, agentId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) {
      return false;
    }

    if (agent.activeTasks >= agent.maxConcurrency) {
      return false;
    }

    if (agent.status !== ServiceStatus.ACTIVE) {
      return false;
    }

    task.agentId = agentId;
    task.status = 'running';
    task.startedAt = new Date();

    agent.activeTasks++;
    this.agentTasks.get(agentId)!.push(taskId);

    logAgent(agent.type, 'task_assigned', { taskId, agentId, taskType: task.type });

    return true;
  }

  async completeTask(taskId: string, result?: any, error?: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = error ? 'failed' : 'completed';
    task.completedAt = new Date();
    task.result = result;
    task.error = error;

    // Update agent metrics
    const agent = this.agents.get(task.agentId);
    if (agent) {
      agent.activeTasks = Math.max(0, agent.activeTasks - 1);
      
      // Remove task from agent's task list
      const agentTaskIds = this.agentTasks.get(task.agentId) || [];
      const index = agentTaskIds.indexOf(taskId);
      if (index > -1) {
        agentTaskIds.splice(index, 1);
      }
    }

    logAgent(agent?.type || 'unknown', 'task_completed', { 
      taskId, 
      agentId: task.agentId, 
      status: task.status,
      hasError: !!error 
    });

    return true;
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = 'cancelled';
    task.completedAt = new Date();

    // Update agent metrics
    const agent = this.agents.get(task.agentId);
    if (agent && task.status === 'running') {
      agent.activeTasks = Math.max(0, agent.activeTasks - 1);
    }

    // Remove from queue if still pending
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    logAgent(agent?.type || 'unknown', 'task_cancelled', { taskId, agentId: task.agentId });

    return true;
  }

  // Workflow Management
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const workflowId = uuidv4();
    const newWorkflow: Workflow = {
      ...workflow,
      id: workflowId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, newWorkflow);

    logAgent('workflow', 'created', { workflowId, name: workflow.name, steps: workflow.steps.length });

    return newWorkflow;
  }

  async executeWorkflow(workflowId: string, contextId?: string): Promise<string[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} not found or not active`);
    }

    const taskIds: string[] = [];
    const stepTasks: Map<string, string> = new Map(); // stepId -> taskId

    // Create tasks for each step
    for (const step of workflow.steps) {
      const task = await this.createTask(
        step.agentType,
        step.action,
        step.data,
        5, // Default priority
        contextId
      );

      stepTasks.set(step.id, task.id);
      taskIds.push(task.id);
    }

    // Store workflow execution context
    const executionContext = {
      workflowId,
      stepTasks,
      completedSteps: new Set<string>(),
      contextId
    };

    // Start execution with first step
    await this.executeWorkflowStep(workflowId, workflow.steps[0], executionContext);

    return taskIds;
  }

  private async executeWorkflowStep(
    workflowId: string,
    step: WorkflowStep,
    executionContext: any
  ): Promise<void> {
    const taskId = executionContext.stepTasks.get(step.id);
    if (!taskId) {
      return;
    }

    // Check dependencies
    const dependenciesMet = step.dependencies.every(depId => 
      executionContext.completedSteps.has(depId)
    );

    if (!dependenciesMet) {
      // Wait for dependencies
      setTimeout(() => {
        this.executeWorkflowStep(workflowId, step, executionContext);
      }, 1000);
      return;
    }

    // Assign task to available agent
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.type === step.agentType && 
        agent.status === ServiceStatus.ACTIVE &&
        agent.activeTasks < agent.maxConcurrency
      );

    if (availableAgents.length === 0) {
      // Retry later
      setTimeout(() => {
        this.executeWorkflowStep(workflowId, step, executionContext);
      }, 5000);
      return;
    }

    // Select best agent (simple round-robin for now)
    const selectedAgent = availableAgents[0];
    await this.assignTaskToAgent(taskId, selectedAgent.id);

    // Monitor task completion
    this.monitorTaskCompletion(taskId, workflowId, step, executionContext);
  }

  private async monitorTaskCompletion(
    taskId: string,
    workflowId: string,
    step: WorkflowStep,
    executionContext: any
  ): Promise<void> {
    const checkInterval = setInterval(async () => {
      const task = this.tasks.get(taskId);
      if (!task) {
        clearInterval(checkInterval);
        return;
      }

      if (task.status === 'completed' || task.status === 'failed') {
        clearInterval(checkInterval);
        
        if (task.status === 'completed') {
          executionContext.completedSteps.add(step.id);
          
          // Execute next steps
          const workflow = this.workflows.get(workflowId);
          if (workflow) {
            const nextSteps = workflow.steps.filter(s => 
              s.dependencies.includes(step.id) &&
              !executionContext.completedSteps.has(s.id)
            );

            for (const nextStep of nextSteps) {
              await this.executeWorkflowStep(workflowId, nextStep, executionContext);
            }
          }
        }
      }
    }, 1000);

    // Timeout
    setTimeout(() => {
      clearInterval(checkInterval);
    }, step.timeoutMs || 300000); // 5 minutes default
  }

  // Monitoring and Metrics
  async getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    const agentTaskIds = this.agentTasks.get(agentId) || [];
    const agentTasks = agentTaskIds.map(id => this.tasks.get(id)).filter(Boolean) as Task[];

    const completedTasks = agentTasks.filter(t => t.status === 'completed');
    const failedTasks = agentTasks.filter(t => t.status === 'failed');

    const processingTimes = completedTasks
      .map(t => t.completedAt!.getTime() - t.startedAt!.getTime())
      .filter(time => time > 0);

    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    return {
      agentId,
      tasksProcessed: completedTasks.length,
      tasksFailed: failedTasks.length,
      averageProcessingTime,
      uptime: Date.now() - agent.lastHeartbeat.getTime(),
      lastActivity: agent.lastHeartbeat
    };
  }

  async getAllAgentMetrics(): Promise<AgentMetrics[]> {
    const metrics: AgentMetrics[] = [];
    
    for (const agentId of this.agents.keys()) {
      const metric = await this.getAgentMetrics(agentId);
      if (metric) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  // Task Queue Management
  async getTaskQueue(): Promise<Task[]> {
    return [...this.taskQueue];
  }

  async getAgentTasks(agentId: string): Promise<Task[]> {
    const taskIds = this.agentTasks.get(agentId) || [];
    return taskIds.map(id => this.tasks.get(id)).filter(Boolean) as Task[];
  }

  // Heartbeat Monitoring
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatTimeout = 5 * 60 * 1000; // 5 minutes

      for (const [agentId, agent] of this.agents.entries()) {
        const timeSinceHeartbeat = now - agent.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > heartbeatTimeout && agent.status === ServiceStatus.ACTIVE) {
          agent.status = ServiceStatus.ERROR;
          logAgent(agent.type, 'heartbeat_timeout', { agentId, name: agent.name });
        }
      }
    }, 60000); // Check every minute
  }

  // Task Processor
  private startTaskProcessor(): void {
    this.taskProcessorInterval = setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Process every second
  }

  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue[0];
    
    // Find available agent for this task type
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.status === ServiceStatus.ACTIVE &&
        agent.activeTasks < agent.maxConcurrency
      );

    if (availableAgents.length === 0) {
      return; // No available agents
    }

    // Simple round-robin assignment
    const selectedAgent = availableAgents[0];
    const assigned = await this.assignTaskToAgent(task.id, selectedAgent.id);
    
    if (assigned) {
      this.taskQueue.shift(); // Remove from queue
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.taskProcessorInterval) {
      clearInterval(this.taskProcessorInterval);
    }
  }

  // Get All Agents
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // Get All Tasks
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  // Get All Workflows
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
}

// Export singleton instance
export const agentCoordinator = new AgentCoordinator();