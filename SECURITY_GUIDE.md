# 🔒 GUÍA DE SEGURIDAD - VARIABLES DE ENTORNO

## ⚠️ IMPORTANTE: PROTECCIÓN DE SECRETOS

### 🚨 REGLAS CRÍTICAS:
1. **NUNCA** subas archivos .env con secretos reales al repositorio
2. **SIEMPRE** usa placeholders en archivos de configuración
3. **CONFIGURA** secretos reales en el dashboard de Render.com
4. **ROTA** secretos regularmente en producción

### 📋 VARIABLES CRÍTICAS A PROTEGER:

#### 🔐 AUTENTICACIÓN:
- `SESSION_SECRET` - Clave para sesiones
- `JWT_SECRET` - Clave para JWT
- `JWT_REFRESH_SECRET` - Clave para refresh JWT

#### 🗄️ BASE DE DATOS:
- `DATABASE_URL` - URL completa de la base de datos
- `DB_PASSWORD` - Contraseña de la base de datos

#### 🔑 APIs EXTERNAS:
- `GOOGLE_CLIENT_SECRET` - Secreto de Google OAuth
- `GEMINI_API_KEY` - Clave API de Google Gemini
- `OPENAI_API_KEY` - Clave API de OpenAI
- `ANTHROPIC_API_KEY` - Clave API de Anthropic

#### 💳 PAGOS:
- `STRIPE_SECRET_KEY` - Clave secreta de Stripe
- `STRIPE_WEBHOOK_SECRET` - Secreto de webhook de Stripe

#### 📧 EMAIL:
- `SMTP_PASS` - Contraseña del servidor SMTP

### 🛠️ CONFIGURACIÓN EN RENDER.COM:

1. **Accede al Dashboard de Render**
2. **Selecciona tu servicio**
3. **Ve a Environment > Environment Variables**
4. **Configura cada variable con su valor real**

### 📝 EJEMPLO DE CONFIGURACIÓN:

```
# En el dashboard de Render, configura:
DATABASE_URL=postgresql://usuario:contraseña@host:5432/db?sslmode=require
SESSION_SECRET=tu-super-secreto-session-key-aqui
JWT_SECRET=tu-super-secreto-jwt-key-aqui
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
GEMINI_API_KEY=tu-gemini-api-key-aqui
```

### 🔄 ROTACIÓN DE SECRETOS:

1. **Genera nuevos secretos** cada 90 días
2. **Actualiza en Render.com** sin interrumpir el servicio
3. **Verifica** que la aplicación funcione correctamente
4. **Documenta** los cambios realizados

### 🚨 EN CASO DE COMPROMISO:

1. **Inmediatamente** rota todos los secretos
2. **Revisa logs** para detectar actividad sospechosa
3. **Notifica** al equipo de seguridad
4. **Audita** el acceso a la aplicación

### 📊 MONITOREO DE SEGURIDAD:

- **Revisa logs** regularmente
- **Monitorea** intentos de acceso fallidos
- **Verifica** que las variables estén configuradas correctamente
- **Audita** el uso de APIs externas

---

**✅ Esta configuración garantiza la seguridad de tus secretos en producción**
