import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';

export interface MetricsConfig {
  enabled: boolean;
  port: number;
  path: string;
  collectDefaultMetrics: boolean;
}

export class MetricsService {
  private static instance: MetricsService;
  private config: MetricsConfig;

  // Métricas de HTTP
  public httpRequestsTotal: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpRequestsInProgress: Gauge<string>;
  public httpRequestsFailed: Counter<string>;

  // Métricas de autenticación
  public authAttemptsTotal: Counter<string>;
  public authSuccessTotal: Counter<string>;
  public authFailureTotal: Counter<string>;
  public authTokenValidations: Counter<string>;
  public authTokenExpirations: Counter<string>;

  // Métricas de usuarios
  public userRegistrations: Counter<string>;
  public userLogins: Counter<string>;
  public userLogouts: Counter<string>;
  public userProfileUpdates: Counter<string>;
  public userDeletions: Counter<string>;
  public activeUsers: Gauge<string>;

  // Métricas de base de datos
  public dbConnections: Gauge<string>;
  public dbQueryDuration: Histogram<string>;
  public dbErrors: Counter<string>;

  // Métricas de Redis
  public redisConnections: Gauge<string>;
  public redisOperations: Counter<string>;
  public redisErrors: Counter<string>;

  // Métricas de seguridad
  public securityEvents: Counter<string>;
  public rateLimitHits: Counter<string>;
  public suspiciousActivities: Counter<string>;

  // Métricas de rendimiento
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;
  public responseTime: Histogram<string>;

  private constructor(config: MetricsConfig) {
    this.config = config;
    this.initializeMetrics();
  }

