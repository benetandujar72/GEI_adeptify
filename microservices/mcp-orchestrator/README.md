# MCP Orchestrator Service

## 🎯 Descripción

El **MCP Orchestrator Service** es el componente central de orquestación y enrutamiento para la plataforma EduAI. Actúa como el cerebro del sistema, coordinando la comunicación entre microservicios, gestionando contextos, coordinando agentes AI y ejecutando workflows complejos.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Orchestrator                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Router    │  │   Context   │  │    Agent    │        │
│  │  Manager    │  │  Manager    │  │ Coordinator │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Workflow   │  │ Monitoring  │  │   Alerts    │        │
│  │  Engine     │  │   System    │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Redis     │  │   Metrics   │  │   Logging   │        │
│  │   Cache     │  │  Service    │  │  Service    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Características Principales

### 🔄 **Orquestación MCP**
- Enrutamiento inteligente de requests MCP
- Gestión de servicios registrados
- Balanceo de carga y failover
- Circuit breaker patterns

### 🧠 **Gestión de Contextos**
- Creación y gestión de contextos de sesión
- Persistencia de estado entre requests
- Búsqueda y filtrado avanzado
- Gestión de metadatos

### 🤖 **Coordinación de Agentes AI**
- Registro y gestión de agentes AI
- Distribución de tareas
- Monitoreo de rendimiento
- Coordinación multi-agente

### 🔄 **Motor de Workflows**
- Definición de workflows complejos
- Ejecución secuencial y paralela
- Gestión de dependencias
- Rollback automático

### 📊 **Sistema de Monitoreo y Logging**
- Logging estructurado con Winston
- Métricas Prometheus completas
- Sistema de alertas automatizado
- Dashboards de monitoreo

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Redis 6+
- PostgreSQL 13+ (opcional)
- Elasticsearch 7+ (opcional)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/adeptify/eduai-platform.git
cd microservices/mcp-orchestrator

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Construir el proyecto
npm run build

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

### Variables de Entorno

```env
# Configuración del servidor
PORT=3008
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=

# Alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_FROM=alerts@adeptify.es
ALERT_EMAIL_TO=admin@adeptify.es

SLACK_WEBHOOK_URL=
SLACK_CHANNEL=#alerts
SLACK_USERNAME=MCP Orchestrator Alerts

# CORS
CORS_ORIGIN=*
```

## 📡 API Endpoints

### 🔄 **Router Endpoints**

```http
POST /api/orchestrator/route
GET  /api/orchestrator/services
GET  /api/orchestrator/services/:serviceId
GET  /api/orchestrator/metrics
```

### 🧠 **Context Manager Endpoints**

```http
POST   /api/orchestrator/contexts
GET    /api/orchestrator/contexts/:contextId
PUT    /api/orchestrator/contexts/:contextId
DELETE /api/orchestrator/contexts/:contextId
POST   /api/orchestrator/contexts/search
GET    /api/orchestrator/contexts/user/:userId
GET    /api/orchestrator/contexts/session/:sessionId
GET    /api/orchestrator/contexts/metrics
```

### 🤖 **AI Agent Coordinator Endpoints**

```http
POST   /api/orchestrator/agents
GET    /api/orchestrator/agents
GET    /api/orchestrator/agents/:agentId
GET    /api/orchestrator/agents/type/:type
POST   /api/orchestrator/tasks
GET    /api/orchestrator/tasks
GET    /api/orchestrator/tasks/:taskId
POST   /api/orchestrator/workflows
GET    /api/orchestrator/workflows
GET    /api/orchestrator/workflows/:workflowId
POST   /api/orchestrator/workflows/:workflowId/execute
GET    /api/orchestrator/agents/metrics
```

### 📊 **Monitoring Endpoints**

```http
GET  /api/monitoring/health
GET  /api/monitoring/health/detailed
GET  /api/monitoring/metrics
GET  /api/monitoring/metrics/json
GET  /api/monitoring/system/info
GET  /api/monitoring/alerts/status
POST /api/monitoring/alerts/trigger
GET  /api/monitoring/performance
GET  /api/monitoring/dependencies
GET  /api/monitoring/mcp/metrics
GET  /api/monitoring/mcp/services/status
POST /api/monitoring/metrics/clear
```

