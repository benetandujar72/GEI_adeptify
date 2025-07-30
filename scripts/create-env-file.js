#!/usr/bin/env node

/**
 * Script para crear el archivo .env automáticamente
 * con las variables de entorno para producción
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createEnvFile() {
  console.log('🔧 Creando archivo .env para producción...\n');

  const envContent = `# ============================================================================
# VARIABLES DE ENTORNO - PRODUCCIÓN
# ============================================================================
# Configuración para despliegue en Render.com
# Las variables críticas están configuradas en render.yaml

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com:5432/gei_db?sslmode=require
DB_HOST=dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com
DB_PORT=5432
DB_NAME=gei_db
DB_USER=gei_db_user
DB_PASSWORD=pV89ToE3mgCR8BMidIvsTubt2SycbqBB

# ============================================================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ============================================================================
# AUTENTICACIÓN Y SESIONES
# ============================================================================
SESSION_SECRET=gei_adeptify_session_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_SECRET=gei_jwt_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_REFRESH_SECRET=gei_jwt_refresh_secret_2024_secure_key_123456789_abcdefghijklmnop
JWT_EXPIRES_IN=24h

# ============================================================================
# CORS Y SEGURIDAD
# ============================================================================
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es

# ============================================================================
# GOOGLE OAUTH
# ============================================================================
GOOGLE_CLIENT_ID=1080986221149-kk92eavrakaci64feloqtne5p79inphp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback
GOOGLE_REDIRECT_URI=https://gei.adeptify.es/auth/google/callback

# ============================================================================
# GOOGLE GEMINI AI API
# ============================================================================
GEMINI_API_KEY=AIzaSyB9bwid0oHPk-1ettsSdCU_IpzsMFojscc

# ============================================================================
# GOOGLE CALENDAR (OPCIONAL)
# ============================================================================
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_SYNC_INTERVAL=30
GOOGLE_CALENDAR_EVENT_PREFIX=[GEI]
GOOGLE_CALENDAR_DEFAULT_LOCATION=Institut

# ============================================================================
# OPENAI API (OPCIONAL)
# ============================================================================
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# ============================================================================
# STRIPE (OPCIONAL)
# ============================================================================
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# ============================================================================
# EMAIL (OPCIONAL)
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# ============================================================================
# LOGGING Y MONITOREO
# ============================================================================
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ENABLE_AUDIT_LOGS=true
ENABLE_METRICS=true

# ============================================================================
# URLs DE PRODUCCIÓN
# ============================================================================
PRODUCTION_URL=https://gei.adeptify.es
API_BASE_URL=https://gei.adeptify.es/api
CLIENT_BASE_URL=https://gei.adeptify.es
FRONTEND_URL=https://gei.adeptify.es

# ============================================================================
# CONFIGURACIÓN ESPECÍFICA DE MÓDULOS
# ============================================================================

# ADEPTIFY - EVALUACIÓN DE COMPETENCIAS
ADEPTIFY_ENABLED=true
ADEPTIFY_GOOGLE_SHEETS_ENABLED=false
ADEPTIFY_EXPORT_FORMATS=excel,csv,pdf

# ASSISTATUT - GESTIÓN DE GUARDIAS
ASSISTATUT_ENABLED=true
ASSISTATUT_AUTO_ASSIGNMENT=true
ASSISTATUT_NOTIFICATIONS_ENABLED=true

# ============================================================================
# DESARROLLO Y TESTING
# ============================================================================
ENABLE_DEV_LOGIN=false
DEV_USER_EMAIL=admin@example.com
DEV_USER_PASSWORD=admin123
SKIP_AUTH_IN_DEV=false

# ============================================================================
# CACHE Y OPTIMIZACIÓN
# ============================================================================
ENABLE_CACHE=true
CACHE_TTL=3600
ENABLE_COMPRESSION=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# ============================================================================
# BACKUP Y SEGURIDAD
# ============================================================================
ENABLE_BACKUP=true
BACKUP_INTERVAL=24h

# ============================================================================
# REDIS (OPCIONAL - PARA CACHÉ)
# ============================================================================
REDIS_URL=your-redis-url

# ============================================================================
# GOOGLE API (OPCIONAL)
# ============================================================================
GOOGLE_API_KEY=your-google-api-key
`;

  const envPath = path.join(process.cwd(), '.env');
  
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Archivo .env creado exitosamente');
    console.log(`📁 Ubicación: ${envPath}`);
    console.log(`📊 Tamaño: ${(envContent.length / 1024).toFixed(1)}KB`);
    
    // Verificar que se creó correctamente
    if (fs.existsSync(envPath)) {
      const stats = fs.statSync(envPath);
      console.log(`✅ Verificación: Archivo existe (${(stats.size / 1024).toFixed(1)}KB)`);
      
      // Verificar variables críticas
      const content = fs.readFileSync(envPath, 'utf8');
      const criticalVars = [
        'DATABASE_URL',
        'NODE_ENV',
        'PORT',
        'SESSION_SECRET',
        'JWT_SECRET',
        'CORS_ORIGIN',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GEMINI_API_KEY'
      ];
      
      console.log('\n🔍 Verificando variables críticas:');
      criticalVars.forEach(varName => {
        if (content.includes(varName)) {
          console.log(`  ✅ ${varName} configurada`);
        } else {
          console.log(`  ❌ ${varName} NO configurada`);
        }
      });
      
    } else {
      console.log('❌ Error: El archivo no se creó correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error al crear el archivo .env:', error.message);
  }
}

// Ejecutar el script
createEnvFile(); 