  public static getInstance(config?: MetricsConfig): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService(config || {
        enabled: true,
        port: 9090,
        path: '/metrics',
        collectDefaultMetrics: true
      });
    }
    return MetricsService.instance;
  }

  private initializeMetrics(): void {
    if (!this.config.enabled) return;

    // Configurar métricas por defecto de Node.js
    if (this.config.collectDefaultMetrics) {
      collectDefaultMetrics({ register });
    }

    // Métricas de HTTP
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service']
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently in progress',
      labelNames: ['method', 'route', 'service']
    });

    this.httpRequestsFailed = new Counter({
      name: 'http_requests_failed_total',
      help: 'Total number of failed HTTP requests',
      labelNames: ['method', 'route', 'error_type', 'service']
    });

    // Métricas de autenticación
    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'success', 'service']
    });

    this.authSuccessTotal = new Counter({
      name: 'auth_success_total',
      help: 'Total number of successful authentications',
      labelNames: ['method', 'service']
    });

    this.authFailureTotal = new Counter({
      name: 'auth_failure_total',
      help: 'Total number of failed authentications',
      labelNames: ['method', 'reason', 'service']
    });

    this.authTokenValidations = new Counter({
      name: 'auth_token_validations_total',
      help: 'Total number of token validations',
      labelNames: ['valid', 'service']
    });

    this.authTokenExpirations = new Counter({
      name: 'auth_token_expirations_total',
      help: 'Total number of token expirations',
      labelNames: ['service']
    });

    // Métricas de usuarios
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['service']
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['service']
    });

    this.userLogouts = new Counter({
      name: 'user_logouts_total',
      help: 'Total number of user logouts',
      labelNames: ['service']
    });

    this.userProfileUpdates = new Counter({
      name: 'user_profile_updates_total',
      help: 'Total number of user profile updates',
      labelNames: ['service']
    });

    this.userDeletions = new Counter({
      name: 'user_deletions_total',
      help: 'Total number of user deletions',
      labelNames: ['service']
    });

    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
      labelNames: ['service']
    });

    // Métricas de base de datos
    this.dbConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      labelNames: ['service']
    });

    this.dbQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.dbErrors = new Counter({
      name: 'database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation', 'error_type', 'service']
    });

    // Métricas de Redis
    this.redisConnections = new Gauge({
      name: 'redis_connections',
      help: 'Number of active Redis connections',
      labelNames: ['service']
    });

    this.redisOperations = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'service']
    });

    this.redisErrors = new Counter({
      name: 'redis_errors_total',
      help: 'Total number of Redis errors',
      labelNames: ['operation', 'error_type', 'service']
    });

    // Métricas de seguridad
    this.securityEvents = new Counter({
      name: 'security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'service']
    });

    this.rateLimitHits = new Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'ip', 'service']
    });

    this.suspiciousActivities = new Counter({
      name: 'suspicious_activities_total',
      help: 'Total number of suspicious activities detected',
      labelNames: ['activity_type', 'ip', 'service']
    });

    // Métricas de rendimiento
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type', 'service']
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['service']
    });

    this.responseTime = new Histogram({
      name: 'response_time_seconds',
      help: 'Response time in seconds',
      labelNames: ['endpoint', 'method', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    // Registrar todas las métricas
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestsInProgress);
    register.registerMetric(this.httpRequestsFailed);
    register.registerMetric(this.authAttemptsTotal);
    register.registerMetric(this.authSuccessTotal);
    register.registerMetric(this.authFailureTotal);
    register.registerMetric(this.authTokenValidations);
    register.registerMetric(this.authTokenExpirations);
    register.registerMetric(this.userRegistrations);
    register.registerMetric(this.userLogins);
    register.registerMetric(this.userLogouts);
    register.registerMetric(this.userProfileUpdates);
    register.registerMetric(this.userDeletions);
    register.registerMetric(this.activeUsers);
    register.registerMetric(this.dbConnections);
    register.registerMetric(this.dbQueryDuration);
    register.registerMetric(this.dbErrors);
    register.registerMetric(this.redisConnections);
    register.registerMetric(this.redisOperations);
    register.registerMetric(this.redisErrors);
    register.registerMetric(this.securityEvents);
    register.registerMetric(this.rateLimitHits);
    register.registerMetric(this.suspiciousActivities);
    register.registerMetric(this.memoryUsage);
    register.registerMetric(this.cpuUsage);
    register.registerMetric(this.responseTime);
  }

  // Métodos para registrar métricas de HTTP
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      service: 'user-service'
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration / 1000); // Convertir a segundos
  }

  public recordHttpRequestStart(method: string, route: string): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      route,
      service: 'user-service'
    };

    this.httpRequestsInProgress.inc(labels);
  }

  public recordHttpRequestEnd(method: string, route: string): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      route,
      service: 'user-service'
    };

    this.httpRequestsInProgress.dec(labels);
  }

  public recordHttpRequestFailure(method: string, route: string, errorType: string): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      route,
      error_type: errorType,
      service: 'user-service'
    };

    this.httpRequestsFailed.inc(labels);
  }

  // Métodos para registrar métricas de autenticación
  public recordAuthAttempt(method: string, success: boolean): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      success: success.toString(),
      service: 'user-service'
    };

    this.authAttemptsTotal.inc(labels);
  }

  public recordAuthSuccess(method: string): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      service: 'user-service'
    };

    this.authSuccessTotal.inc(labels);
  }

  public recordAuthFailure(method: string, reason: string): void {
    if (!this.config.enabled) return;

    const labels = {
      method,
      reason,
      service: 'user-service'
    };

    this.authFailureTotal.inc(labels);
  }

  public recordTokenValidation(valid: boolean): void {
    if (!this.config.enabled) return;

    const labels = {
      valid: valid.toString(),
      service: 'user-service'
    };

    this.authTokenValidations.inc(labels);
  }

  public recordTokenExpiration(): void {
    if (!this.config.enabled) return;

    const labels = {
      service: 'user-service'
    };

    this.authTokenExpirations.inc(labels);
  }

  // Métodos para registrar métricas de usuarios
  public recordUserRegistration(): void {
    if (!this.config.enabled) return;

    this.userRegistrations.inc({ service: 'user-service' });
  }

  public recordUserLogin(): void {
    if (!this.config.enabled) return;

    this.userLogins.inc({ service: 'user-service' });
  }

  public recordUserLogout(): void {
    if (!this.config.enabled) return;

    this.userLogouts.inc({ service: 'user-service' });
  }

  public recordUserProfileUpdate(): void {
    if (!this.config.enabled) return;

    this.userProfileUpdates.inc({ service: 'user-service' });
  }

  public recordUserDeletion(): void {
    if (!this.config.enabled) return;

    this.userDeletions.inc({ service: 'user-service' });
  }

  public setActiveUsers(count: number): void {
    if (!this.config.enabled) return;

    this.activeUsers.set({ service: 'user-service' }, count);
  }

  // Métodos para registrar métricas de base de datos
  public setDbConnections(count: number): void {
    if (!this.config.enabled) return;

    this.dbConnections.set({ service: 'user-service' }, count);
  }

  public recordDbQuery(operation: string, table: string, duration: number): void {
    if (!this.config.enabled) return;

    const labels = {
      operation,
      table,
      service: 'user-service'
    };

    this.dbQueryDuration.observe(labels, duration / 1000); // Convertir a segundos
  }

  public recordDbError(operation: string, errorType: string): void {
    if (!this.config.enabled) return;

    const labels = {
      operation,
      error_type: errorType,
      service: 'user-service'
    };

    this.dbErrors.inc(labels);
  }

  // Métodos para registrar métricas de Redis
  public setRedisConnections(count: number): void {
    if (!this.config.enabled) return;

    this.redisConnections.set({ service: 'user-service' }, count);
  }

  public recordRedisOperation(operation: string): void {
    if (!this.config.enabled) return;

    const labels = {
      operation,
      service: 'user-service'
    };

    this.redisOperations.inc(labels);
  }

  public recordRedisError(operation: string, errorType: string): void {
    if (!this.config.enabled) return;

    const labels = {
      operation,
      error_type: errorType,
      service: 'user-service'
    };

    this.redisErrors.inc(labels);
  }

  // Métodos para registrar métricas de seguridad
  public recordSecurityEvent(eventType: string, severity: string): void {
    if (!this.config.enabled) return;

    const labels = {
      event_type: eventType,
      severity,
      service: 'user-service'
    };

    this.securityEvents.inc(labels);
  }

  public recordRateLimitHit(endpoint: string, ip: string): void {
    if (!this.config.enabled) return;

    const labels = {
      endpoint,
      ip,
      service: 'user-service'
    };

    this.rateLimitHits.inc(labels);
  }

  public recordSuspiciousActivity(activityType: string, ip: string): void {
    if (!this.config.enabled) return;

    const labels = {
      activity_type: activityType,
      ip,
      service: 'user-service'
    };

    this.suspiciousActivities.inc(labels);
  }

  // Métodos para registrar métricas de rendimiento
  public updateMemoryUsage(): void {
    if (!this.config.enabled) return;

    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss', service: 'user-service' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal', service: 'user-service' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed', service: 'user-service' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external', service: 'user-service' }, memUsage.external);
  }

  public recordResponseTime(endpoint: string, method: string, duration: number): void {
    if (!this.config.enabled) return;

    const labels = {
      endpoint,
      method,
      service: 'user-service'
    };

    this.responseTime.observe(labels, duration / 1000); // Convertir a segundos
  }

  // Método para obtener métricas en formato Prometheus
  public async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  // Método para limpiar métricas
  public clearMetrics(): void {
    register.clear();
  }
}

// Exportar instancia singleton
export const metrics = MetricsService.getInstance();