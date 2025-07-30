#!/usr/bin/env node

/**
 * Script de validación de variables de entorno críticas
 * Verifica que todas las variables necesarias estén configuradas
 */

const fs = require('fs');
const path = require('path');

// Variables críticas requeridas
const requiredVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'SESSION_SECRET',
  'JWT_SECRET',
  'CORS_ORIGIN'
];

// Variables importantes (advertencia si faltan)
const importantVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'REDIS_URL',
  'SMTP_HOST',
  'PRODUCTION_URL',
  'API_BASE_URL'
];

// Variables opcionales
const optionalVars = [
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'ALLOWED_ORIGINS',
  'GOOGLE_CALLBACK_URL',
  'GOOGLE_CALENDAR_ENABLED',
  'STRIPE_SECRET_KEY',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'LOG_LEVEL',
  'ENABLE_DEBUG_LOGS',
  'ADEPTIFY_ENABLED',
  'ASSISTATUT_ENABLED',
  'ENABLE_CACHE',
  'ENABLE_RATE_LIMITING'
];

function validateEnvironment() {
  console.log('🔍 Validando variables de entorno...\n');
  
  // Verificar variables críticas
  const missingCritical = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingCritical.length > 0) {
    console.error('❌ ERROR: Variables críticas faltantes:');
    missingCritical.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Solución: Configura estas variables en tu archivo .env o en el entorno');
    process.exit(1);
  }
  
  console.log('✅ Variables críticas configuradas correctamente');
  
  // Verificar variables importantes
  const missingImportant = importantVars.filter(varName => !process.env[varName]);
  
  if (missingImportant.length > 0) {
    console.log('\n⚠️  Variables importantes no configuradas:');
    missingImportant.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Nota: Estas variables son importantes para funcionalidades específicas');
  } else {
    console.log('✅ Todas las variables importantes están configuradas');
  }
  
  // Verificar variables opcionales
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingOptional.length > 0) {
    console.log('\nℹ️  Variables opcionales no configuradas:');
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Nota: Estas variables son opcionales y no afectan el funcionamiento básico');
  } else {
    console.log('✅ Todas las variables opcionales están configuradas');
  }
  
  // Verificar formato de variables críticas
  validateVariableFormats();
  
  console.log('\n🎉 Validación completada exitosamente');
}

function validateVariableFormats() {
  console.log('\n🔧 Validando formato de variables...');
  
  // Validar DATABASE_URL
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.warn('⚠️  DATABASE_URL no parece ser una URL de PostgreSQL válida');
    } else {
      console.log('✅ DATABASE_URL tiene formato válido');
    }
  }
  
  // Validar JWT_SECRET
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  JWT_SECRET es muy corto (mínimo 32 caracteres recomendado)');
    } else {
      console.log('✅ JWT_SECRET tiene longitud adecuada');
    }
  }
  
  // Validar SESSION_SECRET
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  SESSION_SECRET es muy corto (mínimo 32 caracteres recomendado)');
    } else {
      console.log('✅ SESSION_SECRET tiene longitud adecuada');
    }
  }
  
  // Validar NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    console.warn('⚠️  NODE_ENV debe ser development, production o test');
  } else {
    console.log('✅ NODE_ENV tiene valor válido');
  }
  
  // Validar CORS_ORIGIN
  if (process.env.CORS_ORIGIN) {
    if (!process.env.CORS_ORIGIN.startsWith('http')) {
      console.warn('⚠️  CORS_ORIGIN debe ser una URL válida');
    } else {
      console.log('✅ CORS_ORIGIN tiene formato válido');
    }
  }
  
  // Validar claves API si están presentes
  const apiKeys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
  apiKeys.forEach(key => {
    if (process.env[key]) {
      if (process.env[key].startsWith('sk-') || process.env[key].startsWith('AIza')) {
        console.log(`✅ ${key} tiene formato válido`);
      } else {
        console.warn(`⚠️  ${key} no tiene el formato esperado`);
      }
    }
  });
}