## 📊 Sistema de Monitoreo

### 🔍 **Logging Service**

El sistema utiliza **Winston** para logging estructurado con múltiples transportes:

- **Consola**: Para desarrollo
- **Archivos**: Para producción (rotación automática)
- **Elasticsearch**: Para análisis avanzado

#### Categorías de Logs

```typescript
// Orquestación
logger.logOrchestration('service_started', { port: 3008 });

// Routing MCP
logger.logMCPRouting('user-service', 'create_user', { userId: '123' });

// Gestión de contextos
logger.logContextManagement('create', 'ctx-123', { contextId: 'ctx-123' });

// Coordinación de agentes
logger.logAgentCoordination('register', 'agent-123', { agentId: 'agent-123' });

// Workflows
logger.logWorkflow('started', 'wf-123', { workflowId: 'wf-123' });

// Tareas
logger.logTask('created', 'task-123', { taskId: 'task-123' });
```

### 📈 **Metrics Service**

Métricas Prometheus completas para monitoreo en tiempo real:

#### Métricas HTTP
- `mcp_orchestrator_http_requests_total`
- `mcp_orchestrator_http_request_duration_seconds`
- `mcp_orchestrator_http_requests_in_progress`
- `mcp_orchestrator_http_requests_failed_total`

#### Métricas MCP
- `mcp_orchestrator_mcp_requests_total`
- `mcp_orchestrator_mcp_request_duration_seconds`
- `mcp_orchestrator_mcp_services_registered`
- `mcp_orchestrator_mcp_services_active`

#### Métricas de Routing
- `mcp_orchestrator_routing_requests_total`
- `mcp_orchestrator_routing_cache_hits_total`
- `mcp_orchestrator_routing_cache_misses_total`

#### Métricas de Context Management
- `mcp_orchestrator_context_operations_total`
- `mcp_orchestrator_contexts_active`
- `mcp_orchestrator_contexts_created_total`

#### Métricas de Agent Coordination
- `mcp_orchestrator_agent_operations_total`
- `mcp_orchestrator_agents_active`
- `mcp_orchestrator_agent_tasks_total`

#### Métricas de Workflows
- `mcp_orchestrator_workflow_operations_total`
- `mcp_orchestrator_workflows_active`
- `mcp_orchestrator_workflow_steps_total`

### 🚨 **Alerts Service**

Sistema de alertas automatizado con múltiples canales:

#### Reglas Predefinidas

```typescript
// Alertas de MCP
- mcp-high-error-rate: Tasa de error MCP alta
- mcp-high-response-time: Tiempo de respuesta MCP alto
- mcp-services-unhealthy: Servicios MCP no saludables

// Alertas de Routing
- routing-high-error-rate: Tasa de error de routing alta
- routing-high-latency: Latencia de routing alta

// Alertas de Context Management
- context-high-error-rate: Tasa de error de gestión de contextos alta
- context-high-latency: Latencia de gestión de contextos alta

// Alertas de Agent Coordination
- agent-high-error-rate: Tasa de error de coordinación de agentes alta
- agent-task-failures: Fallos de tareas de agentes

// Alertas de Workflows
- workflow-high-error-rate: Tasa de error de workflows alta
- workflow-long-duration: Workflows de larga duración

// Alertas de Performance
- high-memory-usage: Uso de memoria alto
- high-cpu-usage: Uso de CPU alto

// Alertas de Circuit Breaker
- circuit-breaker-trips: Activaciones de circuit breaker

// Alertas de AI Services
- ai-high-error-rate: Tasa de error de servicios AI alta
- ai-high-cost: Costo de servicios AI alto
```

#### Canales de Notificación

- **Email**: SMTP configurable
- **Slack**: Webhooks de Slack
- **Webhook**: Webhooks personalizados
- **PagerDuty**: Integración con PagerDuty

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage

