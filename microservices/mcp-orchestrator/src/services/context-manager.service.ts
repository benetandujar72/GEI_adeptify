import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import {
  ContextManager,
  ContextData,
  CachedContext,
  ContextPolicy,
  ContextRule,
  ContextAction,
  CleanupConfig,
  RuleOperator,
  RuleCondition,
  ActionType,
  CleanupStrategy,
  ContextMetadata
} from '../types/orchestrator.types.js';

export class ContextManagerService {
  private contexts: Map<string, ContextData>;
  private cache: Map<string, CachedContext>;
  private policies: ContextPolicy[];
  private cleanup: CleanupConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, any>;

  constructor() {
    this.contexts = new Map();
    this.cache = new Map();
    this.policies = [];
    this.metrics = new Map();

    this.cleanup = {
      enabled: true,
      interval: 300000, // 5 minutos
      maxAge: 3600000, // 1 hora
      maxSize: 1000,
      strategy: CleanupStrategy.HYBRID
    };

    this.initializeDefaultPolicies();
    this.startCleanupProcess();
  }

  /**
   * Crea un nuevo contexto
   */
  createContext(userId: string, sessionId: string, data: Record<string, any>, metadata?: Partial<ContextMetadata>): ContextData {
    const contextId = uuidv4();
    const now = new Date();

    const contextData: ContextData = {
      id: contextId,
      userId,
      sessionId,
      data,
      metadata: {
        source: 'mcp-orchestrator',
        version: '1.0.0',
        tags: [],
        priority: 1,
        size: JSON.stringify(data).length,
        ...metadata
      },
      created: now,
      updated: now,
      expires: new Date(now.getTime() + this.cleanup.maxAge),
      accessCount: 0
    };

    this.contexts.set(contextId, contextData);
    this.updateMetrics('contexts_created', 1);

    logger.info(`Contexto creado: ${contextId}`, {
      userId,
      sessionId,
      dataSize: contextData.metadata.size,
      tags: contextData.metadata.tags
    });

    return contextData;
  }

  /**
   * Obtiene un contexto por ID
   */
  getContext(contextId: string): ContextData | undefined {
    const context = this.contexts.get(contextId);
    
    if (context) {
      // Verificar si ha expirado
      if (new Date() > context.expires) {
        this.deleteContext(contextId);
        return undefined;
      }

      // Actualizar métricas de acceso
      context.accessCount++;
      context.updated = new Date();
      this.updateMetrics('contexts_accessed', 1);

      // Aplicar políticas de acceso
      this.applyPolicies(context, 'access');
    }

    return context;
  }

  /**
   * Obtiene contextos por usuario
   */
  getContextsByUser(userId: string): ContextData[] {
    const userContexts = Array.from(this.contexts.values())
      .filter(context => context.userId === userId && new Date() <= context.expires);

    this.updateMetrics('contexts_queried_by_user', userContexts.length);
    return userContexts;
  }

  /**
   * Obtiene contextos por sesión
   */
  getContextsBySession(sessionId: string): ContextData[] {
    const sessionContexts = Array.from(this.contexts.values())
      .filter(context => context.sessionId === sessionId && new Date() <= context.expires);

    this.updateMetrics('contexts_queried_by_session', sessionContexts.length);
    return sessionContexts;
  }

  /**
   * Actualiza un contexto existente
   */
  updateContext(contextId: string, updates: Partial<ContextData>): ContextData | null {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      return null;
    }

    // Verificar si ha expirado
    if (new Date() > context.expires) {
      this.deleteContext(contextId);
      return null;
    }

    // Aplicar actualizaciones
    if (updates.data) {
      context.data = { ...context.data, ...updates.data };
      context.metadata.size = JSON.stringify(context.data).length;
    }

    if (updates.metadata) {
      context.metadata = { ...context.metadata, ...updates.metadata };
    }

    context.updated = new Date();
    context.accessCount++;

    // Aplicar políticas de actualización
    this.applyPolicies(context, 'update');

    this.updateMetrics('contexts_updated', 1);

    logger.info(`Contexto actualizado: ${contextId}`, {
      userId: context.userId,
      sessionId: context.sessionId,
      dataSize: context.metadata.size
    });

