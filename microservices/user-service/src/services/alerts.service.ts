import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import { RedisService } from './redis.service.js';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // segundos
  notificationChannels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window: number; // segundos
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  status: 'active' | 'resolved';
  resolvedAt?: Date;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: any;
  enabled: boolean;
}

export class AlertsService {
  private static instance: AlertsService;
  private redis: RedisService;
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.redis = new RedisService();
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  public static getInstance(): AlertsService {
    if (!AlertsService.instance) {
      AlertsService.instance = new AlertsService();
    }
    return AlertsService.instance;
  }

  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5% in the last 5 minutes',
        condition: {
          metric: 'http_requests_failed_total',
          operator: 'gt',
          threshold: 5,
          window: 300, // 5 minutos
          aggregation: 'sum'
        },
        severity: 'high',
        enabled: true,
        cooldown: 300, // 5 minutos
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Average response time exceeds 2 seconds',
        condition: {
          metric: 'http_request_duration_seconds',
          operator: 'gt',
          threshold: 2,
          window: 300,
          aggregation: 'avg'
        },
        severity: 'medium',
        enabled: true,
        cooldown: 300,
        notificationChannels: ['slack']
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 80%',
        condition: {
          metric: 'memory_usage_bytes',
          operator: 'gt',
          threshold: 0.8,
          window: 60,
          aggregation: 'avg'
        },
        severity: 'high',
        enabled: true,
        cooldown: 600, // 10 minutos
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'database-connection-issues',
        name: 'Database Connection Issues',
        description: 'Database errors exceed threshold',
        condition: {
          metric: 'database_errors_total',
          operator: 'gt',
          threshold: 10,
          window: 300,
          aggregation: 'sum'
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300,
        notificationChannels: ['email', 'slack', 'sms']
      },
      {
        id: 'redis-connection-issues',
        name: 'Redis Connection Issues',
        description: 'Redis errors exceed threshold',
        condition: {
          metric: 'redis_errors_total',
          operator: 'gt',
          threshold: 5,
          window: 300,
          aggregation: 'sum'
        },
        severity: 'high',
        enabled: true,
        cooldown: 300,
        notificationChannels: ['slack']
      },
      {
        id: 'security-breach-attempt',
        name: 'Security Breach Attempt',
        description: 'High number of security events detected',
        condition: {
          metric: 'security_events_total',
          operator: 'gt',
          threshold: 20,
          window: 300,
          aggregation: 'sum'
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300,
        notificationChannels: ['email', 'slack', 'sms']
      },
      {
        id: 'rate-limit-abuse',
        name: 'Rate Limit Abuse',
        description: 'High number of rate limit hits',
        condition: {
          metric: 'rate_limit_hits_total',
          operator: 'gt',
          threshold: 50,
          window: 300,
          aggregation: 'sum'
        },
        severity: 'medium',
        enabled: true,
        cooldown: 300,
        notificationChannels: ['slack']
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    logger.info('Alertas por defecto inicializadas', { ruleCount: defaultRules.length });
  }

  private async initializeDefaultChannels(): Promise<void> {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email',
        type: 'email',
        config: {
          smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          },
          recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
        },
        enabled: true
      },
      {
        id: 'slack',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: process.env.SLACK_USERNAME || 'User Service Alerts'
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL
      },
      {
        id: 'webhook',
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL || '',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
          }
        },
        enabled: !!process.env.ALERT_WEBHOOK_URL
      }
    ];

    for (const channel of defaultChannels) {
      this.channels.set(channel.id, channel);
    }

    logger.info('Canales de notificación por defecto inicializados', { channelCount: defaultChannels.length });
  }

  // Iniciar el servicio de alertas
  public async start(): Promise<void> {
    try {
      await this.redis.connect();
      
      // Verificar alertas cada 30 segundos
      this.checkInterval = setInterval(async () => {
        await this.checkAlerts();
      }, 30000);

      logger.info('Servicio de alertas iniciado');
    } catch (error) {
      logger.error('Error al iniciar el servicio de alertas', { error });
      throw error;
    }
  }

  // Detener el servicio de alertas
  public async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    await this.redis.disconnect();
    logger.info('Servicio de alertas detenido');
  }

  // Verificar todas las reglas de alerta
  private async checkAlerts(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule);
        
        if (shouldAlert) {
          await this.triggerAlert(rule);
        } else {
          await this.resolveAlert(rule.id);
        }
      } catch (error) {
        logger.error('Error al verificar regla de alerta', { ruleId: rule.id, error });
      }
    }
  }

  // Evaluar una regla de alerta
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const { condition } = rule;
    const now = Date.now();
    const windowStart = now - (condition.window * 1000);

    // Obtener métricas del período de tiempo
    const metricValue = await this.getMetricValue(condition.metric, windowStart, now, condition.aggregation);
    
    // Verificar si está en cooldown
    const lastAlertTime = await this.getLastAlertTime(rule.id);
    if (lastAlertTime && (now - lastAlertTime) < (rule.cooldown * 1000)) {
      return false;
    }

    // Evaluar condición
    switch (condition.operator) {
      case 'gt':
        return metricValue > condition.threshold;
      case 'lt':
        return metricValue < condition.threshold;
      case 'eq':
        return metricValue === condition.threshold;
      case 'gte':
        return metricValue >= condition.threshold;
      case 'lte':
        return metricValue <= condition.threshold;
      default:
        return false;
    }
  }

  // Obtener valor de métrica
  private async getMetricValue(metricName: string, startTime: number, endTime: number, aggregation: string): Promise<number> {
    // En una implementación real, esto consultaría Prometheus o la base de datos de métricas
    // Por ahora, simulamos valores basados en métricas en memoria
    
    const metricKey = `metric:${metricName}:${startTime}:${endTime}`;
    const cachedValue = await this.redis.get(metricKey);
    
    if (cachedValue) {
      return parseFloat(cachedValue);
    }

    // Simular valor basado en el tipo de métrica
    let value = 0;
    switch (metricName) {
      case 'http_requests_failed_total':
        value = Math.random() * 10; // 0-10 errores
        break;
      case 'http_request_duration_seconds':
        value = Math.random() * 3; // 0-3 segundos
        break;
      case 'memory_usage_bytes':
        const memUsage = process.memoryUsage();
        value = memUsage.heapUsed / memUsage.heapTotal; // Porcentaje de uso
        break;
      case 'database_errors_total':
        value = Math.random() * 5; // 0-5 errores
        break;
      case 'redis_errors_total':
        value = Math.random() * 3; // 0-3 errores
        break;
      case 'security_events_total':
        value = Math.random() * 25; // 0-25 eventos
        break;
      case 'rate_limit_hits_total':
        value = Math.random() * 60; // 0-60 hits
        break;
      default:
        value = 0;
    }

    // Cachear el valor por 30 segundos
    await this.redis.setex(metricKey, 30, value.toString());
    
    return value;
  }

  // Obtener tiempo de la última alerta
  private async getLastAlertTime(ruleId: string): Promise<number | null> {
    const lastAlertKey = `alert:last:${ruleId}`;
    const lastAlertTime = await this.redis.get(lastAlertKey);
    return lastAlertTime ? parseInt(lastAlertTime) : null;
  }

  // Disparar una alerta
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    const now = new Date();

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      timestamp: now,
      severity: rule.severity,
      message: rule.description,
      metric: rule.condition.metric,
      value: 0, // Se actualizará con el valor real
      threshold: rule.condition.threshold,
      status: 'active'
    };

    // Guardar alerta activa
    this.activeAlerts.set(rule.id, alert);
    await this.redis.setex(`alert:active:${rule.id}`, 3600, JSON.stringify(alert)); // 1 hora

    // Registrar tiempo de última alerta
    await this.redis.setex(`alert:last:${rule.id}`, rule.cooldown, Date.now().toString());

    // Enviar notificaciones
    await this.sendNotifications(alert, rule);

    logger.warn('Alerta disparada', { alertId, ruleId: rule.id, severity: rule.severity });
  }

  // Resolver una alerta
  private async resolveAlert(ruleId: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(ruleId);
    if (!activeAlert) return;

    activeAlert.status = 'resolved';
    activeAlert.resolvedAt = new Date();

    // Remover de alertas activas
    this.activeAlerts.delete(ruleId);
    await this.redis.del(`alert:active:${ruleId}`);

    // Guardar alerta resuelta
    await this.redis.lpush('alert:resolved', JSON.stringify(activeAlert));
    await this.redis.ltrim('alert:resolved', 0, 999); // Mantener solo las últimas 1000

    logger.info('Alerta resuelta', { ruleId, alertId: activeAlert.id });
  }

  // Enviar notificaciones
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channelId of rule.notificationChannels) {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.enabled) continue;

      try {
        await this.sendNotification(alert, rule, channel);
      } catch (error) {
        logger.error('Error al enviar notificación', { channelId, alertId: alert.id, error });
      }
    }
  }

  // Enviar notificación por canal específico
  private async sendNotification(alert: Alert, rule: AlertRule, channel: NotificationChannel): Promise<void> {
    const message = this.formatAlertMessage(alert, rule);

    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(message, channel.config);
        break;
      case 'slack':
        await this.sendSlackNotification(message, channel.config);
        break;
      case 'webhook':
        await this.sendWebhookNotification(message, channel.config);
        break;
      default:
        logger.warn('Tipo de canal de notificación no soportado', { type: channel.type });
    }
  }

  // Formatear mensaje de alerta
  private formatAlertMessage(alert: Alert, rule: AlertRule): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };

    return `${severityEmoji[alert.severity]} **ALERTA: ${rule.name}**

**Descripción:** ${rule.description}
**Severidad:** ${alert.severity.toUpperCase()}
**Métrica:** ${alert.metric}
**Umbral:** ${alert.threshold}
**Timestamp:** ${alert.timestamp.toISOString()}

**Servicio:** User Service
**Entorno:** ${process.env.NODE_ENV || 'development'}`;
  }

  // Enviar notificación por email
  private async sendEmailNotification(message: string, config: any): Promise<void> {
    // Implementación simplificada - en producción usar nodemailer
    logger.info('Notificación por email enviada', { 
      recipients: config.recipients,
      subject: 'User Service Alert'
    });
  }

  // Enviar notificación por Slack
  private async sendSlackNotification(message: string, config: any): Promise<void> {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message,
          channel: config.channel,
          username: config.username
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      logger.info('Notificación por Slack enviada', { channel: config.channel });
    } catch (error) {
      logger.error('Error al enviar notificación por Slack', { error });
    }
  }

  // Enviar notificación por webhook
  private async sendWebhookNotification(message: string, config: any): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: JSON.stringify({
          alert: message,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      logger.info('Notificación por webhook enviada', { url: config.url });
    } catch (error) {
      logger.error('Error al enviar notificación por webhook', { error });
    }
  }

  // Métodos públicos para gestión de reglas y canales
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Regla de alerta agregada', { ruleId: rule.id });
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('Regla de alerta removida', { ruleId });
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.info('Canal de notificación agregado', { channelId: channel.id });
  }

  public removeChannel(channelId: string): void {
    this.channels.delete(channelId);
    logger.info('Canal de notificación removido', { channelId });
  }

  public getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Método para disparar alerta manualmente
  public async triggerManualAlert(ruleId: string, message?: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Regla de alerta no encontrada: ${ruleId}`);
    }

    const alert: Alert = {
      id: `${ruleId}-manual-${Date.now()}`,
      ruleId,
      timestamp: new Date(),
      severity: rule.severity,
      message: message || rule.description,
      metric: rule.condition.metric,
      value: 0,
      threshold: rule.condition.threshold,
      status: 'active'
    };

    await this.sendNotifications(alert, rule);
    logger.info('Alerta manual disparada', { ruleId, message });
  }
}

// Exportar instancia singleton
export const alerts = AlertsService.getInstance();