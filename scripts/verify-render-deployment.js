#!/usr/bin/env node

/**
 * Script de verificación rápida para Render
 * Verifica que el despliegue esté funcionando correctamente
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
config();

console.log('🔍 ===== VERIFICACIÓN RENDER DEPLOYMENT =====');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`📁 PWD: ${process.cwd()}`);

// Verificaciones rápidas
const checks = [];

// 1. Verificar archivo de build
if (fs.existsSync('dist/index.js')) {
  console.log('✅ dist/index.js existe');
  checks.push(true);
} else {
  console.log('❌ dist/index.js NO existe');
  checks.push(false);
}

// 2. Verificar package.json
if (fs.existsSync('package.json')) {
  console.log('✅ package.json existe');
  checks.push(true);
} else {
  console.log('❌ package.json NO existe');
  checks.push(false);
}

// 3. Verificar variables de entorno críticas
const criticalVars = ['DATABASE_URL', 'NODE_ENV', 'PORT'];
let envChecks = 0;

criticalVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName} configurada`);
    envChecks++;
  } else {
    console.log(`❌ ${varName} NO configurada`);
  }
});

checks.push(envChecks === criticalVars.length);

// 4. Verificar estructura de directorios
const requiredDirs = ['server', 'client', 'shared', 'scripts'];
let dirChecks = 0;

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`✅ ${dir}/ existe`);
    dirChecks++;
  } else {
    console.log(`❌ ${dir}/ NO existe`);
  }
});

checks.push(dirChecks === requiredDirs.length);

// 5. Verificar archivos de configuración
const configFiles = ['tsconfig.json', 'vite.config.ts', 'render.yaml'];
let configChecks = 0;

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
    configChecks++;
  } else {
    console.log(`⚠️ ${file} NO existe`);
  }
});

checks.push(configChecks >= 2); // Al menos 2 de 3 archivos

// Resumen
console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
console.log(`✅ Verificaciones exitosas: ${checks.filter(Boolean).length}/${checks.length}`);

if (checks.every(Boolean)) {
  console.log('🎉 ¡Todas las verificaciones pasaron! El despliegue está listo.');
  console.log('🚀 La aplicación debería funcionar correctamente en Render.');
} else {
  console.log('⚠️ Algunas verificaciones fallaron. Revisa los errores anteriores.');
  console.log('🔧 Ejecuta el script de diagnóstico completo para más detalles.');
}

console.log('\n🎯 ===== VERIFICACIÓN COMPLETADA ====='); 