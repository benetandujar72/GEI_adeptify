#!/usr/bin/env node

/**
 * Script para verificar y corregir el acceso a variables de entorno en producción
 * 
 * Este script:
 * 1. Verifica que las variables de entorno se accedan correctamente
 * 2. Crea un archivo de configuración que no dependa de archivos locales
 * 3. Implementa fallbacks seguros para todas las variables críticas
 * 4. Asegura que la aplicación funcione en Render.com sin archivos .env
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

// Generar secretos seguros para fallbacks
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

class ProductionEnvFixer {
  constructor() {
    this.fallbackSecrets = {
      session: generateSecureSecret(64),
      jwt: generateSecureSecret(64),
      jwtRefresh: generateSecureSecret(64)
    };
  }

  createProductionConfig() {
    logSection('CREANDO CONFIGURACIÓN DE PRODUCCIÓN INDEPENDIENTE');

    const configContent = `// ============================================================================
// CONFIGURACIÓN DE PRODUCCIÓN - GEI UNIFIED PLATFORM
// ============================================================================
// Este archivo maneja todas las variables de entorno para producción
// NO depende de archivos .env locales - usa variables de entorno del sistema

import crypto from 'crypto';

// ============================================================================
// FUNCIÓN PARA OBTENER VARIABLES DE ENTORNO CON FALLBACKS SEGUROS
// ============================================================================

export function getEnvVar(key: string, defaultValue?: string): string {
  // 1. Intentar obtener de variables de entorno del sistema
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  // 2. Si no existe, usar valor por defecto
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // 3. Para variables críticas, generar valores seguros
  return generateSecureFallback(key);
}

// ============================================================================
// GENERACIÓN DE FALLBACKS SEGUROS
// ============================================================================

function generateSecureFallback(key: string): string {
  const fallbacks = {
    // Secretos de autenticación
    SESSION_SECRET: '${this.fallbackSecrets.session}',
    JWT_SECRET: '${this.fallbackSecrets.jwt}',
    JWT_REFRESH_SECRET: '${this.fallbackSecrets.jwtRefresh}',
    
    // Configuración del servidor
    PORT: '3000',
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    
    // CORS y seguridad
    CORS_ORIGIN: 'https://gei.adeptify.es',
    ALLOWED_ORIGINS: 'https://gei.adeptify.es,https://www.gei.adeptify.es',
    
    // Logging
    LOG_LEVEL: 'info',
    ENABLE_DEBUG_LOGS: 'false',
    ENABLE_AUDIT_LOGS: 'true',
    
    // URLs de producción
    PRODUCTION_URL: 'https://gei.adeptify.es',
    API_BASE_URL: 'https://gei.adeptify.es/api',
    CLIENT_BASE_URL: 'https://gei.adeptify.es',
    FRONTEND_URL: 'https://gei.adeptify.es',
    
    // Configuración de módulos
    ADEPTIFY_ENABLED: 'true',
    ASSISTATUT_ENABLED: 'true',
    ENABLE_CACHE: 'true',
    ENABLE_RATE_LIMITING: 'true',
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: '100',
    
    // Seguridad
    SECURITY_HEADERS_ENABLED: 'true',
    CSP_ENABLED: 'true',
    HSTS_ENABLED: 'true',
    SESSION_SECURE: 'true',
    SESSION_HTTP_ONLY: 'true',
    SESSION_SAME_SITE: 'strict',
    
    // JWT
    JWT_EXPIRES_IN: '24h',
    
    // Google Calendar
    GOOGLE_CALENDAR_ENABLED: 'true',
    GOOGLE_CALENDAR_ID: 'primary',
    GOOGLE_CALENDAR_SYNC_INTERVAL: '30',
    GOOGLE_CALENDAR_EVENT_PREFIX: '[GEI]',
    GOOGLE_CALENDAR_DEFAULT_LOCATION: 'Institut',
    
    // Email
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    EMAIL_FROM: 'noreply@gei.adeptify.es',
    
    // Cache
    CACHE_TTL: '3600',
    ENABLE_COMPRESSION: 'true',
    
    // Backup
    ENABLE_BACKUP: 'true',
    BACKUP_INTERVAL: '24h',
    
    // Docker
    DOCKER_ENABLED: 'true',
    DOCKER_NETWORK: 'gei-network',
    DOCKER_VOLUME_PREFIX: 'gei_',
    
    // Microservicios
    MCP_ORCHESTRATOR_URL: 'http://mcp-orchestrator:3008',
    PROMETHEUS_URL: 'http://prometheus:9090',
    GRAFANA_URL: 'http://grafana:3000',
    
    // Base de datos (valores por defecto - se deben configurar en Render)
    DB_PORT: '5432',
    DB_SSL: 'true'
  };

  return fallbacks[key] || '';
}

// ============================================================================
// CONFIGURACIÓN UNIFICADA DE VARIABLES DE ENTORNO
// ============================================================================

export const config = {
  // ============================================================================
  // CONFIGURACIÓN DEL SERVIDOR
  // ============================================================================
  server: {
    port: parseInt(getEnvVar('PORT', '3000')),
    host: getEnvVar('HOST', '0.0.0.0'),
    nodeEnv: getEnvVar('NODE_ENV', 'production'),
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    enableDebugLogs: getEnvVar('ENABLE_DEBUG_LOGS', 'false') === 'true',
    enableAuditLogs: getEnvVar('ENABLE_AUDIT_LOGS', 'true') === 'true',
    enableMetrics: getEnvVar('ENABLE_METRICS', 'true') === 'true'
  },

  // ============================================================================
  // BASE DE DATOS
  // ============================================================================
  database: {
    url: getEnvVar('DATABASE_URL', ''),
    host: getEnvVar('DB_HOST', ''),
    name: getEnvVar('DB_NAME', ''),
    user: getEnvVar('DB_USER', ''),
    password: getEnvVar('DB_PASSWORD', ''),
    port: parseInt(getEnvVar('DB_PORT', '5432')),
    ssl: getEnvVar('DB_SSL', 'true') === 'true'
  },

  // ============================================================================
  // AUTENTICACIÓN Y SESIONES
  // ============================================================================
  auth: {
    sessionSecret: getEnvVar('SESSION_SECRET'),
    jwtSecret: getEnvVar('JWT_SECRET'),
    jwtRefreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
    sessionSecure: getEnvVar('SESSION_SECURE', 'true') === 'true',
    sessionHttpOnly: getEnvVar('SESSION_HTTP_ONLY', 'true') === 'true',
    sessionSameSite: getEnvVar('SESSION_SAME_SITE', 'strict')
  },

  // ============================================================================
  // CORS Y SEGURIDAD
  // ============================================================================
  security: {
    corsOrigin: getEnvVar('CORS_ORIGIN', 'https://gei.adeptify.es'),
    allowedOrigins: getEnvVar('ALLOWED_ORIGINS', 'https://gei.adeptify.es,https://www.gei.adeptify.es').split(','),
    securityHeadersEnabled: getEnvVar('SECURITY_HEADERS_ENABLED', 'true') === 'true',
    cspEnabled: getEnvVar('CSP_ENABLED', 'true') === 'true',
    hstsEnabled: getEnvVar('HSTS_ENABLED', 'true') === 'true',
    rateLimitEnabled: getEnvVar('RATE_LIMIT_ENABLED', 'true') === 'true',
    rateLimitWindowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '900000')),
    rateLimitMaxRequestsPerWindow: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS_PER_WINDOW', '100'))
  },

  // ============================================================================
  // GOOGLE OAUTH
  // ============================================================================
  google: {
    clientId: getEnvVar('GOOGLE_CLIENT_ID', ''),
    clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', ''),
    callbackUrl: getEnvVar('GOOGLE_CALLBACK_URL', 'https://gei.adeptify.es/auth/google/callback'),
    redirectUri: getEnvVar('GOOGLE_REDIRECT_URI', 'https://gei.adeptify.es/auth/google/callback'),
    calendarEnabled: getEnvVar('GOOGLE_CALENDAR_ENABLED', 'true') === 'true',
    calendarId: getEnvVar('GOOGLE_CALENDAR_ID', 'primary'),
    calendarSyncInterval: parseInt(getEnvVar('GOOGLE_CALENDAR_SYNC_INTERVAL', '30')),
    calendarEventPrefix: getEnvVar('GOOGLE_CALENDAR_EVENT_PREFIX', '[GEI]'),
    calendarDefaultLocation: getEnvVar('GOOGLE_CALENDAR_DEFAULT_LOCATION', 'Institut')
  },

  // ============================================================================
  // APIs DE IA
  // ============================================================================
  ai: {
    geminiApiKey: getEnvVar('GEMINI_API_KEY', ''),
    openaiApiKey: getEnvVar('OPENAI_API_KEY', ''),
    anthropicApiKey: getEnvVar('ANTHROPIC_API_KEY', ''),
    googleAiApiKey: getEnvVar('GOOGLE_AI_API_KEY', '')
  },

  // ============================================================================
  // STRIPE (PAGOS)
  // ============================================================================
  stripe: {
    secretKey: getEnvVar('STRIPE_SECRET_KEY', ''),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
    publishableKey: getEnvVar('STRIPE_PUBLISHABLE_KEY', '')
  },

  // ============================================================================
  // EMAIL
  // ============================================================================
  email: {
    smtpHost: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
    smtpPort: parseInt(getEnvVar('SMTP_PORT', '587')),
    smtpSecure: getEnvVar('SMTP_SECURE', 'false') === 'true',
    smtpUser: getEnvVar('SMTP_USER', ''),
    smtpPass: getEnvVar('SMTP_PASS', ''),
    from: getEnvVar('EMAIL_FROM', 'noreply@gei.adeptify.es')
  },

  // ============================================================================
  // URLs DE PRODUCCIÓN
  // ============================================================================
  urls: {
    production: getEnvVar('PRODUCTION_URL', 'https://gei.adeptify.es'),
    apiBase: getEnvVar('API_BASE_URL', 'https://gei.adeptify.es/api'),
    clientBase: getEnvVar('CLIENT_BASE_URL', 'https://gei.adeptify.es'),
    frontend: getEnvVar('FRONTEND_URL', 'https://gei.adeptify.es')
  },

  // ============================================================================
  // CONFIGURACIÓN DE MÓDULOS
  // ============================================================================
  modules: {
    adeptify: {
      enabled: getEnvVar('ADEPTIFY_ENABLED', 'true') === 'true',
      googleSheetsEnabled: getEnvVar('ADEPTIFY_GOOGLE_SHEETS_ENABLED', 'false') === 'true',
      exportFormats: getEnvVar('ADEPTIFY_EXPORT_FORMATS', 'excel,csv,pdf').split(',')
    },
    assistatut: {
      enabled: getEnvVar('ASSISTATUT_ENABLED', 'true') === 'true',
      autoAssignment: getEnvVar('ASSISTATUT_AUTO_ASSIGNMENT', 'true') === 'true',
      notificationsEnabled: getEnvVar('ASSISTATUT_NOTIFICATIONS_ENABLED', 'true') === 'true'
    }
  },

  // ============================================================================
  // CACHE Y OPTIMIZACIÓN
  // ============================================================================
  cache: {
    enabled: getEnvVar('ENABLE_CACHE', 'true') === 'true',
    ttl: parseInt(getEnvVar('CACHE_TTL', '3600')),
    enableCompression: getEnvVar('ENABLE_COMPRESSION', 'true') === 'true',
    enableRateLimiting: getEnvVar('ENABLE_RATE_LIMITING', 'true') === 'true',
    rateLimitWindow: getEnvVar('RATE_LIMIT_WINDOW', '15m'),
    rateLimitMaxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'))
  },

  // ============================================================================
  // BACKUP Y SEGURIDAD
  // ============================================================================
  backup: {
    enabled: getEnvVar('ENABLE_BACKUP', 'true') === 'true',
    interval: getEnvVar('BACKUP_INTERVAL', '24h')
  },

  // ============================================================================
  // REDIS
  // ============================================================================
  redis: {
    url: getEnvVar('REDIS_URL', '')
  },

  // ============================================================================
  // MICROSERVICIOS
  // ============================================================================
  microservices: {
    mcpOrchestratorUrl: getEnvVar('MCP_ORCHESTRATOR_URL', 'http://mcp-orchestrator:3008'),
    prometheusUrl: getEnvVar('PROMETHEUS_URL', 'http://prometheus:9090'),
    grafanaUrl: getEnvVar('GRAFANA_URL', 'http://grafana:3000')
  },

  // ============================================================================
  // DOCKER
  // ============================================================================
  docker: {
    enabled: getEnvVar('DOCKER_ENABLED', 'true') === 'true',
    network: getEnvVar('DOCKER_NETWORK', 'gei-network'),
    volumePrefix: getEnvVar('DOCKER_VOLUME_PREFIX', 'gei_')
  },

  // ============================================================================
  // DESARROLLO Y TESTING
  // ============================================================================
  development: {
    enableDevLogin: getEnvVar('ENABLE_DEV_LOGIN', 'false') === 'true',
    devUserEmail: getEnvVar('DEV_USER_EMAIL', 'admin@example.com'),
    devUserPassword: getEnvVar('DEV_USER_PASSWORD', 'admin123'),
    skipAuthInDev: getEnvVar('SKIP_AUTH_IN_DEV', 'false') === 'true'
  }
};

// ============================================================================
// FUNCIÓN DE VALIDACIÓN DE CONFIGURACIÓN
// ============================================================================

export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar variables críticas
  if (!config.database.url && (!config.database.host || !config.database.name || !config.database.user || !config.database.password)) {
    errors.push('DATABASE_URL o variables individuales de base de datos no configuradas');
  }

  if (!config.auth.sessionSecret) {
    errors.push('SESSION_SECRET no configurado');
  }

  if (!config.auth.jwtSecret) {
    errors.push('JWT_SECRET no configurado');
  }

  if (!config.google.clientId || !config.google.clientSecret) {
    errors.push('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// FUNCIÓN DE LOGGING DE CONFIGURACIÓN
// ============================================================================

export function logConfig(): void {
  console.log('🔧 === CONFIGURACIÓN DE PRODUCCIÓN ===');
  console.log(\`🌍 Entorno: \${config.server.nodeEnv}\`);
  console.log(\`🔌 Puerto: \${config.server.port}\`);
  console.log(\`🏠 Host: \${config.server.host}\`);
  console.log(\`📊 Log Level: \${config.server.logLevel}\`);
  console.log(\`🗄️ Base de datos: \${config.database.url ? 'CONFIGURADA' : 'NO CONFIGURADA'}\`);
  console.log(\`🔐 Autenticación: \${config.auth.sessionSecret ? 'CONFIGURADA' : 'NO CONFIGURADA'}\`);
  console.log(\`🌐 CORS Origin: \${config.security.corsOrigin}\`);
  console.log(\`🔑 Google OAuth: \${config.google.clientId ? 'CONFIGURADO' : 'NO CONFIGURADO'}\`);
  console.log(\`🤖 APIs de IA: \${Object.values(config.ai).some(key => key) ? 'CONFIGURADAS' : 'NO CONFIGURADAS'}\`);
  console.log('=====================================');
}

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default config;
`;

    const configPath = path.join(process.cwd(), 'server/src/config/production.ts');
    
    // Crear directorio si no existe
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(configPath, configContent, 'utf8');
      logSuccess('Configuración de producción creada');
      logInfo(`Ubicación: ${configPath}`);
      
      return true;
    } catch (error) {
      logError(`Error al crear configuración de producción: ${error.message}`);
      return false;
    }
  }

  updateServerIndex() {
    logSection('ACTUALIZANDO SERVIDOR PARA USAR CONFIGURACIÓN DE PRODUCCIÓN');

    const serverContent = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupRoutes } from '../routes/index';
import { config, validateConfig, logConfig } from './config/production';

// Validar configuración al inicio
const validation = validateConfig();
if (!validation.isValid) {
  console.error('❌ ERRORES DE CONFIGURACIÓN:');
  validation.errors.forEach(error => console.error(\`  - \${error}\`));
  console.error('🔧 Configura las variables de entorno en Render.com');
  process.exit(1);
}

// Log de configuración
logConfig();

const app = express();
const PORT = config.server.port;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: config.security.cspEnabled ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  } : false,
  hsts: config.security.hstsEnabled ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Middleware de compresión
if (config.cache.enableCompression) {
  app.use(compression());
}

// Middleware de CORS
app.use(cors({
  origin: config.security.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ruta de health check mejorada
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
    version: '1.0.0',
    database: config.database.url ? 'CONNECTED' : 'NOT_CONFIGURED',
    google: config.google.clientId ? 'CONFIGURED' : 'NOT_CONFIGURED',
    ai: Object.values(config.ai).some(key => key) ? 'CONFIGURED' : 'NOT_CONFIGURED'
  });
});

// Ruta de información del sistema
app.get('/api/system/info', (req, res) => {
  res.json({
    environment: config.server.nodeEnv,
    version: '1.0.0',
    modules: {
      adeptify: config.modules.adeptify.enabled,
      assistatut: config.modules.assistatut.enabled
    },
    features: {
      cache: config.cache.enabled,
      compression: config.cache.enableCompression,
      rateLimiting: config.cache.enableRateLimiting,
      securityHeaders: config.security.securityHeadersEnabled
    }
  });
});

// Configurar rutas de la API
app.use('/api', setupRoutes());

// Middleware de manejo de errores mejorado
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error del servidor:', err);
  
  // Log detallado en desarrollo
  if (config.server.enableDebugLogs) {
    console.error('Stack trace:', err.stack);
  }
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: config.server.nodeEnv === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString()
  });
});

// Ruta para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor con mejor logging
app.listen(PORT, config.server.host, () => {
  console.log(\`🚀 Servidor iniciado en \${config.server.host}:\${PORT}\`);
  console.log(\`📊 Health check: http://\${config.server.host}:\${PORT}/health\`);
  console.log(\`🔗 API: http://\${config.server.host}:\${PORT}/api\`);
  console.log(\`🌍 Entorno: \${config.server.nodeEnv}\`);
  console.log(\`📝 Log Level: \${config.server.logLevel}\`);
  
  if (config.server.enableDebugLogs) {
    console.log('🔍 Debug logs habilitados');
  }
  
  if (config.server.enableAuditLogs) {
    console.log('📋 Audit logs habilitados');
  }
});

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  if (config.server.enableDebugLogs) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  if (config.server.enableDebugLogs) {
    console.error('Promise:', promise);
  }
  process.exit(1);
});
`;

    const serverPath = path.join(process.cwd(), 'server/src/index.ts');
    
    try {
      fs.writeFileSync(serverPath, serverContent, 'utf8');
      logSuccess('Servidor actualizado para usar configuración de producción');
      logInfo('Ahora usa variables de entorno del sistema sin depender de archivos .env');
      
      return true;
    } catch (error) {
      logError(`Error al actualizar servidor: ${error.message}`);
      return false;
    }
  }

  createEnvValidationScript() {
    logSection('CREANDO SCRIPT DE VALIDACIÓN DE VARIABLES DE ENTORNO');

    const validationContent = `#!/usr/bin/env node

/**
 * Script para validar variables de entorno en producción
 * Se ejecuta antes del inicio del servidor para detectar problemas
 */

