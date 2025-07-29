# Sistema de Monitoreo y Logging - User Service

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Servicios de Monitoreo](#servicios-de-monitoreo)
4. [Configuración](#configuración)
5. [Endpoints de Monitoreo](#endpoints-de-monitoreo)
6. [Métricas y Alertas](#métricas-y-alertas)
7. [Logging Avanzado](#logging-avanzado)
8. [Integración con ELK Stack](#integración-con-elk-stack)
9. [Prometheus y Grafana](#prometheus-y-grafana)
10. [Scripts y Utilidades](#scripts-y-utilidades)
11. [Troubleshooting](#troubleshooting)
12. [Mejores Prácticas](#mejores-prácticas)

## 🎯 Visión General

El sistema de monitoreo del User Service proporciona una solución completa para el observabilidad de la aplicación, incluyendo:

- **Logging estructurado** con Winston y integración ELK Stack
- **Métricas de Prometheus** para monitoreo de rendimiento
- **Sistema de alertas automáticas** con múltiples canales de notificación
- **Health checks** y verificación de dependencias
- **Auditoría de seguridad** y detección de amenazas
- **Dashboards de monitoreo** integrados

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Service  │    │   Monitoring    │    │   External      │
│                 │    │   Middleware    │    │   Services      │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Logging     │ │◄──►│ │ Request     │ │    │ │ Prometheus  │ │
│ │ Service     │ │    │ │ Tracking    │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Metrics     │ │◄──►│ │ Performance │ │    │ │ Grafana     │ │
│ │ Service     │ │    │ │ Monitoring  │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Alerts      │ │◄──►│ │ Audit       │ │    │ │ Elasticsearch│ │
│ │ Service     │ │    │ │ Logging     │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    │ ┌─────────────┐ │
                                              │ │ Kibana      │ │
                                              │ │             │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

## 🔧 Servicios de Monitoreo

### 1. LoggingService

Servicio de logging avanzado con Winston que proporciona:

- **Logging estructurado** con contexto completo
- **Múltiples transportes** (consola, archivo, Elasticsearch)
- **Logs específicos por categoría** (auth, security, performance, audit)
- **Sanitización automática** de datos sensibles
- **Rotación de archivos** y gestión de logs

```typescript
// Ejemplo de uso
logger.info('Usuario autenticado', {
  userId: 'user-123',
  ip: '192.168.1.1',
  endpoint: '/auth/login',
  userAgent: 'Mozilla/5.0...'
});

logger.logAuth('login', {
  userId: 'user-123',
  success: true,
  ip: '192.168.1.1'
});
```

### 2. MetricsService

Servicio de métricas con Prometheus que registra:

- **Métricas HTTP**: requests, duración, errores
- **Métricas de autenticación**: intentos, éxitos, fallos
- **Métricas de usuarios**: registros, logins, actualizaciones
- **Métricas de base de datos**: conexiones, queries, errores
- **Métricas de Redis**: operaciones, errores
- **Métricas de seguridad**: eventos, rate limiting
- **Métricas de rendimiento**: memoria, CPU, tiempo de respuesta

```typescript
// Ejemplo de uso
metrics.recordHttpRequest('GET', '/api/users', 200, 150);
metrics.recordAuthSuccess('login');
metrics.recordSecurityEvent('brute_force', 'high');
```

### 3. AlertsService

Sistema de alertas automáticas con:

- **Reglas configurables** para diferentes métricas
- **Múltiples canales** de notificación (email, Slack, webhook)
- **Cooldown y escalado** de alertas
- **Alertas manuales** para testing
- **Gestión de alertas activas** y resueltas

```typescript
// Ejemplo de regla de alerta
{
  id: 'high-error-rate',
  name: 'High Error Rate',
  description: 'Error rate exceeds 5% in the last 5 minutes',
  condition: {
    metric: 'http_requests_failed_total',
    operator: 'gt',
    threshold: 5,
    window: 300,
    aggregation: 'sum'
  },
  severity: 'high',
  enabled: true,
  cooldown: 300,
  notificationChannels: ['email', 'slack']
}
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Logging
LOG_LEVEL=info
SERVICE_NAME=user-service

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password

# Alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@adeptify.es
SMTP_PASS=password
ALERT_EMAIL_RECIPIENTS=admin@adeptify.es,ops@adeptify.es

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts
SLACK_USERNAME=User Service Alerts

ALERT_WEBHOOK_URL=https://api.adeptify.es/webhooks/alerts
ALERT_WEBHOOK_TOKEN=secret-token

# Monitoreo
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
```

### Configuraciones por Entorno

#### Desarrollo
```typescript
const DEVELOPMENT_CONFIG = {
  enabled: true,
  logRequests: true,
  logResponses: true,
  logErrors: true,
  recordMetrics: true,
  generateRequestId: true,
  logRequestBody: true,
  logResponseBody: true,
  sensitiveFields: ['password', 'token', 'secret', 'key']
};
```

#### Producción
```typescript
const PRODUCTION_CONFIG = {
  enabled: true,
  logRequests: true,
  logResponses: false, // Solo errores
  logErrors: true,
  recordMetrics: true,
  generateRequestId: true,
  logRequestBody: false,
  logResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
};
```

## 🌐 Endpoints de Monitoreo

### Health Checks

#### GET /health
Health check básico del servicio.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 10485760,
    "external": 5242880
  },
  "pid": 12345,
  "version": "1.0.0",
  "environment": "production",
  "service": "user-service"
}
```

#### GET /health/detailed
Health check detallado con verificación de dependencias.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": { ... },
  "cpu": { "user": 1000, "system": 500 },
  "pid": 12345,
  "version": "1.0.0",
  "environment": "production",
  "service": "user-service",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "external": "ok"
  }
}
```

### Métricas

#### GET /monitoring/metrics
Métricas en formato Prometheus.

```prometheus
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status_code="200",service="user-service"} 1250

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",service="user-service",le="0.1"} 1000
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",service="user-service",le="0.3"} 1200
http_request_duration_seconds_bucket{method="GET",route="/api/users",status_code="200",service="user-service",le="0.5"} 1250
```

#### GET /monitoring/metrics/json
Métricas en formato JSON.

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "user-service",
  "metrics": {
    "http_requests_total": 1250,
    "http_request_duration_seconds_sum": 375.5,
    "memory_usage_bytes": 52428800,
    "auth_success_total": 890,
    "auth_failure_total": 45
  }
}
```

### Sistema

#### GET /monitoring/system/info
Información del sistema.

```json
{
  "platform": "linux",
  "arch": "x64",
  "nodeVersion": "v18.17.0",
  "pid": 12345,
  "uptime": 3600,
  "memory": { ... },
  "cpu": { ... },
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001",
    "SERVICE_NAME": "user-service"
  }
}
```

### Alertas

#### GET /monitoring/alerts/status
Estado de las alertas (requiere autenticación de admin).

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeAlerts": 2,
  "totalRules": 7,
  "enabledRules": 6,
  "channels": 3,
  "enabledChannels": 2,
  "alerts": [
    {
      "id": "high-error-rate-1705312200000",
      "ruleId": "high-error-rate",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "severity": "high",
      "message": "Error rate exceeds 5% in the last 5 minutes",
      "status": "active"
    }
  ],
  "rules": [ ... ],
  "channels": [ ... ]
}
```

#### POST /monitoring/alerts/trigger
Disparar alerta manual (requiere autenticación de admin).

```json
{
  "ruleId": "high-error-rate",
  "message": "Test alert triggered manually"
}
```

### Rendimiento

#### GET /monitoring/performance
Estadísticas de rendimiento (requiere autenticación de admin).

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "period": "1h",
  "metrics": {
    "requestsPerSecond": 45.2,
    "averageResponseTime": 125.5,
    "errorRate": 2.1,
    "memoryUsage": 0.65,
    "cpuUsage": 23.4
  }
}
```

## 📊 Métricas y Alertas

### Métricas Principales

#### HTTP Metrics
- `http_requests_total`: Total de requests HTTP
- `http_request_duration_seconds`: Duración de requests
- `http_requests_in_progress`: Requests en progreso
- `http_requests_failed_total`: Requests fallidos

#### Authentication Metrics
- `auth_attempts_total`: Intentos de autenticación
- `auth_success_total`: Autenticaciones exitosas
- `auth_failure_total`: Autenticaciones fallidas
- `auth_token_validations_total`: Validaciones de tokens
- `auth_token_expirations_total`: Expiraciones de tokens

#### User Metrics
- `user_registrations_total`: Registros de usuarios
- `user_logins_total`: Logins de usuarios
- `user_logouts_total`: Logouts de usuarios
- `user_profile_updates_total`: Actualizaciones de perfil
- `user_deletions_total`: Eliminaciones de usuarios
- `active_users`: Usuarios activos

#### Database Metrics
- `database_connections`: Conexiones de base de datos
- `database_query_duration_seconds`: Duración de queries
- `database_errors_total`: Errores de base de datos

#### Security Metrics
- `security_events_total`: Eventos de seguridad
- `rate_limit_hits_total`: Hits de rate limiting
- `suspicious_activities_total`: Actividades sospechosas

### Reglas de Alerta Predefinidas

1. **High Error Rate**: Error rate > 5% en 5 minutos
2. **High Response Time**: Tiempo de respuesta promedio > 2 segundos
3. **High Memory Usage**: Uso de memoria > 80%
4. **Database Connection Issues**: Errores de DB > 10 en 5 minutos
5. **Redis Connection Issues**: Errores de Redis > 5 en 5 minutos
6. **Security Breach Attempt**: Eventos de seguridad > 20 en 5 minutos
7. **Rate Limit Abuse**: Rate limit hits > 50 en 5 minutos

## 📝 Logging Avanzado

### Estructura de Logs

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "AUTH: login",
  "service": "user-service",
  "hostname": "user-service-1",
  "environment": "production",
  "userId": "user-123",
  "requestId": "req-456",
  "sessionId": "sess-789",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/auth/login",
  "method": "POST",
  "statusCode": 200,
  "responseTime": 150,
  "category": "authentication",
  "metadata": {
    "success": true,
    "loginMethod": "email"
  }
}
```

### Categorías de Logs

- **authentication**: Logs de autenticación y autorización
- **user_operation**: Operaciones de usuarios
- **security**: Eventos de seguridad
- **performance**: Métricas de rendimiento
- **audit**: Auditoría de acciones sensibles

### Sanitización Automática

Los logs automáticamente sanitizan campos sensibles:
- `password`
- `token`
- `secret`
- `key`
- `authorization`
- `cookie`
- `x-api-key`

## 🔍 Integración con ELK Stack

### Configuración de Elasticsearch

```typescript
// Configuración del transporte Elasticsearch
new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
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
        ip: { type: 'ip' },
        endpoint: { type: 'keyword' },
        method: { type: 'keyword' },
        statusCode: { type: 'integer' },
        responseTime: { type: 'float' }
      }
    }
  }
})
```

### Kibana Dashboards

Dashboards recomendados para Kibana:

1. **User Service Overview**
   - Requests por minuto
   - Tiempo de respuesta promedio
   - Tasa de error
   - Usuarios activos

2. **Security Monitoring**
   - Eventos de seguridad por tipo
   - Intentos de autenticación fallidos
   - Actividades sospechosas
   - Rate limiting hits

3. **Performance Analysis**
   - Uso de memoria y CPU
   - Duración de queries de base de datos
   - Operaciones de Redis
   - Requests lentos

## 📈 Prometheus y Grafana

### Configuración de Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3001']
    metrics_path: '/monitoring/metrics'
    scrape_interval: 10s
```

### Dashboards de Grafana

#### Dashboard Principal
- **Panel 1**: Requests por segundo (Counter)
- **Panel 2**: Tiempo de respuesta promedio (Histogram)
- **Panel 3**: Tasa de error (Counter)
- **Panel 4**: Uso de memoria (Gauge)
- **Panel 5**: Conexiones de base de datos (Gauge)

#### Dashboard de Seguridad
- **Panel 1**: Intentos de autenticación (Counter)
- **Panel 2**: Eventos de seguridad por tipo (Counter)
- **Panel 3**: Rate limiting hits (Counter)
- **Panel 4**: Actividades sospechosas (Counter)

### Alertas de Prometheus

```yaml
# prometheus-rules.yml
groups:
  - name: user-service
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_failed_total[5m]) > 0.05
        for: 2m
        labels:
          severity: high
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 2m
        labels:
          severity: medium
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
```

## 🛠️ Scripts y Utilidades

### Scripts de Monitoreo

```bash
# Health check
npm run monitoring:health

# Métricas
npm run monitoring:metrics

# Estado de alertas
npm run monitoring:alerts

# Logs en tiempo real
npm run monitoring:logs

# Logs de errores
npm run monitoring:errors

# Información del sistema
npm run monitoring:system

# Estado de dependencias
npm run monitoring:dependencies

# Estadísticas de rendimiento
npm run monitoring:performance
```

### Scripts de Mantenimiento

```bash
# Limpiar logs
npm run logs:clear

# Archivar logs
npm run logs:archive

# Exportar métricas
npm run metrics:export

# Probar alertas
npm run alerts:test

# Verificar métricas de Prometheus
npm run prometheus:test
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Logs no aparecen en Elasticsearch
```bash
# Verificar conexión
curl -X GET "http://localhost:9200/_cluster/health"

# Verificar índices
curl -X GET "http://localhost:9200/_cat/indices/logs-*"

# Verificar configuración
echo $ELASTICSEARCH_URL
echo $ELASTICSEARCH_USERNAME
```

#### 2. Métricas no se registran
```bash
# Verificar endpoint de métricas
curl http://localhost:3001/monitoring/metrics

# Verificar configuración
echo $METRICS_ENABLED

# Verificar logs del servicio
npm run monitoring:logs
```

#### 3. Alertas no se disparan
```bash
# Verificar estado de alertas
npm run monitoring:alerts

# Probar alerta manual
npm run alerts:test

# Verificar configuración de canales
echo $SLACK_WEBHOOK_URL
echo $SMTP_HOST
```

#### 4. Alto uso de memoria
```bash
# Verificar métricas de memoria
curl http://localhost:3001/monitoring/metrics | grep memory_usage

# Verificar logs de performance
npm run monitoring:logs | grep PERF

# Verificar configuración de Winston
echo $LOG_LEVEL
```

### Logs de Debug

Para habilitar logs de debug:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npm run dev
```

### Monitoreo de Recursos

```bash
# Uso de CPU y memoria
top -p $(pgrep -f "user-service")

# Logs del sistema
journalctl -u user-service -f

# Conexiones de red
netstat -tulpn | grep :3001

# Archivos abiertos
lsof -p $(pgrep -f "user-service")
```

## 📋 Mejores Prácticas

### 1. Configuración de Logs

- **Usar niveles apropiados**: `error`, `warn`, `info`, `debug`
- **Incluir contexto relevante**: userId, requestId, endpoint
- **Sanitizar datos sensibles**: passwords, tokens, keys
- **Rotar logs regularmente**: evitar archivos muy grandes
- **Monitorear uso de disco**: logs pueden crecer rápidamente

### 2. Métricas

- **Usar nombres descriptivos**: `http_requests_total` vs `requests`
- **Incluir labels relevantes**: method, route, status_code
- **Evitar cardinalidad alta**: no usar valores únicos como labels
- **Documentar métricas**: incluir HELP y TYPE en Prometheus
- **Monitorear métricas de métricas**: uso de memoria del sistema de métricas

### 3. Alertas

- **Configurar umbrales apropiados**: basados en observación histórica
- **Usar cooldowns**: evitar spam de alertas
- **Escalar alertas**: diferentes canales según severidad
- **Probar alertas**: usar alertas manuales para verificar
- **Documentar runbooks**: qué hacer cuando se dispara una alerta

### 4. Monitoreo

- **Health checks externos**: verificar desde fuera del cluster
- **Monitoreo de dependencias**: DB, Redis, servicios externos
- **Dashboards operacionales**: métricas clave visibles 24/7
- **Retención de datos**: configurar TTL apropiado para logs y métricas
- **Backup de configuración**: versionar configuraciones de monitoreo

### 5. Seguridad

- **Autenticación en endpoints**: proteger endpoints de admin
- **Rate limiting**: evitar abuso de endpoints de monitoreo
- **Sanitización**: no exponer información sensible en logs
- **Auditoría**: registrar acceso a endpoints de monitoreo
- **Rotación de credenciales**: cambiar passwords regularmente

## 🚀 Próximos Pasos

1. **Integración con Jaeger**: para distributed tracing
2. **Métricas personalizadas**: específicas del dominio de usuarios
3. **Alertas inteligentes**: basadas en machine learning
4. **Dashboards automáticos**: generación automática de dashboards
5. **Análisis de logs**: detección de patrones y anomalías
6. **SLA monitoring**: monitoreo de acuerdos de nivel de servicio
7. **Capacity planning**: predicción de uso de recursos
8. **Automated remediation**: acciones automáticas ante alertas

---

**Nota**: Este sistema de monitoreo está diseñado para escalar con la aplicación y proporcionar visibilidad completa del estado y rendimiento del User Service en producción.