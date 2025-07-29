import { Request, Response } from 'express';
import { routingService } from '../services/routing';
import { contextManager } from '../services/context-manager';
import { agentCoordinator } from '../services/agent-coordinator';
import { RoutingRequest, ContextType, AgentType, ServiceStatus } from '../types/mcp';
import { logMCPOperation, logError } from '../utils/logger';

export class MCPController {
  // Main routing endpoint
  async routeRequest(req: Request, res: Response): Promise<void> {
    try {
      const request: RoutingRequest = req.body;
      
      logMCPOperation('route_request', {
        service: request.service,
        action: request.action,
        contextId: request.context
      });

      const response = await routingService.routeRequest(request);
      
      res.json({
        success: response.success,
        data: response.response,
        metadata: {
          serviceUrl: response.serviceUrl,
          responseTime: response.responseTime,
          contextId: response.contextId
        },
        error: response.error
      });

    } catch (error) {
      logError(error as Error, { operation: 'route_request' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Service Management
  async registerService(req: Request, res: Response): Promise<void> {
    try {
      const registration = req.body;
      
      logMCPOperation('register_service', {
        name: registration.name,
        url: registration.url,
        capabilities: registration.capabilities
      });

      await routingService.registerService(registration);
      
      res.json({
        success: true,
        message: `Service ${registration.name} registered successfully`
      });

    } catch (error) {
      logError(error as Error, { operation: 'register_service' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register service'
      });
    }
  }

  async getServices(req: Request, res: Response): Promise<void> {
    try {
      const services = routingService.getAllServices();
      const serviceList: any[] = [];

      for (const [serviceName, serviceInstances] of services.entries()) {
        serviceList.push({
          name: serviceName,
          instances: serviceInstances.map(instance => ({
            url: instance.url,
            status: instance.status,
            lastHealthCheck: instance.lastHealthCheck,
            responseTime: instance.responseTime,
            errorCount: instance.errorCount,
            circuitBreakerState: instance.circuitBreakerState
          }))
        });
      }

      res.json({
        success: true,
        data: serviceList
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_services' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get services'
      });
    }
  }

  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const services = routingService.getServiceStatus(serviceName);

      if (!services) {
        res.status(404).json({
          success: false,
          error: `Service ${serviceName} not found`
        });
        return;
      }

      res.json({
        success: true,
        data: services.map(service => ({
          url: service.url,
          status: service.status,
          lastHealthCheck: service.lastHealthCheck,
          responseTime: service.responseTime,
          errorCount: service.errorCount,
          circuitBreakerState: service.circuitBreakerState
        }))
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_service_status' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get service status'
      });
    }
  }

  async removeService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName, serviceUrl } = req.body;
      const removed = routingService.removeService(serviceName, serviceUrl);

      if (removed) {
        res.json({
          success: true,
          message: `Service ${serviceName} at ${serviceUrl} removed successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Service ${serviceName} at ${serviceUrl} not found`
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'remove_service' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove service'
      });
    }
  }