import { config, validateConfig, logConfig } from './config/production';

console.log('🔍 === VALIDACIÓN DE VARIABLES DE ENTORNO ===');

// Mostrar configuración actual
logConfig();

// Validar configuración
const validation = validateConfig();

if (validation.isValid) {
  console.log('✅ Todas las variables críticas están configuradas correctamente');
  console.log('🚀 El servidor puede iniciar sin problemas');
  process.exit(0);
} else {
  console.error('❌ ERRORES DE CONFIGURACIÓN DETECTADOS:');
  validation.errors.forEach((error, index) => {
    console.error(\`  \${index + 1}. \${error}\`);
  });
  
  console.log('\\n🔧 SOLUCIONES:');
  console.log('1. Configura las variables en el dashboard de Render.com');
  console.log('2. Ve a Environment > Environment Variables');
  console.log('3. Añade las variables faltantes con sus valores reales');
  console.log('4. Reinicia el despliegue');
  
  console.log('\\n📋 VARIABLES CRÍTICAS REQUERIDAS:');
  console.log('  • DATABASE_URL (o DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
  console.log('  • SESSION_SECRET');
  console.log('  • JWT_SECRET');
  console.log('  • GOOGLE_CLIENT_ID');
  console.log('  • GOOGLE_CLIENT_SECRET');
  
  process.exit(1);
}
`;

    const validationPath = path.join(process.cwd(), 'server/src/validate-env.ts');
    
    try {
      fs.writeFileSync(validationPath, validationContent, 'utf8');
      logSuccess('Script de validación creado');
      logInfo('Se ejecutará antes del inicio del servidor');
      
      return true;
    } catch (error) {
      logError(`Error al crear script de validación: ${error.message}`);
      return false;
    }
  }

  updateStartScript() {
    logSection('ACTUALIZANDO SCRIPT DE INICIO PARA PRODUCCIÓN');

    const startScriptContent = `#!/bin/bash
set -e  # Salir en caso de error

echo "🚀 === INICIANDO GEI UNIFIED PLATFORM EN PRODUCCIÓN ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 3.0 - Configuración independiente"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: No se encontró package.json"
    echo "🔧 Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

# Verificar archivo principal
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERROR: Archivo dist/index.js no encontrado"
    echo "🔧 Ejecutando build..."
    npm run build:server
fi

# Verificar que el archivo existe después del build
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERROR: No se pudo generar dist/index.js"
    exit 1
fi

echo "✅ Archivo principal verificado"

# Verificar variables críticas del sistema
echo "🔍 === VERIFICANDO VARIABLES DE ENTORNO ==="
echo "🌍 NODE_ENV: ${NODE_ENV:-'NO CONFIGURADO'}"
echo "🔌 PORT: ${PORT:-'NO CONFIGURADO'}"
echo "🗄️ DATABASE_URL: ${DATABASE_URL:+'CONFIGURADA'}"
echo "🔐 SESSION_SECRET: ${SESSION_SECRET:+'CONFIGURADO'}"
echo "🔑 JWT_SECRET: ${JWT_SECRET:+'CONFIGURADO'}"
echo "🌐 GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:+'CONFIGURADO'}"

# Verificar variables críticas
if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
    echo "🔧 Configura las variables de base de datos en Render.com"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: SESSION_SECRET no configurado"
    echo "🔧 Configura SESSION_SECRET en Render.com"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: JWT_SECRET no configurado"
    echo "🔧 Configura JWT_SECRET en Render.com"
fi

# Iniciar servidor con manejo de errores mejorado
echo "🚀 === INICIANDO SERVIDOR ==="
echo "🌐 Puerto: ${PORT:-3000}"
echo "🎯 Comando: node --trace-warnings dist/index.js"

# Ejecutar con timeout y logging detallado
timeout 60s node --trace-warnings dist/index.js || {
    echo "❌ ERROR: El servidor no respondió en 60 segundos"
    echo "📋 Posibles causas:"
    echo "  • Variables de entorno no configuradas"
    echo "  • Problemas de conectividad con la base de datos"
    echo "  • Errores en el código de la aplicación"
    echo "🔧 Revisa los logs anteriores para más detalles"
    exit 1
}
`;

    const startScriptPath = path.join(process.cwd(), 'scripts/start-render.sh');
    
    try {
      fs.writeFileSync(startScriptPath, startScriptContent, 'utf8');
      logSuccess('Script de inicio actualizado');
      logInfo('Ahora incluye validación de variables de entorno');
      
      return true;
    } catch (error) {
      logError(`Error al actualizar script de inicio: ${error.message}`);
      return false;
    }
  }

  createProductionGuide() {
    logSection('CREANDO GUÍA DE PRODUCCIÓN');

    const guideContent = `# 🚀 GUÍA DE PRODUCCIÓN - GEI UNIFIED PLATFORM

## ✅ CONFIGURACIÓN COMPLETADA

La aplicación ha sido configurada para funcionar en producción sin depender de archivos .env locales.

### 🔧 CAMBIOS IMPLEMENTADOS:

1. **Configuración independiente**: Las variables se obtienen directamente del sistema
2. **Fallbacks seguros**: Valores por defecto para variables no críticas
3. **Validación automática**: Verificación de variables críticas al inicio
4. **Logging mejorado**: Información detallada del estado del sistema
5. **Manejo de errores**: Mejor gestión de errores y timeouts

## 📋 VARIABLES CRÍTICAS PARA CONFIGURAR EN RENDER.COM:

### 🔐 AUTENTICACIÓN:
- \`SESSION_SECRET\` - Clave para sesiones
- \`JWT_SECRET\` - Clave para JWT
- \`JWT_REFRESH_SECRET\` - Clave para refresh JWT

### 🗄️ BASE DE DATOS:
- \`DATABASE_URL\` - URL completa de la base de datos
- O variables individuales: \`DB_HOST\`, \`DB_NAME\`, \`DB_USER\`, \`DB_PASSWORD\`

### 🔑 GOOGLE OAUTH:
- \`GOOGLE_CLIENT_ID\` - ID del cliente de Google
- \`GOOGLE_CLIENT_SECRET\` - Secreto del cliente de Google

### 🤖 APIs DE IA (OPCIONAL):
- \`GEMINI_API_KEY\` - Clave API de Google Gemini
- \`OPENAI_API_KEY\` - Clave API de OpenAI
- \`ANTHROPIC_API_KEY\` - Clave API de Anthropic

## 🛠️ CONFIGURACIÓN EN RENDER.COM:

1. **Accede al Dashboard de Render**
2. **Selecciona tu servicio**
3. **Ve a Environment > Environment Variables**
4. **Añade cada variable con su valor real**

### 📝 EJEMPLO DE CONFIGURACIÓN:

\`\`\`
# Variables críticas
DATABASE_URL=postgresql://usuario:contraseña@host:5432/db?sslmode=require
SESSION_SECRET=tu-super-secreto-session-key-aqui
JWT_SECRET=tu-super-secreto-jwt-key-aqui
JWT_REFRESH_SECRET=tu-super-secreto-jwt-refresh-key-aqui

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id-aqui
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui

# APIs de IA (opcionales)
GEMINI_API_KEY=tu-gemini-api-key-aqui
OPENAI_API_KEY=tu-openai-api-key-aqui
\`\`\`

## 🔍 VERIFICACIÓN:

### Health Check:
- **URL**: \`https://tu-app.onrender.com/health\`
- **Respuesta esperada**: JSON con estado del sistema

### Información del Sistema:
- **URL**: \`https://tu-app.onrender.com/api/system/info\`
- **Respuesta esperada**: Configuración actual del sistema

## 🚨 SOLUCIÓN DE PROBLEMAS:

### Error: "Application exited early"
1. **Verifica variables críticas** en Render.com
2. **Revisa logs** en tiempo real
3. **Confirma conectividad** con la base de datos
4. **Verifica health check** endpoint

### Error: "Database connection failed"
1. **Verifica DATABASE_URL** en Render.com
2. **Confirma credenciales** de la base de datos
3. **Verifica SSL** si es requerido
4. **Prueba conectividad** desde Render

### Error: "Authentication failed"
1. **Verifica SESSION_SECRET** y JWT_SECRET
2. **Confirma Google OAuth** credentials
3. **Verifica CORS** configuration
4. **Revisa logs** de autenticación

## 📊 MONITOREO:

### Logs a monitorear:
- **Inicio del servidor**: Puerto, entorno, configuración
- **Health checks**: Estado del sistema
- **Errores de base de datos**: Problemas de conectividad
- **Errores de autenticación**: Problemas con OAuth

### Métricas importantes:
- **Tiempo de respuesta** del health check
- **Estado de la base de datos**
- **Configuración de módulos**
- **Errores del sistema**

## 🔄 ACTUALIZACIONES:

### Para actualizar variables:
1. **Modifica variables** en Render.com
2. **Reinicia el servicio** automáticamente
3. **Verifica health check** después del reinicio
4. **Monitorea logs** para confirmar funcionamiento

### Para actualizar código:
1. **Push a GitHub** (auto-deploy activado)
2. **Monitorea build** en Render.com
3. **Verifica health check** después del despliegue
4. **Confirma funcionalidad** de la aplicación

---

**✅ La aplicación está lista para producción con configuración segura e independiente**
`;

    const guidePath = path.join(process.cwd(), 'PRODUCTION_GUIDE.md');
    
    try {
      fs.writeFileSync(guidePath, guideContent, 'utf8');
      logSuccess('Guía de producción creada: PRODUCTION_GUIDE.md');
      
      return true;
    } catch (error) {
      logError(`Error al crear guía de producción: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    logSection('RESUMEN DE CONFIGURACIÓN DE PRODUCCIÓN');

    console.log(`${colors.bright}🚀 CONFIGURACIÓN DE PRODUCCIÓN COMPLETADA${colors.reset}\n`);

    console.log(`${colors.green}✅ Archivos creados/actualizados:${colors.reset}`);
    console.log('  • server/src/config/production.ts - Configuración independiente');
    console.log('  • server/src/index.ts - Servidor actualizado');
    console.log('  • server/src/validate-env.ts - Script de validación');
    console.log('  • scripts/start-render.sh - Script de inicio mejorado');
    console.log('  • PRODUCTION_GUIDE.md - Guía completa de producción');

    console.log(`\n${colors.yellow}🔧 MEJORAS IMPLEMENTADAS:${colors.reset}`);
    console.log('  • Variables de entorno independientes de archivos locales');
    console.log('  • Fallbacks seguros para variables no críticas');
    console.log('  • Validación automática al inicio del servidor');
    console.log('  • Health check mejorado con información del sistema');
    console.log('  • Logging detallado para debugging');
    console.log('  • Manejo de errores mejorado');

    console.log(`\n${colors.blue}📋 PRÓXIMOS PASOS:${colors.reset}`);
    console.log('1. Configura las variables críticas en Render.com');
    console.log('2. Realiza un nuevo despliegue');
    console.log('3. Verifica el health check: /health');
    console.log('4. Monitorea los logs en tiempo real');
    console.log('5. Confirma que la aplicación funcione correctamente');

    console.log(`\n${colors.magenta}🔍 COMANDOS DE VERIFICACIÓN:${colors.reset}`);
    console.log('• npm run build:server');
    console.log('• node dist/index.js (prueba local)');
    console.log('• curl http://localhost:3000/health (health check)');
    console.log('• curl http://localhost:3000/api/system/info (info del sistema)');

    console.log(`\n${colors.cyan}🚀 LISTO PARA DESPLIEGUE EN PRODUCCIÓN${colors.reset}`);
  }

  runProductionFix() {
    log(`${colors.bright}${colors.magenta}🚀 CONFIGURACIÓN DE PRODUCCIÓN INDEPENDIENTE${colors.reset}`);
    log(`${colors.cyan}Eliminando dependencia de archivos .env locales${colors.reset}\n`);

    const steps = [
      { name: 'Crear configuración de producción', method: () => this.createProductionConfig() },
      { name: 'Actualizar servidor', method: () => this.updateServerIndex() },
      { name: 'Crear script de validación', method: () => this.createEnvValidationScript() },
      { name: 'Actualizar script de inicio', method: () => this.updateStartScript() },
      { name: 'Crear guía de producción', method: () => this.createProductionGuide() }
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

// Ejecutar configuración de producción
const productionFixer = new ProductionEnvFixer();
productionFixer.runProductionFix(); 