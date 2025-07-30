# ☁️ Configuración de Variables de Entorno en Render.com

## 📋 Resumen

Este documento contiene todas las variables de entorno que debes configurar en Render.com para que la aplicación GEI Adeptify funcione correctamente en producción.

## 🔧 Variables Críticas (OBLIGATORIAS)

### Base de Datos PostgreSQL
```
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com:5432/gei_db?sslmode=require
DB_HOST=dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com
DB_NAME=gei_db
DB_USER=gei_db_user
DB_PASSWORD=pV89ToE3mgCR8BMidIvsTubt2SycbqBB
DB_PORT=5432
DB_SSL=true
```

### Autenticación y Sesiones
```
SESSION_SECRET=gei_adeptify_session_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_EXPIRES_IN=24h
```

### Configuración del Servidor
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

### CORS y Seguridad
```
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es
```

## 🔑 Variables de APIs (CONFIGURAR SEGÚN NECESIDAD)

### Google OAuth
```
GOOGLE_CLIENT_ID=1080986221149-kk92eavrakaci64feloqtne5p79inphp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback
GOOGLE_REDIRECT_URI=https://gei.adeptify.es/auth/google/callback
```

### Google Calendar
```
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_SYNC_INTERVAL=30
GOOGLE_CALENDAR_EVENT_PREFIX=[GEI]
GOOGLE_CALENDAR_DEFAULT_LOCATION=Institut
```

### APIs de IA
```
GEMINI_API_KEY=AIzaSyB9bwid0oHPk-1ettsSdCU_IpzsMFojscc
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
```

## 📧 Variables de Email (OPCIONAL)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email-here
SMTP_PASS=your-email-password-here
EMAIL_FROM=noreply@gei.adeptify.es
```

## 🔴 Variables de Redis (OPCIONAL)

```
REDIS_URL=redis://your-redis-host:6379
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TTL=3600
REDIS_MAX_MEMORY=256mb
REDIS_MAX_MEMORY_POLICY=allkeys-lru
```

## 🌐 URLs de Producción

```
PRODUCTION_URL=https://gei.adeptify.es
API_BASE_URL=https://gei.adeptify.es/api
CLIENT_BASE_URL=https://gei.adeptify.es
FRONTEND_URL=https://gei.adeptify.es
```

## 📊 Logging y Monitoreo

```
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ENABLE_AUDIT_LOGS=true
LOG_FILE=logs/app.log
```

## 🔧 Configuración de Módulos

### Adeptify
```
ADEPTIFY_ENABLED=true
ADEPTIFY_GOOGLE_SHEETS_ENABLED=false
ADEPTIFY_EXPORT_FORMATS=excel,csv,pdf
```

### Assistatut
```
ASSISTATUT_ENABLED=true
ASSISTATUT_AUTO_ASSIGNMENT=true
ASSISTATUT_NOTIFICATIONS_ENABLED=true
```

## 🚀 Instrucciones de Configuración en Render.com

### Paso 1: Acceder a tu Servicio
1. Ve a [Render.com](https://render.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu servicio de GEI Adeptify

### Paso 2: Configurar Variables de Entorno
1. En el dashboard de tu servicio, ve a **Environment**
2. Haz clic en **Environment Variables**
3. Agrega cada variable una por una:

#### Variables Críticas (Agregar Primero)
```
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com:5432/gei_db?sslmode=require
NODE_ENV=production
SESSION_SECRET=gei_adeptify_session_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=https://gei.adeptify.es
```

#### Variables de Google (Agregar Después)
```
GOOGLE_CLIENT_ID=1080986221149-kk92eavrakaci64feloqtne5p79inphp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GEMINI_API_KEY=AIzaSyB9bwid0oHPk-1ettsSdCU_IpzsMFojscc
```

#### Variables Adicionales (Opcionales)
```
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ADEPTIFY_ENABLED=true
ASSISTATUT_ENABLED=true
```

### Paso 3: Guardar y Redesplegar
1. Haz clic en **Save Changes**
2. Ve a **Manual Deploy**
3. Selecciona **Deploy latest commit**
4. Espera a que el despliegue se complete

## 🔒 Gestión Segura de Secrets

### Para las Claves API Secretas:
1. **NUNCA** subas las claves reales al repositorio
2. Usa siempre los valores de Render.com
3. Rota las claves regularmente
4. Usa diferentes claves para desarrollo y producción

### Generación de Secrets Seguros:
```bash
# Generar SESSION_SECRET
openssl rand -hex 32

# Generar JWT_SECRET
openssl rand -hex 32

# Generar JWT_REFRESH_SECRET
openssl rand -hex 32
```

## ✅ Verificación de Configuración

### Script de Validación
```bash
# Ejecutar validación local
npm run validate:env

# Verificar variables en Render
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.render.com/v1/services/YOUR_SERVICE_ID/environment-variables
```

### Comandos de Verificación
```bash
# Verificar que la aplicación inicia correctamente
npm run start:prod

# Verificar conexión a la base de datos
npm run test:db

# Verificar configuración de microservicios
npm run test:microservices
```

## 🚨 Troubleshooting

### Problemas Comunes:

1. **Error de conexión a la base de datos**
   - Verifica que `DATABASE_URL` esté correcta
   - Asegúrate de que la base de datos esté activa en Render

2. **Error de autenticación**
   - Verifica que `SESSION_SECRET` y `JWT_SECRET` estén configurados
   - Asegúrate de que no estén vacíos

3. **Error de CORS**
   - Verifica que `CORS_ORIGIN` apunte a tu dominio correcto
   - Asegúrate de que `ALLOWED_ORIGINS` incluya tu dominio

4. **Error de APIs de Google**
   - Verifica que las claves de Google estén correctas
   - Asegúrate de que los dominios estén autorizados en Google Console

## 📞 Soporte

Si encuentras problemas con la configuración:

1. Revisa los logs de Render.com
2. Ejecuta el script de validación: `npm run validate:env`
3. Verifica que todas las variables estén configuradas
4. Contacta al equipo de desarrollo

---

**⚠️ IMPORTANTE**: Nunca subas este archivo al repositorio con claves reales. Usa siempre los valores de Render.com para producción. 