    return context;
  }

  /**
   * Elimina un contexto
   */
  deleteContext(contextId: string): boolean {
    const context = this.contexts.get(contextId);
    
    if (context) {
      this.contexts.delete(contextId);
      this.updateMetrics('contexts_deleted', 1);

      logger.info(`Contexto eliminado: ${contextId}`, {
        userId: context.userId,
        sessionId: context.sessionId
      });

      return true;
    }

    return false;
  }

  /**
   * Busca contextos usando criterios
   */
  searchContexts(criteria: {
    userId?: string;
    sessionId?: string;
    tags?: string[];
    minPriority?: number;
    maxAge?: number;
  }): ContextData[] {
    const now = new Date();
    
    let results = Array.from(this.contexts.values())
      .filter(context => new Date() <= context.expires);

    if (criteria.userId) {
      results = results.filter(context => context.userId === criteria.userId);
    }

    if (criteria.sessionId) {
      results = results.filter(context => context.sessionId === criteria.sessionId);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(context => 
        criteria.tags!.some(tag => context.metadata.tags.includes(tag))
      );
    }

    if (criteria.minPriority !== undefined) {
      results = results.filter(context => context.metadata.priority >= criteria.minPriority!);
    }

    if (criteria.maxAge !== undefined) {
      const cutoffTime = new Date(now.getTime() - criteria.maxAge);
      results = results.filter(context => context.created >= cutoffTime);
    }

    this.updateMetrics('contexts_searched', results.length);
    return results;
  }

  /**
   * Agrega datos al contexto
   */
  addContextData(contextId: string, key: string, value: any): boolean {
    const context = this.getContext(contextId);
    
    if (!context) {
      return false;
    }

    context.data[key] = value;
    context.metadata.size = JSON.stringify(context.data).length;
    context.updated = new Date();

    this.updateMetrics('context_data_added', 1);

    logger.debug(`Datos agregados al contexto: ${contextId}`, {
      key,
      valueType: typeof value
    });

    return true;
  }

  /**
   * Obtiene datos específicos del contexto
   */
  getContextData(contextId: string, key: string): any {
    const context = this.getContext(contextId);
    return context?.data[key];
  }

  /**
   * Elimina datos específicos del contexto
   */
  removeContextData(contextId: string, key: string): boolean {
    const context = this.getContext(contextId);
    
    if (!context || !(key in context.data)) {
      return false;
    }

    delete context.data[key];
    context.metadata.size = JSON.stringify(context.data).length;
    context.updated = new Date();

    this.updateMetrics('context_data_removed', 1);

    return true;
  }

  /**
   * Agrega una política de contexto
   */
  addPolicy(policy: ContextPolicy): void {
    this.policies.push(policy);
    
    // Ordenar políticas por prioridad (mayor prioridad primero)
    this.policies.sort((a, b) => b.priority - a.priority);

    logger.info(`Política agregada: ${policy.name}`, {
      priority: policy.priority,
      rules: policy.rules.length,
      actions: policy.actions.length
    });
  }

  /**
   * Elimina una política de contexto
   */
  removePolicy(policyName: string): boolean {
    const initialLength = this.policies.length;
    this.policies = this.policies.filter(policy => policy.name !== policyName);
    
    const removed = this.policies.length < initialLength;
    
    if (removed) {
      logger.info(`Política eliminada: ${policyName}`);
    }

    return removed;
  }

  /**
   * Obtiene todas las políticas
   */
  getPolicies(): ContextPolicy[] {
    return [...this.policies];
  }

  /**
   * Aplica políticas a un contexto
   */
  private applyPolicies(context: ContextData, action: string): void {
    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      // Verificar si la política se aplica al contexto
      if (this.evaluatePolicyRules(policy.rules, context)) {
        // Ejecutar acciones de la política
        for (const policyAction of policy.actions) {
          this.executePolicyAction(policyAction, context, action);
        }
      }
    }
  }

  /**
   * Evalúa las reglas de una política
   */
  private evaluatePolicyRules(rules: ContextRule[], context: ContextData): boolean {
    if (rules.length === 0) return true;

    return rules.every(rule => {
      const value = this.getNestedValue(context, rule.field);
      
      switch (rule.operator) {
        case RuleOperator.EQUALS:
          return value === rule.value;
        
        case RuleOperator.NOT_EQUALS:
          return value !== rule.value;
        
        case RuleOperator.GREATER_THAN:
          return typeof value === 'number' && value > rule.value;
        
        case RuleOperator.LESS_THAN:
          return typeof value === 'number' && value < rule.value;
        
        case RuleOperator.CONTAINS:
          return typeof value === 'string' && value.includes(rule.value);
        
        case RuleOperator.NOT_CONTAINS:
          return typeof value === 'string' && !value.includes(rule.value);
        
        case RuleOperator.REGEX:
          return typeof value === 'string' && new RegExp(rule.value).test(value);
        
        default:
          return false;
      }
    });
  }

  /**
   * Ejecuta una acción de política
   */
  private executePolicyAction(action: ContextAction, context: ContextData, triggerAction: string): void {
    try {
      switch (action.type) {
        case ActionType.UPDATE:
          if (action.target && action.parameters) {
            this.updateContext(context.id, {
              data: { [action.target]: action.parameters.value }
            });
          }
          break;

        case ActionType.TRANSFORM:
          if (action.target && action.parameters) {
            const currentValue = this.getNestedValue(context, action.target);
            const transformedValue = this.transformValue(currentValue, action.parameters);
            this.setNestedValue(context, action.target, transformedValue);
          }
          break;

        case ActionType.VALIDATE:
          if (action.target && action.parameters) {
            const value = this.getNestedValue(context, action.target);
            if (!this.validateValue(value, action.parameters)) {
              logger.warn(`Validación falló para contexto: ${context.id}`, {
                field: action.target,
                value
              });
            }
          }
          break;

        default:
          logger.warn(`Acción de política no soportada: ${action.type}`);
      }
    } catch (error) {
      logger.error(`Error ejecutando acción de política: ${action.type}`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        contextId: context.id
      });
    }
  }

  /**
   * Obtiene un valor anidado de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Establece un valor anidado en un objeto
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Transforma un valor según los parámetros
   */
  private transformValue(value: any, parameters: Record<string, any>): any {
    const transformType = parameters.transformType;
    
    switch (transformType) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'number':
        return typeof value === 'string' ? parseFloat(value) : value;
      
      case 'boolean':
        return Boolean(value);
      
      default:
        return value;
    }
  }

  /**
   * Valida un valor según los parámetros
   */
  private validateValue(value: any, parameters: Record<string, any>): boolean {
    const validationType = parameters.validationType;
    
    switch (validationType) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case 'minLength':
        return typeof value === 'string' && value.length >= parameters.minLength;
      
      case 'maxLength':
        return typeof value === 'string' && value.length <= parameters.maxLength;
      
      case 'min':
        return typeof value === 'number' && value >= parameters.min;
      
      case 'max':
        return typeof value === 'number' && value <= parameters.max;
      
      case 'regex':
        return typeof value === 'string' && new RegExp(parameters.pattern).test(value);
      
      default:
        return true;
    }
  }

  /**
   * Inicializa políticas por defecto
   */
  private initializeDefaultPolicies(): void {
    // Política de limpieza automática
    this.addPolicy({
      name: 'auto_cleanup',
      rules: [
        {
          field: 'accessCount',
          operator: RuleOperator.GREATER_THAN,
          value: 100,
          condition: RuleCondition.AND
        },
        {
          field: 'metadata.priority',
          operator: RuleOperator.LESS_THAN,
          value: 3,
          condition: RuleCondition.AND
        }
      ],
      actions: [
        {
          type: ActionType.UPDATE,
          target: 'expires',
          parameters: { value: new Date(Date.now() + 1800000) }, // 30 minutos
          conditions: []
        }
      ],
      priority: 1,
      enabled: true
    });

    // Política de validación de datos
    this.addPolicy({
      name: 'data_validation',
      rules: [
        {
          field: 'data.email',
          operator: RuleOperator.EXISTS,
          value: true,
          condition: RuleCondition.AND
        }
      ],
      actions: [
        {
          type: ActionType.VALIDATE,
          target: 'data.email',
          parameters: { validationType: 'email' },
          conditions: []
        }
      ],
      priority: 2,
      enabled: true
    });

    // Política de transformación de datos
    this.addPolicy({
      name: 'data_transformation',
      rules: [
        {
          field: 'data.name',
          operator: RuleOperator.EXISTS,
          value: true,
          condition: RuleCondition.AND
        }
      ],
      actions: [
        {
          type: ActionType.TRANSFORM,
          target: 'data.name',
          parameters: { transformType: 'trim' },
          conditions: []
        }
      ],
      priority: 3,
      enabled: true
    });
  }

  /**
   * Inicia el proceso de limpieza
   */
  private startCleanupProcess(): void {
    if (!this.cleanup.enabled) return;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanup.interval);
  }

  /**
   * Realiza la limpieza de contextos
   */
  private performCleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    // Limpiar contextos expirados
    for (const [contextId, context] of this.contexts.entries()) {
      if (now > context.expires) {
        this.contexts.delete(contextId);
        cleanedCount++;
      }
    }

    // Limpiar por tamaño si es necesario
    if (this.contexts.size > this.cleanup.maxSize) {
      const contextsToRemove = this.contexts.size - this.cleanup.maxSize;
      const sortedContexts = Array.from(this.contexts.entries())
        .sort(([, a], [, b]) => {
          switch (this.cleanup.strategy) {
            case CleanupStrategy.LRU:
              return a.updated.getTime() - b.updated.getTime();
            
            case CleanupStrategy.TTL:
              return a.expires.getTime() - b.expires.getTime();
            
            case CleanupStrategy.SIZE:
              return a.metadata.size - b.metadata.size;
            
            case CleanupStrategy.HYBRID:
              return (a.updated.getTime() + a.metadata.size) - (b.updated.getTime() + b.metadata.size);
            
            default:
              return 0;
          }
        });

      for (let i = 0; i < contextsToRemove; i++) {
        this.contexts.delete(sortedContexts[i][0]);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.updateMetrics('contexts_cleaned', cleanedCount);
      logger.info(`Limpieza completada: ${cleanedCount} contextos eliminados`, {
        remainingContexts: this.contexts.size,
        strategy: this.cleanup.strategy
      });
    }
  }

  /**
   * Actualiza métricas
   */
  private updateMetrics(metric: string, value: number): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  /**
   * Obtiene métricas del context manager
   */
  getMetrics(): any {
    return {
      totalContexts: this.contexts.size,
      totalPolicies: this.policies.length,
      activePolicies: this.policies.filter(p => p.enabled).length,
      contextsCreated: this.metrics.get('contexts_created') || 0,
      contextsAccessed: this.metrics.get('contexts_accessed') || 0,
      contextsUpdated: this.metrics.get('contexts_updated') || 0,
      contextsDeleted: this.metrics.get('contexts_deleted') || 0,
      contextsCleaned: this.metrics.get('contexts_cleaned') || 0,
      averageContextSize: Array.from(this.contexts.values())
        .reduce((sum, context) => sum + context.metadata.size, 0) / this.contexts.size || 0
    };
  }

  /**
   * Obtiene estadísticas de uso
   */
  getUsageStats(): any {
    const contexts = Array.from(this.contexts.values());
    
    return {
      totalContexts: contexts.length,
      contextsByUser: this.groupBy(contexts, 'userId'),
      contextsBySession: this.groupBy(contexts, 'sessionId'),
      contextsByPriority: this.groupBy(contexts, 'metadata.priority'),
      averageAccessCount: contexts.reduce((sum, c) => sum + c.accessCount, 0) / contexts.length || 0,
      oldestContext: contexts.length > 0 ? Math.min(...contexts.map(c => c.created.getTime())) : null,
      newestContext: contexts.length > 0 ? Math.max(...contexts.map(c => c.created.getTime())) : null
    };
  }

  /**
   * Agrupa contextos por una propiedad
   */
  private groupBy(contexts: ContextData[], property: string): Record<string, number> {
    return contexts.reduce((groups, context) => {
      const value = this.getNestedValue(context, property);
      const key = String(value);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
} 