# Tests específicos
npm test -- monitoring.test.ts
```

### Estructura de Tests

```
tests/
├── setup.ts              # Configuración global de tests
├── monitoring.test.ts    # Tests del sistema de monitoreo
├── services/            # Tests de servicios
├── middleware/          # Tests de middleware
└── routes/              # Tests de rutas
```

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo
npm run build            # Construir para producción
npm run start            # Iniciar en producción

# Testing
npm test                 # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con coverage

# Linting
npm run lint             # Verificar código
npm run lint:fix         # Corregir problemas de linting

# Type Checking
npm run type-check       # Verificar tipos TypeScript

# Monitoreo
npm run monitoring:health    # Verificar salud del servicio
npm run monitoring:metrics  # Obtener métricas
npm run monitoring:alerts   # Verificar estado de alertas
npm run monitoring:logs     # Ver logs en tiempo real
npm run monitoring:system   # Información del sistema
npm run monitoring:dependencies # Estado de dependencias

# Logs
npm run logs:clear       # Limpiar logs
npm run logs:archive     # Archivar logs

# Métricas
npm run metrics:export   # Exportar métricas
npm run prometheus:test  # Probar métricas Prometheus

# Alertas
npm run alerts:test      # Probar sistema de alertas
```

## 🔧 Configuración Avanzada

### Configuración de Monitoreo

```typescript
// Configuración de producción
const productionConfig = {
  enableRequestLogging: true,
  enablePerformanceLogging: true,
  enableAuditLogging: true,
  enableMetrics: true,
  slowRequestThreshold: 1000,
  logRequestBody: false,
  logResponseBody: false,
  sanitizeSensitiveData: true
};

// Configuración de desarrollo
const developmentConfig = {
  enableRequestLogging: true,
  enablePerformanceLogging: true,
  enableAuditLogging: true,
  enableMetrics: true,
  slowRequestThreshold: 500,
  logRequestBody: true,
  logResponseBody: true,
  sanitizeSensitiveData: false
};
```

### Configuración de Redis

```typescript
const redisConfig = {
  url: 'redis://localhost:6379',
  host: 'localhost',
  port: 6379,
  password: '',
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
};
```

## 📚 Integración con ELK Stack

### Configuración de Elasticsearch

```typescript
// Winston Elasticsearch Transport
new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    }
  },
  indexPrefix: 'logs-mcp-orchestrator',
  ensureMappingTemplate: true
});
```

### Kibana Dashboards

El sistema incluye dashboards predefinidos para Kibana:

- **MCP Orchestrator Overview**: Vista general del servicio
- **Request Performance**: Rendimiento de requests
- **Error Analysis**: Análisis de errores
- **Agent Coordination**: Coordinación de agentes
- **Workflow Monitoring**: Monitoreo de workflows

## 📈 Integración con Prometheus y Grafana

### Configuración de Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mcp-orchestrator'
    static_configs:
      - targets: ['localhost:3008']
    metrics_path: '/api/monitoring/metrics'
    scrape_interval: 15s
```

### Dashboards de Grafana

Dashboards predefinidos disponibles:

- **MCP Orchestrator Dashboard**: Métricas principales
- **Request Performance Dashboard**: Rendimiento de requests
- **Service Health Dashboard**: Salud de servicios
- **Agent Coordination Dashboard**: Coordinación de agentes
- **Workflow Performance Dashboard**: Rendimiento de workflows

## 🚀 Despliegue

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3008

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-orchestrator:
    build: .
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - elasticsearch

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- **Documentación**: [docs.adeptify.es](https://docs.adeptify.es)
- **Issues**: [GitHub Issues](https://github.com/adeptify/eduai-platform/issues)
- **Discord**: [Adeptify Community](https://discord.gg/adeptify)

## 🔗 Enlaces Relacionados

- [User Service](../user-service/README.md)
- [Student Service](../student-service/README.md)
- [Course Service](../course-service/README.md)
- [AI Services](../ai-services/README.md)
- [API Gateway](../../api-gateway/README.md)

---

**MCP Orchestrator Service** - El cerebro de la plataforma EduAI 🧠