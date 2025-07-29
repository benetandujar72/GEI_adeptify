import Redis from 'redis';
import { logger, costLogger } from '../utils/logger';
import { LLMProvider, ChatResponse, CompletionResponse, EmbeddingResponse } from '../types/llm';

export interface CostTrackingConfig {
  enabled: boolean;
  currency: string;
  budget: {
    daily: number;
    monthly: number;
  };
  alerts: {
    threshold: number;
    email?: string;
  };
  redisUrl?: string;
}

export interface CostRecord {
  id: string;
  userId?: string;
  provider: LLMProvider;
  model: string;
  type: 'chat' | 'completion' | 'embedding';
  tokens: number;
  cost: number;
  currency: string;
  timestamp: number;
  requestId: string;
}

export interface CostSummary {
  total: number;
  byProvider: Record<LLMProvider, number>;
  byModel: Record<string, number>;
  byType: Record<string, number>;
  byUser: Record<string, number>;
  period: 'daily' | 'monthly';
  startDate: string;
  endDate: string;
}

export class CostTrackingService {
  private config: CostTrackingConfig;
  private redisClient?: Redis.RedisClientType;
  private isInitialized = false;

  constructor(config: CostTrackingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Cost tracking deshabilitado');
      return;
    }

    try {
      if (this.config.redisUrl) {
        this.redisClient = Redis.createClient({
          url: this.config.redisUrl,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                logger.error('Demasiados intentos de reconexión a Redis para cost tracking');
                return new Error('Demasiados intentos de reconexión');
              }
              return Math.min(retries * 100, 3000);
            },
          },
        });

        this.redisClient.on('error', (err) => {
          logger.error('Error de Redis en cost tracking:', err);
        });

        this.redisClient.on('connect', () => {
          logger.info('Conectado a Redis para cost tracking');
        });

        await this.redisClient.connect();
      }

      this.isInitialized = true;
      logger.info('Cost tracking inicializado');
    } catch (error) {
      logger.error('Error inicializando cost tracking:', error);
      this.isInitialized = false;
    }
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.isInitialized = false;
  }

  async recordCost(
    response: ChatResponse | CompletionResponse | EmbeddingResponse,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    if (!this.config.enabled || !this.isInitialized) {
      return;
    }

    try {
      const costRecord: CostRecord = {
        id: `${response.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        provider: response.provider,
        model: response.model,
        type: this.getResponseType(response),
        tokens: response.usage.total_tokens,
        cost: response.cost.amount,
        currency: response.cost.currency,
        timestamp: Date.now(),
        requestId: requestId || response.id || 'unknown'
      };

      // Guardar en Redis si está disponible
      if (this.redisClient) {
        const key = `cost:${costRecord.id}`;
        await this.redisClient.setEx(key, 86400 * 30, JSON.stringify(costRecord)); // 30 días TTL

        // Actualizar contadores
        await this.updateCounters(costRecord);
      }

      // Log del costo
      costLogger.info('Cost recorded', {
        userId,
        provider: costRecord.provider,
        model: costRecord.model,
        type: costRecord.type,
        tokens: costRecord.tokens,
        cost: costRecord.cost,
        currency: costRecord.currency,
        requestId: costRecord.requestId
      });

      // Verificar límites de presupuesto
      await this.checkBudgetLimits(userId);

    } catch (error) {
      logger.error('Error registrando costo:', error);
    }
  }

  private getResponseType(response: ChatResponse | CompletionResponse | EmbeddingResponse): 'chat' | 'completion' | 'embedding' {
    if (response.object === 'chat.completion') return 'chat';
    if (response.object === 'text_completion') return 'completion';
    if (response.object === 'list') return 'embedding';
    return 'chat'; // fallback
  }

  private async updateCounters(costRecord: CostRecord): Promise<void> {
    if (!this.redisClient) return;

    const now = new Date();
    const dailyKey = `cost:daily:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthlyKey = `cost:monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const userDailyKey = `cost:user:${costRecord.userId || 'anonymous'}:daily:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const userMonthlyKey = `cost:user:${costRecord.userId || 'anonymous'}:monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const multi = this.redisClient.multi();

    // Contadores globales
    multi.hIncrByFloat(dailyKey, 'total', costRecord.cost);
    multi.hIncrByFloat(dailyKey, `${costRecord.provider}`, costRecord.cost);
    multi.hIncrByFloat(dailyKey, `${costRecord.model}`, costRecord.cost);
    multi.hIncrByFloat(dailyKey, `${costRecord.type}`, costRecord.cost);
    multi.hIncrBy(dailyKey, 'requests', 1);

    multi.hIncrByFloat(monthlyKey, 'total', costRecord.cost);
    multi.hIncrByFloat(monthlyKey, `${costRecord.provider}`, costRecord.cost);
    multi.hIncrByFloat(monthlyKey, `${costRecord.model}`, costRecord.cost);
    multi.hIncrByFloat(monthlyKey, `${costRecord.type}`, costRecord.cost);
    multi.hIncrBy(monthlyKey, 'requests', 1);

    // Contadores por usuario
    if (costRecord.userId) {
      multi.hIncrByFloat(userDailyKey, 'total', costRecord.cost);
      multi.hIncrByFloat(userDailyKey, `${costRecord.provider}`, costRecord.cost);
      multi.hIncrByFloat(userDailyKey, `${costRecord.model}`, costRecord.cost);
      multi.hIncrByFloat(userDailyKey, `${costRecord.type}`, costRecord.cost);
      multi.hIncrBy(userDailyKey, 'requests', 1);

      multi.hIncrByFloat(userMonthlyKey, 'total', costRecord.cost);
      multi.hIncrByFloat(userMonthlyKey, `${costRecord.provider}`, costRecord.cost);
      multi.hIncrByFloat(userMonthlyKey, `${costRecord.model}`, costRecord.cost);
      multi.hIncrByFloat(userMonthlyKey, `${costRecord.type}`, costRecord.cost);
      multi.hIncrBy(userMonthlyKey, 'requests', 1);
    }

    await multi.exec();
  }

  private async checkBudgetLimits(userId?: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const now = new Date();
      const dailyKey = `cost:daily:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const monthlyKey = `cost:monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Verificar límite diario global
      const dailyTotal = await this.redisClient.hGet(dailyKey, 'total');
      if (dailyTotal && parseFloat(dailyTotal) > this.config.budget.daily) {
        logger.warn(`Límite diario excedido: ${dailyTotal} > ${this.config.budget.daily}`);
        await this.sendBudgetAlert('daily', parseFloat(dailyTotal), this.config.budget.daily);
      }

      // Verificar límite mensual global
      const monthlyTotal = await this.redisClient.hGet(monthlyKey, 'total');
      if (monthlyTotal && parseFloat(monthlyTotal) > this.config.budget.monthly) {
        logger.warn(`Límite mensual excedido: ${monthlyTotal} > ${this.config.budget.monthly}`);
        await this.sendBudgetAlert('monthly', parseFloat(monthlyTotal), this.config.budget.monthly);
      }

      // Verificar límites por usuario si está especificado
      if (userId) {
        const userDailyKey = `cost:user:${userId}:daily:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const userMonthlyKey = `cost:user:${userId}:monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const userDailyTotal = await this.redisClient.hGet(userDailyKey, 'total');
        if (userDailyTotal && parseFloat(userDailyTotal) > this.config.budget.daily * 0.1) { // 10% del presupuesto diario por usuario
          logger.warn(`Límite diario del usuario ${userId} excedido: ${userDailyTotal}`);
        }

        const userMonthlyTotal = await this.redisClient.hGet(userMonthlyKey, 'total');
        if (userMonthlyTotal && parseFloat(userMonthlyTotal) > this.config.budget.monthly * 0.1) { // 10% del presupuesto mensual por usuario
          logger.warn(`Límite mensual del usuario ${userId} excedido: ${userMonthlyTotal}`);
        }
      }
    } catch (error) {
      logger.error('Error verificando límites de presupuesto:', error);
    }
  }

  private async sendBudgetAlert(period: 'daily' | 'monthly', current: number, limit: number): Promise<void> {
    const alert = {
      type: 'budget_exceeded',
      period,
      current,
      limit,
      percentage: (current / limit) * 100,
      timestamp: new Date().toISOString()
    };

    costLogger.warn('Budget alert', alert);

    // Aquí se podría implementar el envío de email o notificación
    if (this.config.alerts.email) {
      logger.info(`Alerta de presupuesto enviada a ${this.config.alerts.email}`);
    }
  }

  async getCostSummary(period: 'daily' | 'monthly', userId?: string): Promise<CostSummary> {
    if (!this.redisClient) {
      throw new Error('Redis no disponible para cost tracking');
    }

    const now = new Date();
    let key: string;
    let startDate: string;
    let endDate: string;

    if (period === 'daily') {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      key = userId ? `cost:user:${userId}:daily:${dateStr}` : `cost:daily:${dateStr}`;
      startDate = dateStr;
      endDate = dateStr;
    } else {
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      key = userId ? `cost:user:${userId}:monthly:${monthStr}` : `cost:monthly:${monthStr}`;
      startDate = `${monthStr}-01`;
      endDate = `${monthStr}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    }

    const data = await this.redisClient.hGetAll(key);

    const summary: CostSummary = {
      total: parseFloat(data.total || '0'),
      byProvider: {
        [LLMProvider.OPENAI]: parseFloat(data[LLMProvider.OPENAI] || '0'),
        [LLMProvider.ANTHROPIC]: parseFloat(data[LLMProvider.ANTHROPIC] || '0'),
        [LLMProvider.GOOGLE]: parseFloat(data[LLMProvider.GOOGLE] || '0'),
      },
      byModel: {},
      byType: {
        chat: parseFloat(data.chat || '0'),
        completion: parseFloat(data.completion || '0'),
        embedding: parseFloat(data.embedding || '0'),
      },
      byUser: {},
      period,
      startDate,
      endDate
    };

    // Agregar modelos específicos
    Object.keys(data).forEach(key => {
      if (key.includes('gpt-') || key.includes('claude-') || key.includes('gemini-')) {
        summary.byModel[key] = parseFloat(data[key] || '0');
      }
    });

    return summary;
  }

  async getTopUsers(period: 'daily' | 'monthly', limit: number = 10): Promise<Array<{ userId: string; cost: number }>> {
    if (!this.redisClient) {
      throw new Error('Redis no disponible para cost tracking');
    }

    const now = new Date();
    const pattern = period === 'daily' 
      ? `cost:user:*:daily:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      : `cost:user:*:monthly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const keys = await this.redisClient.keys(pattern);
    const users: Array<{ userId: string; cost: number }> = [];

    for (const key of keys) {
      const userId = key.split(':')[2]; // Extraer userId del key
      const total = await this.redisClient.hGet(key, 'total');
      if (total) {
        users.push({ userId, cost: parseFloat(total) });
      }
    }

    return users
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  async getCostHistory(userId?: string, days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    if (!this.redisClient) {
      throw new Error('Redis no disponible para cost tracking');
    }

    const history: Array<{ date: string; cost: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const key = userId ? `cost:user:${userId}:daily:${dateStr}` : `cost:daily:${dateStr}`;
      const total = await this.redisClient.hGet(key, 'total');
      
      history.push({
        date: dateStr,
        cost: parseFloat(total || '0')
      });
    }

    return history;
  }
}

// Instancia global del servicio de cost tracking
export const costTrackingService = new CostTrackingService({
  enabled: process.env.COST_TRACKING_ENABLED === 'true',
  currency: process.env.COST_CURRENCY || 'USD',
  budget: {
    daily: parseFloat(process.env.COST_BUDGET_DAILY || '100'),
    monthly: parseFloat(process.env.COST_BUDGET_MONTHLY || '3000')
  },
  alerts: {
    threshold: parseFloat(process.env.COST_ALERT_THRESHOLD || '0.8'),
    email: process.env.COST_ALERT_EMAIL
  },
  redisUrl: process.env.REDIS_URL
});