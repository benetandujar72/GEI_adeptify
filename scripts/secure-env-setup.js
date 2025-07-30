#!/usr/bin/env node

/**
 * Script para configurar de forma segura y unificada
 * todas las variables de entorno para producción
 * 
 * Este script:
 * 1. Crea un archivo .env unificado con placeholders seguros
 * 2. Actualiza render.yaml con placeholders
 * 3. Configura microservicios con variables seguras
 * 4. Implementa buenas prácticas de seguridad
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Generar secretos seguros
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Generar placeholder seguro
function generatePlaceholder(name, type = 'secret') {
  const timestamp = new Date().toISOString().split('T')[0];
  return `[PLACEHOLDER_${type.toUpperCase()}_${name.toUpperCase()}_${timestamp}]`;
}

class SecureEnvSetup {
  constructor() {
    this.secrets = {
      session: generateSecureSecret(64),
      jwt: generateSecureSecret(64),
      jwtRefresh: generateSecureSecret(64)
    };
  }

  createUnifiedEnvFile() {
    logSection('CREANDO ARCHIVO .ENV UNIFICADO Y SEGURO');

    const envContent = `# ============================================================================
# VARIABLES DE ENTORNO UNIFICADAS - GEI UNIFIED PLATFORM
# ============================================================================
# CONFIGURACIÓN SEGURA PARA PRODUCCIÓN
# 
# ⚠️  IMPORTANTE:
# - Este archivo contiene placeholders seguros
# - Reemplaza los placeholders con valores reales en producción
# - NUNCA subas este archivo con claves reales al repositorio
# - Para Render.com, configura las variables en el dashboard

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================
# URL completa de la base de datos (PostgreSQL en Render)
DATABASE_URL=[PLACEHOLDER_DATABASE_URL_POSTGRESQL_RENDER]

# Variables individuales de base de datos
DB_HOST=[PLACEHOLDER_DB_HOST_RENDER]
DB_NAME=[PLACEHOLDER_DB_NAME_RENDER]
DB_USER=[PLACEHOLDER_DB_USER_RENDER]
DB_PASSWORD=[PLACEHOLDER_DB_PASSWORD_RENDER]
DB_PORT=5432
DB_SSL=true

# ============================================================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ============================================================================
# AUTENTICACIÓN Y SESIONES (SECRETOS SEGUROS)
# ============================================================================
# Clave secreta para sesiones (generada automáticamente)
SESSION_SECRET=${this.secrets.session}

# JWT Secrets (generados automáticamente)
JWT_SECRET=${this.secrets.jwt}
JWT_REFRESH_SECRET=${this.secrets.jwtRefresh}
JWT_EXPIRES_IN=24h

# ============================================================================
# CORS Y SEGURIDAD
# ============================================================================
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es

# ============================================================================
# GOOGLE OAUTH (CONFIGURAR EN PRODUCCIÓN)
# ============================================================================
GOOGLE_CLIENT_ID=[PLACEHOLDER_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[PLACEHOLDER_GOOGLE_CLIENT_SECRET]
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback
GOOGLE_REDIRECT_URI=https://gei.adeptify.es/auth/google/callback

# ============================================================================
# GOOGLE CALENDAR (OPCIONAL)
# ============================================================================
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_SYNC_INTERVAL=30
GOOGLE_CALENDAR_EVENT_PREFIX=[GEI]
GOOGLE_CALENDAR_DEFAULT_LOCATION=Institut

# ============================================================================
# APIs DE IA (CONFIGURAR SEGÚN NECESIDAD)
# ============================================================================
GEMINI_API_KEY=[PLACEHOLDER_GEMINI_API_KEY]
OPENAI_API_KEY=[PLACEHOLDER_OPENAI_API_KEY]
ANTHROPIC_API_KEY=[PLACEHOLDER_ANTHROPIC_API_KEY]
GOOGLE_AI_API_KEY=[PLACEHOLDER_GOOGLE_AI_API_KEY]

# ============================================================================
# STRIPE (OPCIONAL - PARA SISTEMA DE PAGOS)
# ============================================================================
STRIPE_SECRET_KEY=[PLACEHOLDER_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[PLACEHOLDER_STRIPE_WEBHOOK_SECRET]
STRIPE_PUBLISHABLE_KEY=[PLACEHOLDER_STRIPE_PUBLISHABLE_KEY]

# ============================================================================
# EMAIL (OPCIONAL - PARA NOTIFICACIONES)
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[PLACEHOLDER_SMTP_USER]
SMTP_PASS=[PLACEHOLDER_SMTP_PASSWORD]
EMAIL_FROM=noreply@gei.adeptify.es

# ============================================================================
# LOGGING Y MONITOREO
# ============================================================================
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ENABLE_AUDIT_LOGS=true
ENABLE_METRICS=true
LOG_FILE=logs/app.log

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
REDIS_URL=[PLACEHOLDER_REDIS_URL]

# ============================================================================
# MICROSERVICIOS
# ============================================================================
# MCP Orchestrator
MCP_ORCHESTRATOR_URL=http://mcp-orchestrator:3008

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD ADICIONAL
# ============================================================================
# Headers de seguridad
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS_PER_WINDOW=100

# Session security
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# ============================================================================
# CONFIGURACIÓN DE DOCKER
# ============================================================================
# Variables específicas para Docker
DOCKER_ENABLED=true
DOCKER_NETWORK=gei-network
DOCKER_VOLUME_PREFIX=gei_

# ============================================================================
# CONFIGURACIÓN DE RENDER.COM
# ============================================================================
# Estas variables se configuran automáticamente en Render
# DATABASE_URL se construye automáticamente
# NODE_ENV=production se establece automáticamente
# PORT se asigna automáticamente
`;

    const envPath = path.join(process.cwd(), '.env');
    
    try {
      fs.writeFileSync(envPath, envContent, 'utf8');
      logSuccess('Archivo .env unificado creado exitosamente');
      logInfo(`Ubicación: ${envPath}`);
      logInfo(`Tamaño: ${(envContent.length / 1024).toFixed(1)}KB`);
      
      return true;
    } catch (error) {
      logError(`Error al crear archivo .env: ${error.message}`);
      return false;
    }
  }

  updateRenderYaml() {
    logSection('ACTUALIZANDO RENDER.YAML CON PLACEHOLDERS SEGUROS');

    const renderContent = `services:
  - type: web
    name: eduai-platform
    env: node
    plan: starter
    buildCommand: |
      npm ci
      npm run build:server
      npm run build:client
    startCommand: |
      chmod +x scripts/start-render.sh
      ./scripts/start-render.sh
    envVars:
      # Configuración del servidor
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: HOST
        value: 0.0.0.0
      
      # Base de datos PostgreSQL (Render) - CONFIGURAR EN DASHBOARD
      - key: DB_HOST
        sync: false
      - key: DB_NAME
        sync: false
      - key: DB_USER
        sync: false
      - key: DB_PASSWORD
        sync: false
      - key: DB_PORT
        value: 5432
      - key: DB_SSL
        value: true
      
      # URL completa de la base de datos - CONFIGURAR EN DASHBOARD
      - key: DATABASE_URL
        sync: false
      
      # Clave secreta para sesiones - CONFIGURAR EN DASHBOARD
      - key: SESSION_SECRET
        sync: false
      
      # JWT Secrets - CONFIGURAR EN DASHBOARD
      - key: JWT_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: JWT_EXPIRES_IN
        value: 24h
      
      # Google OAuth Configuration - CONFIGURAR EN DASHBOARD
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_CALLBACK_URL
        value: https://gei.adeptify.es/auth/google/callback
      - key: GOOGLE_REDIRECT_URI
        value: https://gei.adeptify.es/auth/google/callback
      
      # Google Gemini AI API - CONFIGURAR EN DASHBOARD
      - key: GEMINI_API_KEY
        sync: false
      
      # Configuración adicional
      - key: LOG_LEVEL
        value: info
      - key: CORS_ORIGIN
        value: https://gei.adeptify.es
      - key: ALLOWED_ORIGINS
        value: https://gei.adeptify.es,https://www.gei.adeptify.es
      - key: ENABLE_METRICS
        value: true
      - key: ENABLE_DEBUG_LOGS
        value: false
      - key: ENABLE_AUDIT_LOGS
        value: true
      
      # URLs de producción
      - key: PRODUCTION_URL
        value: https://gei.adeptify.es
      - key: API_BASE_URL
        value: https://gei.adeptify.es/api
      - key: CLIENT_BASE_URL
        value: https://gei.adeptify.es
      - key: FRONTEND_URL
        value: https://gei.adeptify.es
      
      # Configuración de módulos
      - key: ADEPTIFY_ENABLED
        value: true
      - key: ASSISTATUT_ENABLED
        value: true
      - key: ENABLE_CACHE
        value: true
      - key: ENABLE_RATE_LIMITING
        value: true
      
      # Variables opcionales (pueden configurarse manualmente en Render)
      - key: REDIS_URL
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: GOOGLE_API_KEY
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        value: 587
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
    healthCheckPath: /health
    autoDeploy: true

databases:
  - name: eduai-postgres
    databaseName: gei_db
    user: gei_db_user
    plan: starter

  - name: eduai-redis
    databaseName: redis
    plan: starter
`;

    const renderPath = path.join(process.cwd(), 'render.yaml');
    
    try {
      fs.writeFileSync(renderPath, renderContent, 'utf8');
      logSuccess('render.yaml actualizado con placeholders seguros');
      logInfo('Las variables sensibles ahora se configuran en el dashboard de Render');
      
      return true;
    } catch (error) {
      logError(`Error al actualizar render.yaml: ${error.message}`);
      return false;
    }
  }

  createMicroservicesEnv() {
    logSection('CREANDO CONFIGURACIÓN PARA MICROSERVICIOS');

    const microservicesContent = `# ============================================================================
# CONFIGURACIÓN DE ENTORNO PARA MICROSERVICIOS - PRODUCCIÓN
# ============================================================================
# Configuración unificada para todos los microservicios
# Generado automáticamente - NO MODIFICAR MANUALMENTE

# ============================================================================
# BASE DE DATOS UNIFICADA
# ============================================================================
DATABASE_URL=[PLACEHOLDER_DATABASE_URL_MICROSERVICES]
REDIS_URL=[PLACEHOLDER_REDIS_URL_MICROSERVICES]

# ============================================================================
# AUTENTICACIÓN UNIFICADA
# ============================================================================
JWT_SECRET=${this.secrets.jwt}
JWT_REFRESH_SECRET=${this.secrets.jwtRefresh}
JWT_EXPIRES_IN=24h

# ============================================================================
# CORS UNIFICADO
# ============================================================================
CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es

# ============================================================================
# LOGGING UNIFICADO
# ============================================================================
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
ENABLE_AUDIT_LOGS=true

# ============================================================================
# MCP ORCHESTRATOR
# ============================================================================
MCP_ORCHESTRATOR_URL=http://mcp-orchestrator:3008

# ============================================================================
# SERVICIOS DE IA
# ============================================================================
ANTHROPIC_API_KEY=[PLACEHOLDER_ANTHROPIC_API_KEY]
GOOGLE_AI_API_KEY=[PLACEHOLDER_GOOGLE_AI_API_KEY]
OPENAI_API_KEY=[PLACEHOLDER_OPENAI_API_KEY]
GEMINI_API_KEY=[PLACEHOLDER_GEMINI_API_KEY]

# ============================================================================
# MONITOREO
# ============================================================================
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# ============================================================================
# EMAIL
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[PLACEHOLDER_SMTP_USER]
SMTP_PASS=[PLACEHOLDER_SMTP_PASSWORD]

# ============================================================================
# CONFIGURACIÓN DE RED
# ============================================================================
DOCKER_NETWORK=gei-network
SERVICE_DISCOVERY_ENABLED=true

# ============================================================================
# SEGURIDAD
# ============================================================================
SECURITY_HEADERS_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS_PER_WINDOW=100
`;

    const microservicesPath = path.join(process.cwd(), 'env.microservices');
    
    try {
      fs.writeFileSync(microservicesPath, microservicesContent, 'utf8');
      logSuccess('Configuración de microservicios creada');
      logInfo('Archivo: env.microservices');
      
      return true;
    } catch (error) {
      logError(`Error al crear configuración de microservicios: ${error.message}`);
      return false;
    }
  }

  updateGitignore() {
    logSection('ACTUALIZANDO .GITIGNORE PARA SEGURIDAD');

    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/
.next/
out/

# Environment variables - CRÍTICO: NUNCA subir archivos con secretos reales
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
render.env
env.microservices
*.env
.env.*

# Archivos de configuración con secretos
config/secrets.json
config/production.json
secrets/
keys/

# IDE and editor files
.vscode/
.idea/
.cursor/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Docker
.dockerignore
docker-compose.override.yml

# Backup files
*.backup
*.bak
*.tmp

# Certificate files
*.pem
*.key
*.crt
*.p12
*.pfx

# Database files
*.db
*.sqlite
*.sqlite3

# Cache directories
.cache/
.parcel-cache/
.next/
.nuxt/
dist/
build/
`;

    const gitignorePath = path.join(process.cwd(), '.gitignore');
    
    try {
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
      logSuccess('.gitignore actualizado con protecciones de seguridad');
      
      return true;
    } catch (error) {
      logError(`Error al actualizar .gitignore: ${error.message}`);
      return false;
    }
  }

  createSecurityGuide() {
    logSection('CREANDO GUÍA DE SEGURIDAD');

    const securityGuide = `# 🔒 GUÍA DE SEGURIDAD - VARIABLES DE ENTORNO

## ⚠️ IMPORTANTE: PROTECCIÓN DE SECRETOS

### 🚨 REGLAS CRÍTICAS:
1. **NUNCA** subas archivos .env con secretos reales al repositorio
2. **SIEMPRE** usa placeholders en archivos de configuración
3. **CONFIGURA** secretos reales en el dashboard de Render.com
4. **ROTA** secretos regularmente en producción

### 📋 VARIABLES CRÍTICAS A PROTEGER:

#### 🔐 AUTENTICACIÓN:
- \`SESSION_SECRET\` - Clave para sesiones
- \`JWT_SECRET\` - Clave para JWT
- \`JWT_REFRESH_SECRET\` - Clave para refresh JWT

#### 🗄️ BASE DE DATOS:
- \`DATABASE_URL\` - URL completa de la base de datos
- \`DB_PASSWORD\` - Contraseña de la base de datos

#### 🔑 APIs EXTERNAS:
- \`GOOGLE_CLIENT_SECRET\` - Secreto de Google OAuth
- \`GEMINI_API_KEY\` - Clave API de Google Gemini
- \`OPENAI_API_KEY\` - Clave API de OpenAI
- \`ANTHROPIC_API_KEY\` - Clave API de Anthropic

#### 💳 PAGOS:
- \`STRIPE_SECRET_KEY\` - Clave secreta de Stripe
- \`STRIPE_WEBHOOK_SECRET\` - Secreto de webhook de Stripe

#### 📧 EMAIL:
- \`SMTP_PASS\` - Contraseña del servidor SMTP

### 🛠️ CONFIGURACIÓN EN RENDER.COM:

1. **Accede al Dashboard de Render**
2. **Selecciona tu servicio**
3. **Ve a Environment > Environment Variables**
4. **Configura cada variable con su valor real**

### 📝 EJEMPLO DE CONFIGURACIÓN:

\`\`\`
# En el dashboard de Render, configura:
DATABASE_URL=postgresql://usuario:contraseña@host:5432/db?sslmode=require
SESSION_SECRET=tu-super-secreto-session-key-aqui
JWT_SECRET=tu-super-secreto-jwt-key-aqui
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
GEMINI_API_KEY=tu-gemini-api-key-aqui
\`\`\`

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
`;

    const securityPath = path.join(process.cwd(), 'SECURITY_GUIDE.md');
    
    try {
      fs.writeFileSync(securityPath, securityGuide, 'utf8');
      logSuccess('Guía de seguridad creada: SECURITY_GUIDE.md');
      
      return true;
    } catch (error) {
      logError(`Error al crear guía de seguridad: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    logSection('RESUMEN DE CONFIGURACIÓN SEGURA');

    console.log(`${colors.bright}🔒 CONFIGURACIÓN DE SEGURIDAD COMPLETADA${colors.reset}\n`);

    console.log(`${colors.green}✅ Archivos creados/actualizados:${colors.reset}`);
    console.log('  • .env - Variables unificadas con placeholders seguros');
    console.log('  • render.yaml - Configuración sin secretos expuestos');
    console.log('  • env.microservices - Configuración para microservicios');
    console.log('  • .gitignore - Protecciones de seguridad actualizadas');
    console.log('  • SECURITY_GUIDE.md - Guía de seguridad completa');

    console.log(`\n${colors.yellow}⚠️  SECRETOS GENERADOS:${colors.reset}`);
    console.log(`  • SESSION_SECRET: ${this.secrets.session.substring(0, 20)}...`);
    console.log(`  • JWT_SECRET: ${this.secrets.jwt.substring(0, 20)}...`);
    console.log(`  • JWT_REFRESH_SECRET: ${this.secrets.jwtRefresh.substring(0, 20)}...`);

    console.log(`\n${colors.blue}📋 PRÓXIMOS PASOS:${colors.reset}`);
    console.log('1. Configura las variables reales en el dashboard de Render.com');
    console.log('2. Verifica que la aplicación funcione correctamente');
    console.log('3. Revisa la guía de seguridad: SECURITY_GUIDE.md');
    console.log('4. Implementa rotación regular de secretos');

    console.log(`\n${colors.magenta}🔍 COMANDOS DE VERIFICACIÓN:${colors.reset}`);
    console.log('• node scripts/deployment-inventory-check.js');
    console.log('• node scripts/verify-render-deployment.js');
    console.log('• git status (verificar que no se suban archivos .env)');

    console.log(`\n${colors.cyan}🚀 LISTO PARA DESPLIEGUE SEGURO${colors.reset}`);
  }

  runSecureSetup() {
    log(`${colors.bright}${colors.magenta}🔒 CONFIGURACIÓN SEGURA DE VARIABLES DE ENTORNO${colors.reset}`);
    log(`${colors.cyan}Implementando buenas prácticas de seguridad para producción${colors.reset}\n`);

    const steps = [
      { name: 'Crear archivo .env unificado', method: () => this.createUnifiedEnvFile() },
      { name: 'Actualizar render.yaml', method: () => this.updateRenderYaml() },
      { name: 'Configurar microservicios', method: () => this.createMicroservicesEnv() },
      { name: 'Actualizar .gitignore', method: () => this.updateGitignore() },
      { name: 'Crear guía de seguridad', method: () => this.createSecurityGuide() }
    ];

    let successCount = 0;
    steps.forEach(step => {
      logInfo(`Ejecutando: ${step.name}`);
      if (step.method()) {
        successCount++;
      }
    });

    if (successCount === steps.length) {
      logSuccess(`\n✅ Todos los pasos completados exitosamente (${successCount}/${steps.length})`);
      this.generateReport();
    } else {
      logError(`\n❌ Algunos pasos fallaron (${successCount}/${steps.length})`);
    }
  }
}

// Ejecutar configuración segura
const secureSetup = new SecureEnvSetup();
secureSetup.runSecureSetup(); 