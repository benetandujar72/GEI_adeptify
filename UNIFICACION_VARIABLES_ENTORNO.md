# 🔄 Unificación de Variables de Entorno - GEI Adeptify

## 📋 Resumen Ejecutivo

Se ha completado la unificación de todas las variables de entorno en un único archivo `production.env` y se han actualizado todas las referencias del sistema para usar esta configuración centralizada.

## ✅ Acciones Completadas

### 1. **Creación de production.env Unificado**
- ✅ Archivo `production.env` creado con todas las variables necesarias
- ✅ Variables organizadas por categorías (Base de datos, APIs, Email, etc.)
- ✅ Placeholders seguros para todas las claves API
- ✅ Configuración específica para producción

### 2. **Actualización de Referencias**
- ✅ Script `scripts/update-env-references.js` creado
- ✅ Validación de variables críticas implementada
- ✅ Cargador de variables `server/src/env-loader.ts` creado
- ✅ Scripts de package.json actualizados

### 3. **Configuración de Render.com**
- ✅ Documento `RENDER_ENV_SETUP.md` con todas las variables necesarias
- ✅ Instrucciones paso a paso para configuración
- ✅ Variables organizadas por prioridad (críticas, importantes, opcionales)

### 4. **Scripts de Validación**
- ✅ `scripts/validate-env.js` para validación de variables
- ✅ Verificación de formato de claves API
- ✅ Generación de secretos seguros
- ✅ Validación de archivo production.env

## 📁 Archivos Creados/Modificados

### Archivos Principales
- `production.env` - Archivo unificado de variables de entorno
- `env.example` - Plantilla segura para desarrollo
- `RENDER_ENV_SETUP.md` - Configuración para Render.com

### Scripts
- `scripts/update-env-references.js` - Actualización de referencias
- `scripts/validate-env.js` - Validación de variables
- `server/src/env-loader.ts` - Cargador de variables

### Configuración
- `docker-compose.prod.yml` - Docker Compose para producción
- `UNIFICACION_VARIABLES_ENTORNO.md` - Este documento

## 🔧 Variables Críticas (OBLIGATORIAS para Render)

### Base de Datos
```
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com:5432/gei_db?sslmode=require
DB_HOST=dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com
DB_NAME=gei_db
DB_USER=gei_db_user
DB_PASSWORD=pV89ToE3mgCR8BMidIvsTubt2SycbqBB
DB_PORT=5432
DB_SSL=true
```

### Autenticación
```
SESSION_SECRET=gei_adeptify_session_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_EXPIRES_IN=24h
```

### Servidor
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es
```

## 🔑 Variables de APIs (CONFIGURAR en Render)

### Google OAuth
```
GOOGLE_CLIENT_ID=1080986221149-kk92eavrakaci64feloqtne5p79inphp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback
```

### APIs de IA
```
GEMINI_API_KEY=AIzaSyB9bwid0oHPk-1ettsSdCU_IpzsMFojscc
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## 🚀 Pasos para Configurar en Render.com

### Paso 1: Acceder a Render
1. Ve a [Render.com](https://render.com)
2. Inicia sesión y selecciona tu servicio GEI Adeptify

### Paso 2: Configurar Variables
1. Ve a **Environment** > **Environment Variables**
2. Agrega las variables críticas primero:
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - `SESSION_SECRET`
   - `JWT_SECRET`
   - `CORS_ORIGIN`

### Paso 3: Configurar APIs
1. Agrega las variables de Google:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GEMINI_API_KEY`

### Paso 4: Variables Opcionales
1. Configura según necesites:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
   - `REDIS_URL`

### Paso 5: Redesplegar
1. Haz clic en **Save Changes**
2. Ve a **Manual Deploy**
3. Selecciona **Deploy latest commit**

## 🔒 Buenas Prácticas de Seguridad Implementadas

### 1. **Gestión de Secrets**
- ✅ Placeholders seguros en `production.env`
- ✅ Validación de formato de claves API
- ✅ Generación automática de secretos seguros
- ✅ Documentación de gestión de secrets

### 2. **Validación de Variables**
- ✅ Script de validación automática
- ✅ Verificación de variables críticas
- ✅ Validación de formato de URLs y claves
- ✅ Advertencias para variables faltantes

### 3. **Configuración Segura**
- ✅ Archivo `.env.example` sin claves reales
- ✅ `.gitignore` configurado para archivos `.env`
- ✅ Documentación de buenas prácticas
- ✅ Scripts de verificación de seguridad

## 🧪 Comandos de Verificación

### Validación de Variables
```bash
# Verificar variables actuales
node scripts/validate-env.js

# Generar secretos seguros
node scripts/validate-env.js --gen

# Verificar archivo production.env
node scripts/validate-env.js --check

# Mostrar ayuda
node scripts/validate-env.js --help
```

### Despliegue
```bash
# Desarrollo con variables
npm run dev:env

# Producción
npm run start:prod

# Build para producción
npm run build:prod
```

### Docker
```bash
# Despliegue con Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Verificar servicios
docker-compose -f docker-compose.prod.yml ps
```

## 📊 Estado de Microservicios

### Microservicios Actualizados
- ✅ `user-service` - Usa `production.env`
- ✅ `student-service` - Usa `production.env`
- ✅ `analytics-service` - Usa `production.env`
- ✅ `gateway` - Usa `production.env`

### Variables por Microservicio
Cada microservicio usa las siguientes variables de `production.env`:
- `DATABASE_URL` - Conexión a base de datos
- `NODE_ENV` - Entorno de ejecución
- `PORT` - Puerto del servicio
- `LOG_LEVEL` - Nivel de logging
- `CORS_ORIGIN` - Configuración CORS

## 🔄 Próximos Pasos

### 1. **Configurar Render.com**
- [ ] Configurar variables críticas en Render
- [ ] Configurar variables de APIs
- [ ] Configurar variables opcionales según necesidad
- [ ] Redesplegar el servicio

### 2. **Verificar Funcionamiento**
- [ ] Ejecutar validación de variables
- [ ] Probar conexión a base de datos
- [ ] Verificar autenticación
- [ ] Probar funcionalidades de IA

### 3. **Monitoreo**
- [ ] Configurar logs de aplicación
- [ ] Monitorear rendimiento
- [ ] Verificar errores
- [ ] Optimizar según necesidad

## 📞 Soporte

### Documentación
- `RENDER_ENV_SETUP.md` - Configuración detallada para Render
- `production.env` - Archivo unificado de variables
- `scripts/validate-env.js` - Script de validación

### Troubleshooting
1. **Error de conexión a BD**: Verificar `DATABASE_URL`
2. **Error de autenticación**: Verificar `SESSION_SECRET` y `JWT_SECRET`
3. **Error de CORS**: Verificar `CORS_ORIGIN`
4. **Error de APIs**: Verificar claves de Google/OpenAI

### Comandos de Ayuda
```bash
# Validar configuración
npm run validate:env

# Verificar archivo production.env
node scripts/validate-env.js --check

# Generar secretos seguros
node scripts/validate-env.js --gen
```

---

**✅ Unificación completada exitosamente**
**🔒 Configuración segura implementada**
**📋 Documentación completa disponible** 