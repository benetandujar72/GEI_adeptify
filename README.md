# EduAI Platform - Microservicios con MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-20.0+-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.25+-blue.svg)](https://kubernetes.io/)

## 🎯 Descripción

EduAI Platform es una plataforma educativa inteligente que ha evolucionado de una arquitectura monolítica a una arquitectura de microservicios con integración MCP (Model Context Protocol). Esta transformación permite una mayor escalabilidad, mantenibilidad y capacidades de inteligencia artificial avanzadas.

## 🏗️ Arquitectura

### **Nueva Arquitectura Microservicios con MCP**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Frontend)                     │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web App       │   Mobile App    │     Admin Portal            │
│  (React/TS)     │  (React Native) │    (React/TS)               │
└─────────────────┴─────────────────┴─────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   API GATEWAY     │
                    │   (Traefik +      │
                    │   Custom Auth)    │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                MCP ORCHESTRATION LAYER                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │MCP Router   │  │Context Mgr  │  │AI Agent Coordinator │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼────────┐    ┌───────▼──────┐
│BUSINESS LOGIC│    │   AI SERVICES   │    │ DATA LAYER   │
│ MICROSERVICES│    │   MICROSERVICES │    │ SERVICES     │
├──────────────┤    ├─────────────────┤    ├──────────────┤
│• Users       │    │• LLM Gateway    │    │• PostgreSQL  │
│• Students    │    │• Content Gen    │    │• Redis       │
│• Courses     │    │• Analytics      │    │• Vector DB   │
│• Scheduling  │    │• Predictions    │    │• File Store  │
│• Resources   │    │• Personalization│    │• Audit Logs  │
│• Comms       │    │• ML Pipeline    │    │• Backups     │
└──────────────┘    └─────────────────┘    └──────────────┘
```

### **Microservicios Implementados**

#### **Servicios Core**
- **User Service** (`:3001`) - Gestión de usuarios, autenticación y autorización
- **Student Service** (`:3002`) - Gestión de estudiantes y registros académicos
- **Course Service** (`:3003`) - Gestión de cursos, currículum y horarios

#### **Servicios de Negocio**
- **Resource Service** (`:3004`) - Gestión de recursos y reservas
- **Communication Service** (`:3005`) - Notificaciones y mensajería
- **Analytics Service** (`:3006`) - Reportes y estadísticas

#### **Servicios AI**
- **LLM Gateway** (`:3007`) - Gateway para múltiples proveedores de LLM
- **AI Services** (`:3008`) - Servicios de IA especializados

#### **MCP Services**
- **MCP Orchestrator** (`:3009`) - Orquestación de servicios MCP

#### **Infraestructura**
- **API Gateway** (`:5000`) - Gateway unificado con routing inteligente
- **Server Legacy** (`:3000`) - Servidor monolítico (en proceso de migración)

## 🚀 Inicio Rápido

### **Prerrequisitos**

- Node.js 18+
- Docker & Docker Compose
- npm o yarn
- Git

### **Desarrollo Local**

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/adeptify/eduai-platform.git
   cd eduai-platform
   ```

2. **Iniciar entorno de desarrollo**
   ```bash
   ./scripts/dev-start.sh
   ```

3. **Acceder a la aplicación**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:5000
   - Servidor Legacy: http://localhost:3000

### **Desarrollo con Docker**

```bash
# Iniciar solo infraestructura
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Iniciar todos los servicios
docker-compose -f docker-compose.dev.yml up -d
```

## 📁 Estructura del Proyecto

```
eduai-platform/
├── client/                     # Frontend React
├── server/                     # Servidor legacy (en migración)
├── gateway/                    # API Gateway
├── microservices/              # Microservicios
│   ├── user-service/          # Servicio de usuarios
│   ├── student-service/       # Servicio de estudiantes
│   ├── course-service/        # Servicio de cursos
│   ├── resource-service/      # Servicio de recursos
│   ├── communication-service/ # Servicio de comunicaciones
│   ├── analytics-service/     # Servicio de analytics
│   ├── llm-gateway/          # Gateway LLM
│   ├── ai-services/          # Servicios AI
│   └── mcp-orchestrator/     # Orquestador MCP
├── k8s/                       # Configuraciones Kubernetes
├── monitoring/                # Configuraciones de monitoreo
├── scripts/                   # Scripts de utilidad
├── docs/                      # Documentación
└── tests/                     # Tests
```

## 🔧 Configuración

### **Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Configuración de Desarrollo
NODE_ENV=development

# Base de Datos
DATABASE_URL=postgresql://gei_user:gei_password@localhost:5432/gei_platform
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_here

# API Keys (opcionales para desarrollo)
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# URLs de Microservicios
USER_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
# ... más servicios

# Gateway
GATEWAY_PORT=5000
API_SERVER_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## 🛠️ Comandos Útiles

### **Desarrollo**

```bash
# Iniciar entorno de desarrollo
./scripts/dev-start.sh

# Detener entorno de desarrollo
./scripts/dev-stop.sh

# Ver logs
./scripts/dev-logs.sh

# Instalar dependencias de todos los servicios
./scripts/install-all.sh
```

### **Testing**

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests de integración
npm run test:integration

