# 🐳 Configuración Docker para Producción - GEI Adeptify

## 📋 Resumen

Este documento describe la configuración completa de Docker para el despliegue en producción de la plataforma GEI Adeptify, incluyendo todos los microservicios y la gestión de variables de entorno.

## ✅ Configuración Completada

### 1. **Dockerfile Principal**
- ✅ Multi-stage build optimizado
- ✅ Usuario no-root para seguridad
- ✅ Health checks configurados
- ✅ Variables de entorno para producción
- ✅ Build optimizado para producción

### 2. **Docker Compose para Producción**
- ✅ Servicios principales configurados
- ✅ Base de datos PostgreSQL
- ✅ Redis para caché
- ✅ Traefik como API Gateway
- ✅ Health checks para todos los servicios
- ✅ Variables de entorno centralizadas

### 3. **Microservicios**
- ✅ Dockerfiles individuales
- ✅ Configuración de variables de entorno
- ✅ Health checks configurados
- ✅ Usuarios no-root

### 4. **Variables de Entorno**
- ✅ Archivo `production.env` unificado
- ✅ Configuración para Render.com
- ✅ Validación de variables críticas

## 🏗️ Arquitectura Docker

### Servicios Principales
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Traefik       │    │   PostgreSQL    │    │     Redis       │
│   (Gateway)     │    │   (Database)    │    │    (Cache)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Microservicios                     │
         │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
         │  │ User Service│ │Student Svc  │ │Analytics Svc│ │
         │  └─────────────┘ └─────────────┘ └─────────────┘ │
         │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
         │  │ Course Svc  │ │Resource Svc │ │Communication│ │
         │  └─────────────┘ └─────────────┘ └─────────────┘ │
         └─────────────────────────────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Main App      │
                    │  (Frontend +    │
                    │   Backend)      │
                    └─────────────────┘
```

## 📁 Estructura de Archivos

### Archivos de Configuración Docker
```
├── Dockerfile                          # Dockerfile principal
├── docker-compose.prod.yml            # Docker Compose para producción
├── .dockerignore                      # Archivos excluidos del build
├── production.env                     # Variables de entorno unificadas
├── render.yaml                        # Configuración para Render.com
└── scripts/
    ├── start-production-optimized.sh  # Script de inicio
    └── validate-docker-production.js  # Validación de configuración
```

### Microservicios
```
microservices/
├── user-service/
│   ├── Dockerfile
│   └── package.json
├── student-service/
│   ├── Dockerfile
│   └── package.json
├── analytics-service/
│   ├── Dockerfile
│   └── package.json
└── ...
```

## 🔧 Variables de Entorno

### Variables Críticas (OBLIGATORIAS)
```bash
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Autenticación
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here

# Servidor
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://gei.adeptify.es

# APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
```

### Variables por Microservicio
Cada microservicio usa las siguientes variables:
```bash
NODE_ENV=production
PORT=<puerto-del-servicio>
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=${CORS_ORIGIN}
LOG_LEVEL=info
```

## 🚀 Comandos de Despliegue

### Despliegue Local con Docker Compose
```bash
# Construir y ejecutar todos los servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar estado de los servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs app

# Detener todos los servicios
docker-compose -f docker-compose.prod.yml down
```

### Despliegue Individual de Microservicios
```bash
# Construir imagen de un microservicio
docker build -t user-service ./microservices/user-service

# Ejecutar microservicio
docker run -d \
  --name user-service \
  --env-file production.env \
  -p 3001:3001 \
  user-service
```

### Validación de Configuración
```bash
# Validar configuración Docker
node scripts/validate-docker-production.js

# Validar variables de entorno
node scripts/validate-env.js

# Generar reporte de configuración
node scripts/validate-docker-production.js --report
```

## 🔒 Configuración de Seguridad

### Usuarios No-Root
Todos los contenedores ejecutan con usuarios no-root:
```dockerfile
# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Cambiar ownership
RUN chown -R nodejs:nodejs /app
USER nodejs
```

### Health Checks
Todos los servicios tienen health checks configurados:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```

### Variables de Entorno Seguras
- ✅ No se incluyen claves reales en imágenes
- ✅ Variables de entorno pasadas en tiempo de ejecución
- ✅ Archivo `.dockerignore` excluye archivos sensibles

## 📊 Monitoreo y Logging

### Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Logging Centralizado
```bash
# Ver logs de todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f app
```

## 🔄 CI/CD y Despliegue

### Render.com
```yaml
# render.yaml
services:
  - type: web
    name: eduai-platform
    env: node
    plan: starter
    buildCommand: |
      cd server
      npm ci
      npm run build
    startCommand: |
      cd server
      chmod +x start.sh
      ./start.sh
```

### Variables de Entorno en Render
```bash
# Configurar en Render.com Dashboard
DATABASE_URL=postgresql://...
NODE_ENV=production
SESSION_SECRET=...
JWT_SECRET=...
CORS_ORIGIN=https://gei.adeptify.es
```

## 🧪 Testing y Validación

### Scripts de Validación
```bash
# Validar configuración Docker
npm run validate:docker

# Validar variables de entorno
npm run validate:env

# Validar microservicios
npm run validate:microservices
```

### Comandos de Testing
```bash
# Test de conectividad
curl -f http://localhost:3000/health

# Test de base de datos
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Test de Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## 📈 Optimización y Rendimiento

### Multi-Stage Builds
```dockerfile
# Stage de build
FROM node:20-alpine AS base
# ... configuración de build

# Stage de producción
FROM node:20-alpine AS production
# ... configuración optimizada
```

### Configuración de Base de Datos
```yaml
postgres:
  command: >
    postgres
    -c shared_preload_libraries=pg_stat_statements
    -c max_connections=200
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
```

### Configuración de Redis
```yaml
redis:
  command: >
    redis-server
    --appendonly yes
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de conexión a base de datos**
   ```bash
   # Verificar variables de entorno
   docker-compose -f docker-compose.prod.yml exec app env | grep DATABASE
   
   # Verificar conectividad
   docker-compose -f docker-compose.prod.yml exec app ping postgres
   ```

2. **Error de permisos**
   ```bash
   # Verificar usuario del contenedor
   docker-compose -f docker-compose.prod.yml exec app whoami
   
   # Verificar permisos de archivos
   docker-compose -f docker-compose.prod.yml exec app ls -la
   ```

3. **Error de health check**
   ```bash
   # Verificar logs del servicio
   docker-compose -f docker-compose.prod.yml logs app
   
   # Verificar endpoint de health
   curl -f http://localhost:3000/health
   ```

### Comandos de Debug
```bash
# Entrar al contenedor
docker-compose -f docker-compose.prod.yml exec app sh

# Ver variables de entorno
docker-compose -f docker-compose.prod.yml exec app env

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f app
```

## 📞 Soporte

### Documentación Relacionada
- `RENDER_ENV_SETUP.md` - Configuración de variables en Render
- `UNIFICACION_VARIABLES_ENTORNO.md` - Unificación de variables
- `production.env` - Variables de entorno unificadas

### Scripts de Ayuda
```bash
# Validar toda la configuración
node scripts/validate-docker-production.js

# Generar secretos seguros
node scripts/validate-env.js --gen

# Verificar archivo production.env
node scripts/validate-env.js --check
```

---

**✅ Configuración Docker completada para producción**
**🔒 Seguridad implementada**
**📊 Monitoreo configurado**
**🚀 Listo para despliegue** 