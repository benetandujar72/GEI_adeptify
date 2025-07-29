import { logger } from './logging.service.js';
import { metrics } from './metrics.service.js';
import { RedisService } from './redis.service.js';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: AlertCondition[];
  cooldown: number; // segundos
  enabled: boolean;
  channels: string[];
  metadata?: Record<string, any>;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  timeWindow: number; // segundos
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: string;
  timestamp: number;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
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
      // Alertas de MCP
      {
        id: 'mcp-high-error-rate',
        name: 'High MCP Error Rate',
        description: 'MCP error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'mcp_requests_failed_total',
            operator: 'gt',
            threshold: 10,
            timeWindow: 300, // 5 minutos
            aggregation: 'sum'
          }
        ],
        cooldown: 300, // 5 minutos
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'mcp-high-response-time',
        name: 'High MCP Response Time',
        description: 'MCP response time exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'mcp_request_duration_seconds',
            operator: 'gt',
            threshold: 5,
            timeWindow: 300,
            aggregation: 'avg'
          }
        ],
        cooldown: 600, // 10 minutos
        enabled: true,
        channels: ['slack']
      },
      {
        id: 'mcp-services-unhealthy',
        name: 'Unhealthy MCP Services',
        description: 'Number of unhealthy MCP services exceeds threshold',
        severity: 'critical',
        conditions: [
          {
            metric: 'mcp_services_unhealthy',
            operator: 'gt',
            threshold: 2,
            timeWindow: 60,
            aggregation: 'max'
          }
        ],
        cooldown: 180, // 3 minutos
        enabled: true,
        channels: ['email', 'slack', 'pagerduty']
      },

      // Alertas de Routing
      {
        id: 'routing-high-error-rate',
        name: 'High Routing Error Rate',
        description: 'Routing error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'routing_requests_failed_total',
            operator: 'gt',
            threshold: 5,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 300,
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'routing-high-latency',
        name: 'High Routing Latency',
        description: 'Routing latency exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'routing_request_duration_seconds',
            operator: 'gt',
            threshold: 1,
            timeWindow: 300,
            aggregation: 'avg'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['slack']
      },

      // Alertas de Context Management
      {
        id: 'context-high-error-rate',
        name: 'High Context Management Error Rate',
        description: 'Context management error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'context_operations_failed_total',
            operator: 'gt',
            threshold: 5,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 300,
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'context-high-latency',
        name: 'High Context Management Latency',
        description: 'Context management latency exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'context_operation_duration_seconds',
            operator: 'gt',
            threshold: 2,
            timeWindow: 300,
            aggregation: 'avg'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['slack']
      },

      // Alertas de Agent Coordination
      {
        id: 'agent-high-error-rate',
        name: 'High Agent Coordination Error Rate',
        description: 'Agent coordination error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'agent_operations_failed_total',
            operator: 'gt',
            threshold: 5,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 300,
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'agent-task-failures',
        name: 'Agent Task Failures',
        description: 'Agent task failure rate exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'agent_tasks_failed_total',
            operator: 'gt',
            threshold: 3,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['slack']
      },

      // Alertas de Workflows
      {
        id: 'workflow-high-error-rate',
        name: 'High Workflow Error Rate',
        description: 'Workflow error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'workflow_operations_failed_total',
            operator: 'gt',
            threshold: 3,
            timeWindow: 600,
            aggregation: 'sum'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'workflow-long-duration',
        name: 'Long Running Workflows',
        description: 'Workflow duration exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'workflow_operation_duration_seconds',
            operator: 'gt',
            threshold: 300, // 5 minutos
            timeWindow: 600,
            aggregation: 'avg'
          }
        ],
        cooldown: 900,
        enabled: true,
        channels: ['slack']
      },

      // Alertas de Performance
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'memory_usage_bytes',
            operator: 'gt',
            threshold: 1073741824, // 1GB
            timeWindow: 300,
            aggregation: 'max'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['slack']
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'CPU usage exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'cpu_usage_percent',
            operator: 'gt',
            threshold: 80,
            timeWindow: 300,
            aggregation: 'avg'
          }
        ],
        cooldown: 600,
        enabled: true,
        channels: ['slack']
      },

      // Alertas de Circuit Breaker
      {
        id: 'circuit-breaker-trips',
        name: 'Circuit Breaker Trips',
        description: 'Circuit breaker trips detected',
        severity: 'high',
        conditions: [
          {
            metric: 'circuit_breaker_trips_total',
            operator: 'gt',
            threshold: 2,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 300,
        enabled: true,
        channels: ['email', 'slack']
      },

      // Alertas de AI Services
      {
        id: 'ai-high-error-rate',
        name: 'High AI Service Error Rate',
        description: 'AI service error rate exceeds threshold',
        severity: 'high',
        conditions: [
          {
            metric: 'ai_requests_failed_total',
            operator: 'gt',
            threshold: 5,
            timeWindow: 300,
            aggregation: 'sum'
          }
        ],
        cooldown: 300,
        enabled: true,
        channels: ['email', 'slack']
      },
      {
        id: 'ai-high-cost',
        name: 'High AI Service Cost',
        description: 'AI service cost exceeds threshold',
        severity: 'medium',
        conditions: [
          {
            metric: 'ai_cost_total',
            operator: 'gt',
            threshold: 100, // $100
            timeWindow: 3600, // 1 hora
            aggregation: 'sum'
          }
        ],
        cooldown: 3600,
        enabled: true,
        channels: ['email', 'slack']
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Default alert rules initialized', { count: defaultRules.length });
  }

  private async initializeDefaultChannels(): Promise<void> {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'email',
        name: 'Email Notifications',
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
          from: process.env.ALERT_EMAIL_FROM || 'alerts@adeptify.es',
          to: process.env.ALERT_EMAIL_TO || 'admin@adeptify.es'
        },
        enabled: true
      },
      {
        id: 'slack',
        name: 'Slack Notifications',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: process.env.SLACK_USERNAME || 'MCP Orchestrator Alerts'
        },
        enabled: true
      },
      {
        id: 'webhook',
        name: 'Webhook Notifications',
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL || '',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
          }
        },
        enabled: false
      },
      {
        id: 'pagerduty',
        name: 'PagerDuty Notifications',
        type: 'pagerduty',
        config: {
          apiKey: process.env.PAGERDUTY_API_KEY || '',
          serviceId: process.env.PAGERDUTY_SERVICE_ID || ''
        },
        enabled: false
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });

    logger.info('Default notification channels initialized', { count: defaultChannels.length });
  }

  public async start(): Promise<void> {
    try {
      await this.redis.connect();
      
      // Iniciar verificación de alertas cada 30 segundos
      this.checkInterval = setInterval(async () => {
        await this.checkAlerts();
      }, 30000);

      logger.info('Alerts service started successfully');
    } catch (error) {
      logger.error('Failed to start alerts service', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    try {
      await this.redis.disconnect();
      logger.info('Alerts service stopped successfully');
    } catch (error) {
      logger.error('Error stopping alerts service', { error });
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      for (const [ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;

        const shouldTrigger = await this.evaluateRule(rule);
        const lastAlertTime = await this.getLastAlertTime(ruleId);

        if (shouldTrigger && (!lastAlertTime || Date.now() - lastAlertTime > rule.cooldown * 1000)) {
          await this.triggerAlert(rule);
        } else if (!shouldTrigger && this.activeAlerts.has(ruleId)) {
          await this.resolveAlert(ruleId);
        }
      }
    } catch (error) {
      logger.error('Error checking alerts', { error });
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    try {
      for (const condition of rule.conditions) {
        const value = await this.getMetricValue(
          condition.metric,
          Date.now() - condition.timeWindow * 1000,
          Date.now(),
          condition.aggregation
        );

        let shouldTrigger = false;
        switch (condition.operator) {
          case 'gt':
            shouldTrigger = value > condition.threshold;
            break;
          case 'gte':
            shouldTrigger = value >= condition.threshold;
            break;
          case 'lt':
            shouldTrigger = value < condition.threshold;
            break;
          case 'lte':
            shouldTrigger = value <= condition.threshold;
            break;
          case 'eq':
            shouldTrigger = value === condition.threshold;
            break;
          case 'ne':
            shouldTrigger = value !== condition.threshold;
            break;
        }

        if (!shouldTrigger) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error evaluating rule', { ruleId: rule.id, error });
      return false;
    }
  }

  private async getMetricValue(metricName: string, startTime: number, endTime: number, aggregation: string): Promise<number> {
    // En una implementación real, esto consultaría Prometheus o la base de datos de métricas
    // Por ahora, simulamos valores basados en las métricas actuales
    const metricsData = await metrics.getMetrics();
    
    // Simulación simple - en producción esto sería una consulta real a Prometheus
    const randomValue = Math.random() * 100;
    
    switch (metricName) {
      case 'mcp_requests_failed_total':
        return randomValue * 0.1; // 10% de fallos
      case 'mcp_request_duration_seconds':
        return randomValue * 0.1; // 0-10 segundos
      case 'mcp_services_unhealthy':
        return Math.floor(randomValue * 0.2); // 0-20 servicios
      case 'routing_requests_failed_total':
        return randomValue * 0.05; // 5% de fallos
      case 'routing_request_duration_seconds':
        return randomValue * 0.05; // 0-5 segundos
      case 'context_operations_failed_total':
        return randomValue * 0.08; // 8% de fallos
      case 'context_operation_duration_seconds':
        return randomValue * 0.1; // 0-10 segundos
      case 'agent_operations_failed_total':
        return randomValue * 0.06; // 6% de fallos
      case 'agent_tasks_failed_total':
        return randomValue * 0.04; // 4% de fallos
      case 'workflow_operations_failed_total':
        return randomValue * 0.03; // 3% de fallos
      case 'workflow_operation_duration_seconds':
        return randomValue * 0.5; // 0-50 segundos
      case 'memory_usage_bytes':
        return 500000000 + randomValue * 500000000; // 500MB - 1GB
      case 'cpu_usage_percent':
        return randomValue; // 0-100%
      case 'circuit_breaker_trips_total':
        return Math.floor(randomValue * 0.1); // 0-10 trips
      case 'ai_requests_failed_total':
        return randomValue * 0.07; // 7% de fallos
      case 'ai_cost_total':
        return randomValue * 2; // 0-200$
      default:
        return randomValue;
    }
  }

  private async getLastAlertTime(ruleId: string): Promise<number | null> {
    try {
      const lastAlertTime = await this.redis.get(`alert:last:${ruleId}`);
      return lastAlertTime ? parseInt(lastAlertTime) : null;
    } catch (error) {
      logger.error('Error getting last alert time', { ruleId, error });
      return null;
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    try {
      const alert: Alert = {
        id: `${rule.id}_${Date.now()}`,
        ruleId: rule.id,
        message: `${rule.name}: ${rule.description}`,
        severity: rule.severity,
        timestamp: Date.now(),
        metadata: rule.metadata
      };

      this.activeAlerts.set(rule.id, alert);

      // Guardar tiempo del último alerta
      await this.redis.set(`alert:last:${rule.id}`, Date.now().toString(), 3600);

      // Enviar notificaciones
      await this.sendNotifications(alert, rule);

      logger.warn('Alert triggered', {
        ruleId: rule.id,
        severity: rule.severity,
        message: alert.message
      });

      // Registrar métrica de alerta
      metrics.recordOrchestrationError(`alert_triggered:${rule.id}`, {
        ruleId: rule.id,
        severity: rule.severity
      });

    } catch (error) {
      logger.error('Error triggering alert', { ruleId: rule.id, error });
    }
  }

  private async resolveAlert(ruleId: string): Promise<void> {
    try {
      const alert = this.activeAlerts.get(ruleId);
      if (alert) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        
        // Enviar notificación de resolución
        const rule = this.rules.get(ruleId);
        if (rule) {
          const resolutionMessage = `Alert resolved: ${rule.name}`;
          await this.sendNotifications({
            ...alert,
            message: resolutionMessage
          }, rule);
        }

        this.activeAlerts.delete(ruleId);

        logger.info('Alert resolved', { ruleId });

        // Registrar métrica de resolución
        metrics.recordOrchestrationError(`alert_resolved:${ruleId}`, {
          ruleId
        });
      }
    } catch (error) {
      logger.error('Error resolving alert', { ruleId, error });
    }
  }

  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    try {
      for (const channelId of rule.channels) {
        const channel = this.channels.get(channelId);
        if (channel && channel.enabled) {
          await this.sendNotification(alert, rule, channel);
        }
      }
    } catch (error) {
      logger.error('Error sending notifications', { alertId: alert.id, error });
    }
  }

  private async sendNotification(alert: Alert, rule: AlertRule, channel: NotificationChannel): Promise<void> {
    try {
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
        case 'pagerduty':
          await this.sendPagerDutyNotification(message, channel.config);
          break;
      }

      logger.info('Notification sent', {
        alertId: alert.id,
        channelId: channel.id,
        channelType: channel.type
      });

    } catch (error) {
      logger.error('Error sending notification', {
        alertId: alert.id,
        channelId: channel.id,
        error
      });
    }
  }

  private formatAlertMessage(alert: Alert, rule: AlertRule): string {
    const timestamp = new Date(alert.timestamp).toISOString();
    const severity = alert.severity.toUpperCase();
    
    return `🚨 [${severity}] ${rule.name}
    
📝 Description: ${rule.description}
⏰ Time: ${timestamp}
🔗 Rule ID: ${rule.id}
📊 Severity: ${severity}

${alert.message}

---
MCP Orchestrator Alert System
gei.adeptify.es`;
  }

  private async sendEmailNotification(message: string, config: any): Promise<void> {
    // Implementación de envío de email
    logger.info('Email notification would be sent', { message: message.substring(0, 100) + '...' });
  }

  private async sendSlackNotification(message: string, config: any): Promise<void> {
    // Implementación de envío a Slack
    logger.info('Slack notification would be sent', { message: message.substring(0, 100) + '...' });
  }

  private async sendWebhookNotification(message: string, config: any): Promise<void> {
    // Implementación de webhook
    logger.info('Webhook notification would be sent', { message: message.substring(0, 100) + '...' });
  }

  private async sendPagerDutyNotification(message: string, config: any): Promise<void> {
    // Implementación de PagerDuty
    logger.info('PagerDuty notification would be sent', { message: message.substring(0, 100) + '...' });
  }

  // Métodos públicos para gestión de reglas y canales
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id });
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('Alert rule removed', { ruleId });
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.info('Notification channel added', { channelId: channel.id });
  }

  public removeChannel(channelId: string): void {
    this.channels.delete(channelId);
    logger.info('Notification channel removed', { channelId });
  }

  public getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public async triggerManualAlert(ruleId: string, message?: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const alert: Alert = {
      id: `manual_${ruleId}_${Date.now()}`,
      ruleId,
      message: message || rule.description,
      severity: rule.severity,
      timestamp: Date.now(),
      metadata: { manual: true }
    };

    await this.sendNotifications(alert, rule);
    logger.info('Manual alert triggered', { ruleId, message });
  }
}

export const alerts = AlertsService.getInstance();