function generateSecureSecrets() {
  console.log('\n🔐 Generando secretos seguros...');
  
  const crypto = require('crypto');
  
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
  
  console.log('JWT_SECRET=' + jwtSecret);
  console.log('SESSION_SECRET=' + sessionSecret);
  console.log('JWT_REFRESH_SECRET=' + jwtRefreshSecret);
  
  console.log('\n💡 Copia estos valores a tu archivo .env o a Render.com');
}

function checkProductionEnv() {
  console.log('\n📄 Verificando archivo production.env...');
  
  const productionEnvPath = path.join(process.cwd(), 'production.env');
  
  if (fs.existsSync(productionEnvPath)) {
    const content = fs.readFileSync(productionEnvPath, 'utf8');
    
    // Verificar que no hay claves reales
    const realKeyPatterns = [
      /sk-[a-zA-Z0-9]{48}/,
      /AIza[a-zA-Z0-9_-]{35}/,
      /ghp_[a-zA-Z0-9]{36}/
    ];
    
    let hasRealKeys = false;
    realKeyPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        console.error('❌ ERROR: Se encontraron claves API reales en production.env');
        hasRealKeys = true;
      }
    });
    
    if (!hasRealKeys) {
      console.log('✅ production.env no contiene claves API reales');
    }
    
    // Verificar variables críticas
    const missingInFile = requiredVars.filter(varName => !content.includes(varName));
    
    if (missingInFile.length > 0) {
      console.warn('⚠️  Variables críticas faltantes en production.env:');
      missingInFile.forEach(varName => {
        console.warn(`   - ${varName}`);
      });
    } else {
      console.log('✅ Todas las variables críticas están en production.env');
    }
    
  } else {
    console.warn('⚠️  Archivo production.env no encontrado');
  }
}

function showHelp() {
  console.log(`
🔍 Validador de Variables de Entorno - GEI Adeptify

Uso:
  node scripts/validate-env.js          # Validar variables actuales
  node scripts/validate-env.js --gen    # Generar secretos seguros
  node scripts/validate-env.js --check  # Verificar archivo production.env
  node scripts/validate-env.js --help   # Mostrar esta ayuda

Variables críticas requeridas:
  - DATABASE_URL: URL de conexión a PostgreSQL
  - NODE_ENV: Entorno (development/production/test)
  - SESSION_SECRET: Clave secreta para sesiones (mínimo 32 caracteres)
  - JWT_SECRET: Clave secreta para JWT (mínimo 32 caracteres)
  - CORS_ORIGIN: URL de origen permitida

Variables importantes:
  - GOOGLE_CLIENT_ID: ID de cliente de Google OAuth
  - GOOGLE_CLIENT_SECRET: Secreto de cliente de Google OAuth
  - GEMINI_API_KEY: Clave API de Google Gemini
  - OPENAI_API_KEY: Clave API de OpenAI
  - ANTHROPIC_API_KEY: Clave API de Anthropic
  - REDIS_URL: URL de conexión a Redis
  - SMTP_HOST: Servidor SMTP
  - PRODUCTION_URL: URL de producción
  - API_BASE_URL: URL base de la API

Variables opcionales:
  - JWT_REFRESH_SECRET: Clave para refresh tokens
  - JWT_EXPIRES_IN: Tiempo de expiración de JWT
  - ALLOWED_ORIGINS: Orígenes permitidos para CORS
  - GOOGLE_CALLBACK_URL: URL de callback de Google
  - STRIPE_SECRET_KEY: Clave secreta de Stripe
  - SMTP_USER: Usuario SMTP
  - SMTP_PASS: Contraseña SMTP
  - EMAIL_FROM: Email de origen
  - LOG_LEVEL: Nivel de logging
  - ADEPTIFY_ENABLED: Habilitar módulo Adeptify
  - ASSISTATUT_ENABLED: Habilitar módulo Assistatut
`);
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--gen')) {
  generateSecureSecrets();
  process.exit(0);
}

if (args.includes('--check')) {
  checkProductionEnv();
  process.exit(0);
}

// Ejecutar validación
validateEnvironment(); 