# MCP Orchestrator Service

El **MCP Orchestrator** es el componente central de orquestación y enrutamiento para la plataforma EduAI. Proporciona una capa de abstracción inteligente que coordina todos los servicios de IA y microservicios de la plataforma.

## 🚀 Características

### Core Features
- **Service Discovery & Registration**: Registro y descubrimiento automático de servicios
- **Intelligent Routing**: Enrutamiento inteligente con múltiples estrategias
- **Load Balancing**: Balanceo de carga con circuit breakers
- **Context Management**: Gestión de contexto para sesiones de usuario
- **Agent Coordination**: Coordinación de agentes de IA
- **Workflow Engine**: Motor de flujos de trabajo complejos

### Advanced Features
- **Circuit Breaker Pattern**: Protección contra fallos en cascada
- **Health Monitoring**: Monitoreo de salud de servicios
- **Metrics Collection**: Métricas Prometheus para observabilidad
- **Real-time Logging**: Logging en tiempo real con Winston
- **Security**: Autenticación JWT y autorización basada en roles
- **Rate Limiting**: Limitación de tasa por IP y endpoint

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Orchestrator                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Router    │  │   Context   │  │   Agent Coordinator │ │
│  │   Service   │  │   Manager   │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Load      │  │   Circuit   │  │   Workflow Engine   │ │
│  │  Balancer   │  │   Breaker   │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐        ┌──────▼──────┐      ┌─────▼────┐
    │Services │        │   Context   │      │  Agents  │
    │Registry │        │   Storage   │      │  Pool    │
    └─────────┘        └─────────────┘      └──────────┘
```

## 📋 Prerrequisitos

- **Node.js**: v18.0.0 o superior
- **npm**: v8.0.0 o superior
- **Redis**: v6.0.0 o superior (opcional, para persistencia)
- **PostgreSQL**: v13.0.0 o superior (opcional, para métricas avanzadas)

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/adeptify/eduai-platform.git
cd eduai-platform/microservices/mcp-orchestrator
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

### 4. Compilar TypeScript
```bash
npm run build
```

### 5. Iniciar el servicio
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🐳 Docker

### Construir imagen
```bash
docker build -t mcp-orchestrator .
```

### Ejecutar contenedor
```bash
docker run -d \
  --name mcp-orchestrator \
  -p 3009:3009 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  mcp-orchestrator
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Metrics (Prometheus)
```http
GET /metrics
```

### Main Routing
```http
POST /api/mcp/route
Content-Type: application/json
Authorization: Bearer <token>

{
  "service": "user-service",
  "action": "get_user",
  "data": { "userId": "123" },
  "context": "context-id",
  "priority": 5
}
```

### Service Management
```http
# Registrar servicio
POST /api/mcp/services/register
{
  "name": "ai-services",
  "url": "http://localhost:3008",
  "port": 3008,
  "capabilities": ["ai_services"],
  "version": "1.0.0"
}

# Obtener servicios
GET /api/mcp/services

# Obtener estado de servicio
GET /api/mcp/services/:serviceName
```

### Context Management
```http
# Crear contexto
POST /api/mcp/contexts
{
  "type": "user_session",
  "data": { "userId": "123", "preferences": {} },
  "userId": "123",
  "sessionId": "session-456"
}

# Obtener contexto
GET /api/mcp/contexts/:contextId

# Actualizar contexto
PUT /api/mcp/contexts/:contextId
{
  "updates": { "lastActivity": "2024-01-01T00:00:00Z" }
}
```

### Agent Management
```http
# Registrar agente
POST /api/mcp/agents
{
  "name": "ai-agent-1",
  "type": "ai_coordinator",
  "capabilities": ["content_generation", "analytics"],
  "config": { "maxConcurrency": 5 },
  "maxConcurrency": 5
}

# Obtener agentes
GET /api/mcp/agents

# Heartbeat del agente
POST /api/mcp/agents/:agentId/heartbeat
```

### Task Management
```http
# Crear tarea
POST /api/mcp/tasks
{
  "agentType": "ai_coordinator",
  "taskType": "content_generation",
  "data": { "prompt": "Generate a lesson about math" },
  "priority": 5,
  "contextId": "context-123"
}

# Obtener tareas
GET /api/mcp/tasks

# Completar tarea
PUT /api/mcp/tasks/:taskId/complete
{
  "result": { "content": "Generated lesson content" }
}
```