  // Context Management
  async createContext(req: Request, res: Response): Promise<void> {
    try {
      const { type, data, userId, sessionId, expiresAt } = req.body;
      
      logMCPOperation('create_context', {
        type,
        userId,
        sessionId,
        dataSize: Object.keys(data || {}).length
      });

      const context = await contextManager.createContext(
        type,
        data || {},
        userId,
        sessionId,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.json({
        success: true,
        data: context
      });

    } catch (error) {
      logError(error as Error, { operation: 'create_context' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create context'
      });
    }
  }

  async getContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const context = await contextManager.getContext(contextId);

      if (!context) {
        res.status(404).json({
          success: false,
          error: 'Context not found'
        });
        return;
      }

      res.json({
        success: true,
        data: context
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_context' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get context'
      });
    }
  }

  async updateContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const { updates } = req.body;

      const context = await contextManager.updateContext(contextId, updates);

      if (!context) {
        res.status(404).json({
          success: false,
          error: 'Context not found'
        });
        return;
      }

      res.json({
        success: true,
        data: context
      });

    } catch (error) {
      logError(error as Error, { operation: 'update_context' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update context'
      });
    }
  }

  async deleteContext(req: Request, res: Response): Promise<void> {
    try {
      const { contextId } = req.params;
      const deleted = await contextManager.deleteContext(contextId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Context deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Context not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'delete_context' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete context'
      });
    }
  }

  async getContextsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { type } = req.query;
      
      const contexts = await contextManager.getContextsByUser(
        userId,
        type ? (type as ContextType) : undefined
      );

      res.json({
        success: true,
        data: contexts
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_contexts_by_user' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contexts'
      });
    }
  }

  async getContextSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await contextManager.getContextSummary();

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_context_summary' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get context summary'
      });
    }
  }

  // Agent Management
  async registerAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentData = req.body;
      
      logMCPOperation('register_agent', {
        name: agentData.name,
        type: agentData.type,
        capabilities: agentData.capabilities
      });

      const agent = await agentCoordinator.registerAgent(agentData);

      res.json({
        success: true,
        data: agent
      });

    } catch (error) {
      logError(error as Error, { operation: 'register_agent' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register agent'
      });
    }
  }

  async unregisterAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const unregistered = await agentCoordinator.unregisterAgent(agentId);

      if (unregistered) {
        res.json({
          success: true,
          message: 'Agent unregistered successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'unregister_agent' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister agent'
      });
    }
  }

  async updateAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { status } = req.body;
      
      const updated = await agentCoordinator.updateAgentStatus(agentId, status);

      if (updated) {
        res.json({
          success: true,
          message: 'Agent status updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'update_agent_status' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent status'
      });
    }
  }

  async heartbeat(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const success = await agentCoordinator.heartbeat(agentId);

      if (success) {
        res.json({
          success: true,
          message: 'Heartbeat received'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'agent_heartbeat' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process heartbeat'
      });
    }
  }

  async getAgents(req: Request, res: Response): Promise<void> {
    try {
      const agents = agentCoordinator.getAllAgents();

      res.json({
        success: true,
        data: agents
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_agents' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agents'
      });
    }
  }

  async getAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const metrics = await agentCoordinator.getAgentMetrics(agentId);

      if (metrics) {
        res.json({
          success: true,
          data: metrics
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'get_agent_metrics' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent metrics'
      });
    }
  }

  async getAllAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await agentCoordinator.getAllAgentMetrics();

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_all_agent_metrics' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent metrics'
      });
    }
  }

  // Task Management
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { agentType, taskType, data, priority, contextId } = req.body;
      
      logMCPOperation('create_task', {
        agentType,
        taskType,
        priority,
        contextId
      });

      const task = await agentCoordinator.createTask(
        agentType,
        taskType,
        data,
        priority,
        contextId
      );

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      logError(error as Error, { operation: 'create_task' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      });
    }
  }

  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { result, error } = req.body;
      
      const completed = await agentCoordinator.completeTask(taskId, result, error);

      if (completed) {
        res.json({
          success: true,
          message: 'Task completed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

    } catch (error) {
      logError(error as Error, { operation: 'complete_task' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete task'
      });
    }
  }

  async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = agentCoordinator.getAllTasks();

      res.json({
        success: true,
        data: tasks
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_tasks' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks'
      });
    }
  }

  async getTaskQueue(req: Request, res: Response): Promise<void> {
    try {
      const queue = await agentCoordinator.getTaskQueue();

      res.json({
        success: true,
        data: queue
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_task_queue' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task queue'
      });
    }
  }

  // Workflow Management
  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflowData = req.body;
      
      logMCPOperation('create_workflow', {
        name: workflowData.name,
        steps: workflowData.steps.length
      });

      const workflow = await agentCoordinator.createWorkflow(workflowData);

      res.json({
        success: true,
        data: workflow
      });

    } catch (error) {
      logError(error as Error, { operation: 'create_workflow' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow'
      });
    }
  }

  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { contextId } = req.body;
      
      logMCPOperation('execute_workflow', {
        workflowId,
        contextId
      });

      const taskIds = await agentCoordinator.executeWorkflow(workflowId, contextId);

      res.json({
        success: true,
        data: { taskIds }
      });

    } catch (error) {
      logError(error as Error, { operation: 'execute_workflow' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute workflow'
      });
    }
  }

  async getWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const workflows = agentCoordinator.getAllWorkflows();

      res.json({
        success: true,
        data: workflows
      });

    } catch (error) {
      logError(error as Error, { operation: 'get_workflows' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflows'
      });
    }
  }

  // Health Check
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const services = routingService.getAllServices();
      const contextSummary = await contextManager.getContextSummary();
      const agents = agentCoordinator.getAllAgents();
      const tasks = agentCoordinator.getAllTasks();

      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          total: services.size,
          healthy: Array.from(services.values()).flat().filter(s => s.status === ServiceStatus.ACTIVE).length
        },
        contexts: contextSummary,
        agents: {
          total: agents.length,
          active: agents.filter(a => a.status === ServiceStatus.ACTIVE).length
        },
        tasks: {
          total: tasks.length,
          pending: tasks.filter(t => t.status === 'pending').length,
          running: tasks.filter(t => t.status === 'running').length,
          completed: tasks.filter(t => t.status === 'completed').length
        }
      };

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      logError(error as Error, { operation: 'health_check' });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  }
}

export const mcpController = new MCPController();