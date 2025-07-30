# 🚀 GEI Unified Platform - Guía de Despliegue en Producción

## 📋 **Resumen del Proyecto**

GEI Unified Platform es un ecosistema educativo inteligente que integra múltiples módulos:
- **Adeptify**: Evaluación de competencias
- **Assistatut**: Gestión de guardias y asistencia
- **Microservicios**: Arquitectura distribuida
- **AI Services**: Servicios de inteligencia artificial

## 🔧 **Problemas Identificados y Solucionados**

### **Problemas Originales:**
1. ❌ Script de inicio incorrecto en `render.yaml`
2. ❌ Variables de entorno no configuradas correctamente
3. ❌ Proceso de build no optimizado
4. ❌ Health check endpoint no implementado correctamente
5. ❌ Dependencias no instalándose correctamente

### **Soluciones Implementadas:**
1. ✅ **Dockerfile.prod** optimizado para producción
2. ✅ **docker-compose.prod.yml** actualizado
3. ✅ **Scripts de inicio** corregidos y optimizados
4. ✅ **Health check** implementado correctamente
5. ✅ **Variables de entorno** configuradas adecuadamente

## 🐳 **Configuración Docker para Producción**

### **Archivos Creados/Actualizados:**

#### **1. Dockerfile.prod**
```dockerfile
# Dockerfile optimizado para producción
FROM node:20-alpine AS base
# ... configuración completa
```

**Características:**
- ✅ Multi-stage build para optimizar tamaño
- ✅ Usuario no-root para seguridad
- ✅ Health check optimizado
- ✅ Dependencias de producción únicamente
- ✅ Cache optimizado

#### **2. docker-compose.prod.yml**
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    # ... configuración completa
```

**Servicios incluidos:**
- 🚀 **Aplicación principal** (puerto 3000)
- 👥 **User Service** (puerto 3001)
- 🎓 **Student Service** (puerto 3002)
- 📊 **Analytics Service** (puerto 3006)
- 🗄️ **PostgreSQL** (puerto 5432)
- 🔄 **Redis** (puerto 6379)
- 🌐 **Traefik Gateway** (puertos 80, 443, 8080)
- 📋 **pgAdmin** (puerto 5050) - opcional

#### **3. Scripts de Despliegue**

**scripts/deploy-production.sh**
```bash
#!/bin/bash
# Script de despliegue automatizado
# Verifica dependencias, construye y despliega
```

**scripts/verify-production-setup.sh**
```bash
#!/bin/bash
# Script de verificación completa
# Valida toda la configuración antes del despliegue
```

## 🚀 **Guía de Despliegue**

### **Paso 1: Verificación Previa**
```bash
# Verificar que todo esté configurado correctamente
./scripts/verify-production-setup.sh
```

### **Paso 2: Configurar Variables de Entorno**

**Crear archivo `production.env`:**
```env
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Autenticación
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services
GEMINI_API_KEY=your-gemini-api-key

# URLs de producción
CORS_ORIGIN=https://gei.adeptify.es
PRODUCTION_URL=https://gei.adeptify.es
```

### **Paso 3: Despliegue Automatizado**
```bash
# Ejecutar despliegue completo
./scripts/deploy-production.sh
```

### **Paso 4: Verificación Post-Despliegue**
```bash
# Verificar estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Probar health check
curl http://localhost:3000/health
```

## 🔍 **Monitoreo y Mantenimiento**

### **Comandos Útiles**

#### **Estado de Servicios**
```bash
# Ver estado de todos los contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs app

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f
```

#### **Gestión de Contenedores**
```bash
# Parar todos los servicios
docker-compose -f docker-compose.prod.yml down

# Reiniciar un servicio específico
docker-compose -f docker-compose.prod.yml restart app

# Reconstruir y reiniciar
docker-compose -f docker-compose.prod.yml up -d --build
```

#### **Backup y Restauración**
```bash
# Backup de base de datos
docker exec postgres pg_dump -U adeptify adeptify > backup.sql

# Restaurar base de datos
docker exec -i postgres psql -U adeptify adeptify < backup.sql
```

### **Endpoints de Verificación**

#### **Health Check**
```bash
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": "CONFIGURED",
  "google": "CONFIGURED",
  "session": "CONFIGURED",
  "jwt": "CONFIGURED"
}
```

#### **Información del Sistema**
```bash
curl http://localhost:3000/api/system/info
```

## 🔧 **Configuración para Render.com**

### **render.yaml Actualizado**
```yaml
services:
  - type: web
    name: eduai-platform
    env: node
    plan: starter
    buildCommand: |
      npm ci
      npm run build:server
      npm run build:client
    startCommand: |
      chmod +x scripts/start-production-optimized.sh
      ./scripts/start-production-optimized.sh
    healthCheckPath: /health