# Ejecutar tests E2E
npm run test:e2e
```

### **Despliegue**

```bash
# Despliegue a producción
./deploy-production.sh

# Despliegue a staging
./scripts/deploy-staging.sh
```

## 🔌 APIs

### **Endpoints Principales**

#### **API Gateway** (`http://localhost:5000`)

```
GET  /health                    # Health check del gateway
GET  /status                    # Status de todos los microservicios
GET  /api/v1/users/*           # User Service
GET  /api/v1/students/*        # Student Service
GET  /api/v1/courses/*         # Course Service
GET  /api/v1/resources/*       # Resource Service
GET  /api/v1/communications/*  # Communication Service
GET  /api/v1/analytics/*       # Analytics Service
GET  /api/ai/*                 # AI Services
GET  /api/llm/*                # LLM Gateway
GET  /api/mcp/*                # MCP Orchestrator
```

#### **Microservicios Individuales**

- **User Service**: `http://localhost:3001`
- **Student Service**: `http://localhost:3002`
- **Course Service**: `http://localhost:3003`
- **Resource Service**: `http://localhost:3004`
- **Communication Service**: `http://localhost:3005`
- **Analytics Service**: `http://localhost:3006`
- **LLM Gateway**: `http://localhost:3007`
- **AI Services**: `http://localhost:3008`
- **MCP Orchestrator**: `http://localhost:3009`

## 🧪 Testing

### **Estructura de Tests**

```
tests/
├── unit/                      # Tests unitarios
│   ├── frontend/             # Tests del frontend
│   ├── microservices/        # Tests de microservicios
│   └── services/             # Tests de servicios
├── integration/              # Tests de integración
│   ├── api/                  # Tests de APIs
│   └── database/             # Tests de base de datos
├── e2e/                      # Tests end-to-end
│   ├── web/                  # Tests del frontend
│   └── mobile/               # Tests de la app móvil
└── performance/              # Tests de rendimiento
```

### **Ejecutar Tests**

```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests de rendimiento
npm run test:performance

# Todos los tests
npm run test:all
```

## 📊 Monitoreo

### **Stack de Monitoreo**

- **Prometheus** - Métricas y alertas
- **Grafana** - Dashboards y visualización
- **ELK Stack** - Logs centralizados
- **Jaeger** - Distributed tracing

### **Dashboards Disponibles**

- Dashboard general de la plataforma
- Métricas de microservicios
- Métricas de AI/ML
- Métricas de base de datos
- Métricas de rendimiento

## 🔒 Seguridad

### **Medidas Implementadas**

- **Autenticación JWT** con refresh tokens
- **Autorización RBAC** (Role-Based Access Control)
- **Rate Limiting** en API Gateway
- **CORS** configurado por entorno
- **Helmet** para headers de seguridad
- **Input Validation** en todos los endpoints
- **SQL Injection Protection** con ORM
- **XSS Protection** en frontend
- **CSRF Protection** en formularios

### **Auditoría**

- Logs de auditoría en todas las operaciones críticas
- Tracking de cambios en base de datos
- Monitoreo de accesos y autenticaciones
- Alertas de seguridad automáticas

## 🚀 Despliegue

### **Entornos**

- **Development** - Desarrollo local
- **Staging** - Pre-producción
- **Production** - Producción

### **Infraestructura**

- **Kubernetes** para orquestación
- **Docker** para containerización
- **Traefik** como ingress controller
- **PostgreSQL** como base de datos principal
- **Redis** para caché y sesiones
- **Qdrant** como vector database

### **CI/CD**

- **GitHub Actions** para automatización
- **Helm Charts** para despliegue
- **Automated Testing** en cada commit
- **Automated Security Scanning**
- **Blue-Green Deployments**

## 📈 Roadmap

### **Fase 1: Migración Core** ✅
- [x] Estructura de microservicios
- [x] API Gateway
- [x] User Service
- [x] MCP Orchestrator básico

### **Fase 2: Servicios de Negocio** 🚧
- [ ] Student Service
- [ ] Course Service
- [ ] Resource Service
- [ ] Communication Service
- [ ] Analytics Service

### **Fase 3: Servicios AI** 📋
- [ ] LLM Gateway
- [ ] AI Services
- [ ] Content Generation
- [ ] Predictive Analytics

### **Fase 4: Optimización** 📋
- [ ] Performance optimization
- [ ] Advanced monitoring
- [ ] Auto-scaling
- [ ] Disaster recovery

## 🤝 Contribución

### **Cómo Contribuir**

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### **Estándares de Código**

- **TypeScript** para todo el código
- **ESLint** para linting
- **Prettier** para formateo
- **Conventional Commits** para mensajes de commit
- **Jest** para testing
- **Docker** para containerización

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

- **Documentación**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/adeptify/eduai-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/adeptify/eduai-platform/discussions)
- **Email**: support@adeptify.es

## 🙏 Agradecimientos

- **MCP Protocol** por la arquitectura de orquestación
- **Kubernetes** por la orquestación de contenedores
- **React** por el framework de frontend
- **Node.js** por el runtime de backend
- **PostgreSQL** por la base de datos
- **Redis** por el caché y sesiones

---

**EduAI Platform** - Transformando la educación con inteligencia artificial 🤖📚 