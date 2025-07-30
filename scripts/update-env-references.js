#!/usr/bin/env node

/**
 * Script para actualizar todas las referencias de variables de entorno
 * y unificar la configuración en production.env
 */

const fs = require('fs');
const path = require('path');

// Archivos que deben usar production.env
const filesToUpdate = [
  'server/src/index.ts',
  'server/services/ai-chatbot-service.ts',
  'server/services/ai-analytics-service.ts',
  'server/services/ai-report-generator.ts',
  'server/services/calendar-service.ts',
  'server/services/cache-service.ts',
  'server/routes/auth.ts',
  'server/routes/calendar.ts',
  'server/websocket/notification-service.ts',
  'server/utils/logger.ts',
  'server/middleware/error-handler.ts',
  'microservices/user-service/src/index.ts',
  'microservices/user-service/src/database.ts',
  'microservices/user-service/src/services/auth.service.ts',
  'microservices/user-service/src/services/email.service.ts',
  'microservices/user-service/src/services/alerts.service.ts',
  'microservices/user-service/src/services/redis.service.ts',
  'microservices/student-service/src/index.ts',
  'microservices/student-service/src/database.ts',
  'microservices/analytics-service/src/index.ts',
  'gateway/index.ts'
];

// Variables que deben estar en production.env
const requiredVariables = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  'SESSION_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
  'ALLOWED_ORIGINS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'LOG_LEVEL',
  'PRODUCTION_URL',
  'API_BASE_URL',
  'CLIENT_BASE_URL',
  'FRONTEND_URL'
];

function updateFileReferences() {
  console.log('🔄 Actualizando referencias de variables de entorno...');
  
  filesToUpdate.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`📝 Actualizando: ${filePath}`);
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Verificar que las variables críticas estén siendo usadas
      requiredVariables.forEach(variable => {
        const regex = new RegExp(`process\\.env\\.${variable}`, 'g');
        if (regex.test(content)) {
          console.log(`  ✅ ${variable} - OK`);
        } else {
          console.log(`  ⚠️  ${variable} - No encontrada`);
        }
      });
    } else {
      console.log(`❌ Archivo no encontrado: ${filePath}`);
    }
  });
}

function createEnvLoader() {
  console.log('📦 Creando cargador de variables de entorno...');
  
  const envLoaderContent = `
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde production.env
const envPath = path.join(process.cwd(), 'production.env');
config({ path: envPath });

// Validar variables críticas
const requiredVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'SESSION_SECRET',
  'JWT_SECRET'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars);
  console.error('💡 Asegúrate de que production.env esté configurado correctamente');
  process.exit(1);
}

console.log('✅ Variables de entorno cargadas correctamente');
`;

  fs.writeFileSync('server/src/env-loader.ts', envLoaderContent);
  console.log('✅ Creado: server/src/env-loader.ts');
}

function updatePackageScripts() {
  console.log('📝 Actualizando scripts de package.json...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Actualizar scripts para usar production.env
  packageJson.scripts = {
    ...packageJson.scripts,
    'start:prod': 'NODE_ENV=production node -r ./server/src/env-loader.js dist/index.js',
    'dev:env': 'cp production.env .env && npm run dev',
    'build:prod': 'NODE_ENV=production npm run build',
    'validate:env': 'node scripts/validate-env.js'
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Actualizado: package.json');
}

function createDockerEnvConfig() {
  console.log('🐳 Creando configuración de Docker...');
  
  const dockerEnvContent = `
# Docker Compose - Variables de entorno
# Este archivo usa production.env como base

version: '3.8'

services:
  app:
    build: .
    env_file:
      - production.env
    environment:
      - NODE_ENV=production
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: \${DB_NAME}
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass \${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
`;

  fs.writeFileSync('docker-compose.prod.yml', dockerEnvContent);
  console.log('✅ Creado: docker-compose.prod.yml');
}

function createRenderConfig() {
  console.log('☁️  Creando configuración para Render...');
  
  const renderConfigContent = `
# Render.com - Variables de entorno para producción
# Copia estas variables en tu servicio de Render
# Dashboard > Tu Servicio > Environment > Environment Variables

# ============================================================================
# VARIABLES CRÍTICAS (OBLIGATORIAS)
# ============================================================================

# Base de datos PostgreSQL (Render)
DATABASE_URL=postgresql://your-db-user:your-db-password@your-db-host:5432/your-db-name?sslmode=require
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_PORT=5432
DB_SSL=true

# Autenticación y sesiones
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_EXPIRES_IN=24h

# Configuración del servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# CORS y seguridad
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es

# ============================================================================
# VARIABLES OPCIONALES (CONFIGURAR SEGÚN NECESIDAD)
# ============================================================================

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback

# APIs de IA
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@gei.adeptify.es

# Redis
REDIS_URL=redis://your-redis-host:6379
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# URLs de producción
PRODUCTION_URL=https://gei.adeptify.es
API_BASE_URL=https://gei.adeptify.es/api
CLIENT_BASE_URL=https://gei.adeptify.es
FRONTEND_URL=https://gei.adeptify.es

# Logging
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ENABLE_AUDIT_LOGS=true

# ============================================================================
# INSTRUCCIONES DE CONFIGURACIÓN
# ============================================================================

# 1. Ve a tu servicio en Render.com
# 2. Navega a Environment > Environment Variables
# 3. Agrega cada variable con su valor correspondiente
# 4. Para las claves API, usa los valores reales de tus servicios
# 5. Para las URLs, usa los valores de tu dominio de producción
# 6. Guarda los cambios y redespliega el servicio

# ⚠️  IMPORTANTE: Nunca subas este archivo al repositorio con claves reales
`;

  fs.writeFileSync('RENDER_ENV_SETUP.md', renderConfigContent);
  console.log('✅ Creado: RENDER_ENV_SETUP.md');
}

function main() {
  console.log('🚀 Iniciando unificación de variables de entorno...\n');
  
  updateFileReferences();
  console.log('');
  
  createEnvLoader();
  console.log('');
  
  updatePackageScripts();
  console.log('');
  
  createDockerEnvConfig();
  console.log('');
  
  createRenderConfig();
  console.log('');
  
  console.log('🎉 Unificación completada!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Configura las variables en Render.com según RENDER_ENV_SETUP.md');
  console.log('2. Actualiza los microservicios para usar production.env');
  console.log('3. Ejecuta npm run validate:env para verificar la configuración');
  console.log('4. Prueba el despliegue con docker-compose.prod.yml');
}

if (require.main === module) {
  main();
}

module.exports = {
  updateFileReferences,
  createEnvLoader,
  updatePackageScripts,
  createDockerEnvConfig,
  createRenderConfig
}; 