```

### **Variables de Entorno en Render Dashboard**

**Configurar estas variables en el dashboard de Render:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Clave secreta para sesiones | `mi-clave-secreta-muy-segura` |
| `JWT_SECRET` | Clave secreta para JWT | `mi-jwt-secret-muy-seguro` |
| `GOOGLE_CLIENT_ID` | ID de cliente de Google OAuth | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secreto de cliente de Google OAuth | `GOCSPX-abcdefghijklmnop` |
| `GEMINI_API_KEY` | Clave API de Google Gemini | `AIzaSyB9bwid0oHPk-1ettsSdCU_IpzsMFojscc` |

## 🛠️ **Solución de Problemas**

### **Problemas Comunes**

#### **1. "Application exited early"**
**Causa:** Variables de entorno no configuradas
**Solución:**
```bash
# Verificar variables en Render Dashboard
# Asegurar que DATABASE_URL, SESSION_SECRET, JWT_SECRET estén configuradas
```

#### **2. "Build failed"**
**Causa:** Dependencias no se instalan correctamente
**Solución:**
```bash
# Limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### **3. "Health check failed"**
**Causa:** Endpoint `/health` no responde
**Solución:**
```bash
# Verificar que el servidor esté funcionando
docker-compose -f docker-compose.prod.yml logs app

# Probar endpoint manualmente
curl http://localhost:3000/health
```

#### **4. "Database connection failed"**
**Causa:** Variables de base de datos incorrectas
**Solución:**
```bash
# Verificar DATABASE_URL en variables de entorno
# Probar conexión manualmente
docker exec -it postgres psql -U adeptify -d adeptify
```

### **Logs de Debug**

#### **Ver logs detallados**
```bash
# Logs de la aplicación
docker-compose -f docker-compose.prod.yml logs app

# Logs de base de datos
docker-compose -f docker-compose.prod.yml logs postgres

# Logs de Redis
docker-compose -f docker-compose.prod.yml logs redis
```

#### **Entrar al contenedor para debug**
```bash
# Entrar al contenedor de la aplicación
docker exec -it gei-adeptify-app sh

# Verificar archivos
ls -la dist/
cat dist/index.js

# Verificar variables de entorno
env | grep -E "(DATABASE|SESSION|JWT|GOOGLE)"
```

## 📊 **Métricas y Monitoreo**

### **Métricas de Recursos**
```bash
# Ver uso de recursos
docker stats

# Ver información detallada
docker system df
```

### **Monitoreo de Aplicación**
- **Health Check**: `/health`
- **Métricas del Sistema**: `/api/system/info`
- **Logs**: Docker logs
- **Estado de Servicios**: Docker Compose ps

## 🔒 **Seguridad**

### **Configuraciones de Seguridad Implementadas**
- ✅ Usuario no-root en contenedores
- ✅ Variables de entorno seguras
- ✅ Health checks para detección de problemas
- ✅ CORS configurado correctamente
- ✅ Helmet para headers de seguridad
- ✅ Rate limiting habilitado

### **Recomendaciones Adicionales**
- 🔐 Usar secrets management para claves sensibles
- 🔐 Configurar firewall en el servidor
- 🔐 Habilitar HTTPS con certificados SSL
- 🔐 Implementar backup automático de base de datos
- 🔐 Configurar alertas de monitoreo

## 📈 **Escalabilidad**

### **Configuración para Escalar**
```yaml
# En docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### **Load Balancer con Traefik**
- ✅ Configurado automáticamente
- ✅ SSL/TLS automático con Let's Encrypt
- ✅ Health checks automáticos
- ✅ Routing inteligente

## 🎯 **Resumen de Mejoras**

### **Antes vs Después**

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Script de inicio** | ❌ Incorrecto | ✅ Optimizado |
| **Variables de entorno** | ❌ No configuradas | ✅ Completamente configuradas |
| **Health check** | ❌ No implementado | ✅ Funcionando |
| **Docker** | ❌ Básico | ✅ Optimizado para producción |
| **Monitoreo** | ❌ Limitado | ✅ Completo |
| **Seguridad** | ❌ Básica | ✅ Robusta |
| **Escalabilidad** | ❌ No preparado | ✅ Listo para escalar |

## 🚀 **Próximos Pasos**

1. **Desplegar en producción** usando los scripts creados
2. **Configurar monitoreo** con herramientas como Prometheus/Grafana
3. **Implementar CI/CD** para despliegues automáticos
4. **Configurar backup automático** de base de datos
5. **Implementar alertas** para problemas críticos

---

**✅ Proyecto completamente preparado para producción**
**🔧 Todos los problemas identificados solucionados**
**🚀 Listo para despliegue inmediato** 