### Workflow Management
```http
# Crear workflow
POST /api/mcp/workflows
{
  "name": "lesson_generation",
  "description": "Generate complete lesson with exercises",
  "steps": [
    {
      "name": "generate_content",
      "agentType": "ai_coordinator",
      "action": "content_generation",
      "data": { "topic": "math" }
    },
    {
      "name": "generate_exercises",
      "agentType": "ai_coordinator",
      "action": "exercise_generation",
      "data": { "content": "{{previous_step.result}}" },
      "dependencies": ["generate_content"]
    }
  ],
  "triggers": [
    {
      "type": "manual",
      "enabled": true
    }
  ],
  "status": "active"
}

# Ejecutar workflow
POST /api/mcp/workflows/:workflowId/execute
{
  "contextId": "context-123"
}
```

## ⚙️ Configuración

### Variables de Entorno Principales

```bash
# Servidor
PORT=3009
NODE_ENV=production
LOG_LEVEL=info

# Seguridad
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://gei.adeptify.es

# Redis
REDIS_URL=redis://localhost:6379

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000

# Load Balancer
LOAD_BALANCER_STRATEGY=round_robin
LOAD_BALANCER_HEALTH_CHECK_INTERVAL=30000

# Context Management
CONTEXT_MAX_AGE=86400000
CONTEXT_CLEANUP_INTERVAL=3600000
```

### Estrategias de Load Balancing

- **round_robin**: Distribución cíclica
- **least_connections**: Menor número de conexiones
- **weighted**: Distribución por peso
- **intelligent**: Selección inteligente basada en métricas

## 📊 Monitoreo

### Métricas Prometheus

El servicio expone métricas en formato Prometheus en `/metrics`:

- `mcp_http_requests_total`: Total de requests HTTP
- `mcp_requests_total`: Total de requests MCP
- `mcp_services_registered`: Servicios registrados
- `mcp_contexts_active`: Contextos activos
- `mcp_agents_active`: Agentes activos
- `mcp_tasks_pending`: Tareas pendientes
- `mcp_circuit_breaker_state`: Estado del circuit breaker

### Health Checks

```bash
# Health check básico
curl http://localhost:3009/health

# Health check detallado
curl http://localhost:3009/api/mcp/health
```

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar en modo desarrollo
npm run build        # Compilar TypeScript
npm run test         # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run lint         # Linting
npm run lint:fix     # Linting con auto-fix

# Producción
npm start            # Iniciar en modo producción
npm run security:audit  # Auditoría de seguridad
```

### Estructura del Proyecto

```
src/
├── controllers/     # Controladores de la API
├── middleware/      # Middlewares (auth, validation, etc.)
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── types/           # Tipos TypeScript
├── utils/           # Utilidades (logger, etc.)
└── index.ts         # Punto de entrada
```

## 🔒 Seguridad

### Autenticación

El servicio utiliza JWT para autenticación:

```bash
# Obtener token
curl -X POST http://localhost:3009/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Usar token
curl -X POST http://localhost:3009/api/mcp/route \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"service": "user-service", "action": "get_user"}'
```

### Autorización

Roles disponibles:
- `admin`: Acceso completo
- `service`: Acceso a servicios
- `user`: Acceso limitado

Permisos:
- `service:manage`: Gestión de servicios
- `context:manage`: Gestión de contexto
- `agent:manage`: Gestión de agentes
- `workflow:manage`: Gestión de workflows

## 🚨 Troubleshooting

### Problemas Comunes

1. **Servicio no responde**
   ```bash
   # Verificar logs
   tail -f logs/mcp-orchestrator.log
   
   # Verificar health check
   curl http://localhost:3009/health
   ```

2. **Error de conexión a Redis**
   ```bash
   # Verificar Redis
   redis-cli ping
   
   # Verificar URL en .env
   REDIS_URL=redis://localhost:6379
   ```

3. **Circuit Breaker abierto**
   ```bash
   # Verificar métricas
   curl http://localhost:3009/metrics | grep circuit_breaker
   
   # Reset manual (solo desarrollo)
   curl -X POST http://localhost:3009/api/mcp/services/reset-circuit-breaker
   ```

### Logs

Los logs se guardan en:
- `logs/mcp-orchestrator.log`: Logs generales
- `logs/mcp-orchestrator-error.log`: Solo errores
- `logs/orchestrator.log`: Logs de orquestación
- `logs/routing.log`: Logs de enrutamiento
- `logs/context.log`: Logs de contexto
- `logs/agent.log`: Logs de agentes

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del proyecto](https://github.com/adeptify/eduai-platform/wiki)
- **Issues**: [GitHub Issues](https://github.com/adeptify/eduai-platform/issues)
- **Email**: support@adeptify.es

---

**MCP Orchestrator** - El corazón inteligente de la plataforma EduAI 🧠