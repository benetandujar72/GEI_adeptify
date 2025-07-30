#!/usr/bin/env node

/**
 * Script para verificar la configuración de despliegue en Render
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function verifyRenderConfig() {
  console.log('🔍 Verificando configuración para Render.com...\n');

  // Verificar render.yaml
  const renderPath = path.join(process.cwd(), 'render.yaml');
  if (!fs.existsSync(renderPath)) {
    console.error('❌ render.yaml no encontrado');
    return false;
  }

  const renderContent = fs.readFileSync(renderPath, 'utf8');
  console.log('✅ render.yaml encontrado');

  // Verificar elementos críticos en render.yaml
  const checks = [
    { name: 'Build command', pattern: /buildCommand:/, required: true },
    { name: 'Start command', pattern: /startCommand:/, required: true },
    { name: 'Health check path', pattern: /healthCheckPath:/, required: true },
    { name: 'Environment variables', pattern: /envVars:/, required: true },
    { name: 'DATABASE_URL', pattern: /DATABASE_URL/, required: true },
    { name: 'SESSION_SECRET', pattern: /SESSION_SECRET/, required: true },
    { name: 'JWT_SECRET', pattern: /JWT_SECRET/, required: true },
    { name: 'NODE_ENV', pattern: /NODE_ENV.*production/, required: true },
    { name: 'PORT', pattern: /PORT.*3000/, required: true }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (check.required && !check.pattern.test(renderContent)) {
      console.error(`  ❌ ${check.name} no encontrado o incorrecto`);
      allPassed = false;
    } else {
      console.log(`  ✅ ${check.name} configurado`);
    }
  });

  // Verificar script de inicio
  const startScriptPath = path.join(process.cwd(), 'scripts/start-render.sh');
  if (!fs.existsSync(startScriptPath)) {
    console.error('❌ scripts/start-render.sh no encontrado');
    allPassed = false;
  } else {
    console.log('✅ scripts/start-render.sh encontrado');
  }

  // Verificar package.json scripts
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageContent.scripts || {};
    
    if (!scripts['build:server']) {
      console.error('❌ Script build:server no encontrado en package.json');
      allPassed = false;
    } else {
      console.log('✅ Script build:server encontrado');
    }

    if (!scripts['build:client']) {
      console.error('❌ Script build:client no encontrado en package.json');
      allPassed = false;
    } else {
      console.log('✅ Script build:client encontrado');
    }
  }

  // Verificar archivo de build
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.warn('⚠️  Directorio dist no encontrado (se creará durante el build)');
  } else {
    console.log('✅ Directorio dist encontrado');
  }

  // Verificar variables de entorno críticas
  console.log('\n🔧 Variables de entorno críticas en render.yaml:');
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

  criticalVars.forEach(varName => {
    if (renderContent.includes(varName)) {
      console.log(`  ✅ ${varName} configurada`);
    } else {
      console.error(`  ❌ ${varName} no configurada`);
      allPassed = false;
    }
  });

  return allPassed;
}

function showRenderInstructions() {
  console.log('\n📋 Instrucciones para despliegue en Render:');
  console.log('1. Ve a https://render.com');
  console.log('2. Crea un nuevo Web Service');
  console.log('3. Conecta tu repositorio de GitHub');
  console.log('4. Configura las variables de entorno:');
  console.log('   - DATABASE_URL');
  console.log('   - SESSION_SECRET');
  console.log('   - JWT_SECRET');
  console.log('   - GOOGLE_CLIENT_ID');
  console.log('   - GOOGLE_CLIENT_SECRET');
  console.log('   - GEMINI_API_KEY');
  console.log('5. Configura el Build Command: npm run build:server && npm run build:client');
  console.log('6. Configura el Start Command: ./scripts/start-render.sh');
  console.log('7. Configura el Health Check Path: /health');
}

function main() {
  const isValid = verifyRenderConfig();
  
  console.log('\n📊 Resumen de verificación:');
  if (isValid) {
    console.log('✅ Configuración para Render.com válida');
    console.log('🚀 Listo para despliegue');
  } else {
    console.log('❌ Se encontraron problemas en la configuración');
    console.log('💡 Revisa los errores anteriores');
  }

  showRenderInstructions();
}

// Ejecutar si es el archivo principal
main(); 