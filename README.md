# 🚀 ADEPTIFY - Plataforma Educativa Inteligente

## 📋 Descripción

Adeptify es una plataforma educativa integral que combina microservicios avanzados, inteligencia artificial y tecnologías modernas para proporcionar una experiencia de aprendizaje personalizada y eficiente.

## 🏗️ Arquitectura

### Microservicios Implementados (17 servicios)

#### Core Services
- **user-service** - Gestión de usuarios y autenticación
- **student-service** - Gestión de estudiantes
- **course-service** - Gestión de cursos
- **resource-service** - Gestión de recursos educativos
- **communication-service** - Comunicación y mensajería
- **analytics-service** - Análisis y reportes
- **auth-service** - Autenticación y autorización
- **notification-service** - Notificaciones
- **file-service** - Gestión de archivos
- **search-service** - Búsqueda e indexación

#### AI Services
- **llm-gateway** - Gateway para servicios de IA
- **content-generation** - Generación de contenido
- **chatbot** - Chatbot inteligente
- **predictive-analytics** - Análisis predictivo
- **personalization-engine** - Motor de personalización
- **ml-pipeline** - Pipeline de machine learning

#### MCP Services
- **mcp-orchestrator** - Orquestador MCP
- **mcp-servers** - Servidores MCP

## 🎨 Frontend

### Tecnologías
- **React 18** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Vitest** para testing
- **React Router** para navegación

### Estructura
```
client/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── pages/         # Páginas de la aplicación
│   ├── services/      # Servicios de API
│   ├── hooks/         # Custom hooks
│   ├── context/       # Context providers
│   ├── types/         # TypeScript types
│   ├── lib/           # Utilidades
│   ├── assets/        # Recursos estáticos
│   ├── tests/         # Tests unitarios
│   └── i18n/          # Internacionalización
├── public/            # Archivos públicos
└── dist/              # Build de producción
```

## 📱 Mobile App

### Tecnologías
- **React Native** con Expo
- **TypeScript**
- **Axios** para HTTP requests
- **AsyncStorage** para persistencia

### Estructura
```
mobile-app/
├── src/
│   ├── components/    # Componentes móviles
│   ├── screens/       # Pantallas de la app
│   ├── services/      # Servicios de API
│   ├── navigation/    # Navegación
│   └── utils/         # Utilidades
```

## 🌐 API Gateway

### Funcionalidades Avanzadas
- **Circuit Breaker** - Patrón de resiliencia
- **Service Discovery** - Descubrimiento de servicios
- **Load Balancing** - Balanceo de carga
- **Caching** - Caché LRU con TTL
- **Metrics Collection** - Métricas en tiempo real
- **Request Validation** - Validación de requests
- **Response Transformation** - Transformación de respuestas
- **Rate Limiting** - Limitación de tasa
- **Security Middleware** - Middleware de seguridad

## 🔒 Seguridad

### SecurityManager
- **JWT Authentication** - Tokens seguros
- **RBAC Authorization** - Control de acceso basado en roles
- **Rate Limiting** - Protección contra ataques
- **Input Validation** - Sanitización de datos
- **Threat Detection** - Detección de SQL injection, XSS, CSRF
- **Encryption** - Cifrado AES-256-GCM
- **Audit Logging** - Logging completo de eventos

## 📊 Monitoreo

### Stack Completo
- **Prometheus** - 25+ jobs de monitoreo
- **Grafana** - Dashboards interactivos
- **AlertManager** - 27 reglas de alerta
- **Blackbox Monitoring** - Health checks externos

### Métricas Monitoreadas
- **Application**: Request rate, response time, error rate
- **Infrastructure**: CPU, memory, disk usage
- **Security**: Threats, authentication failures
- **Performance**: Overall scores, latency

## 🚀 Infraestructura

### Kubernetes
```
k8s/
├── base/              # Configuración base
├── overlays/
│   ├── staging/       # Entorno de staging
│   └── production/    # Entorno de producción
```

### Docker
- **docker-compose.dev.yml** - Entorno de desarrollo
- **docker-compose.prod.yml** - Entorno de producción
- **Dockerfile** - Imagen principal
- **client/Dockerfile.prod** - Imagen del cliente

### CI/CD
- **GitHub Actions** - Pipelines automatizados
- **GitLab CI** - Integración continua
- **Jenkins** - Pipelines de despliegue

## 🧪 Testing

### Cobertura Completa
- **Unit Tests** - Tests unitarios con Vitest
- **Integration Tests** - Tests de integración
- **E2E Tests** - Tests end-to-end con Playwright
- **Performance Tests** - Tests de rendimiento

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Kubernetes (para producción)
- PostgreSQL
- Redis

### Desarrollo Local
```bash
# Clonar repositorio
git clone <repository-url>
cd adeptify

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
cp env.microservices .env.microservices

# Iniciar servicios
docker-compose -f docker-compose.dev.yml up -d

# Iniciar frontend
cd client
npm run dev

# Iniciar microservicios
cd ../microservices/user-service
npm run dev
```

### Producción
```bash
# Desplegar en Kubernetes
kubectl apply -k k8s/overlays/production/

# Verificar despliegue
kubectl get pods -n adeptify-production
```

## 🔧 Configuración

### Variables de Entorno
```bash
# Base
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/adeptify
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# External Services
OPENAI_API_KEY=your-openai-key
```

## 📚 Documentación

### Archivos Principales
- **README.md** - Documentación principal
- **pdr.md** - Plan de desarrollo
- **MICROTAREAS_XX_COMPLETADAS.md** - Implementación de microtareas
- **INVENTARIO_COMPLETO_APLICACION.md** - Inventario completo

## 🎯 Características Principales

### ✅ Implementado
- **17 microservicios** completamente funcionales
- **Frontend React** con TypeScript
- **Mobile app** React Native
- **API Gateway** con funcionalidades avanzadas
- **Sistema de seguridad** completo
- **Stack de monitoreo** integral
- **Infraestructura** Kubernetes/Docker
- **CI/CD** automatizado
- **Testing** completo

### 🔄 En Desarrollo
- **Optimizaciones** de performance
- **Expansión** de funcionalidades
- **Mejoras** de seguridad
- **Nuevas** características de IA

## 📈 Estadísticas del Proyecto

- **Microservicios**: 17 implementados
- **Líneas de código**: ~50,000+
- **Archivos TypeScript**: 200+
- **Tests**: 100+ implementados
- **Documentación**: 50+ archivos

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollo**: Adeptify Development Team
- **Arquitectura**: Microservicios y IA
- **DevOps**: Kubernetes y Docker
- **Testing**: Cobertura completa

---

**Estado**: ✅ PRODUCCIÓN READY  
**Versión**: v1.0.0  
**Última actualización**: $(date) 