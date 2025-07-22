#!/usr/bin/env node

/**
 * Script de diagnóstico para problemas de inicio en Render.com
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Diagnóstico de inicio de GEI Unified Platform\n');

// 1. Verificar entorno
console.log('📋 Información del entorno:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'no configurado');
console.log('  PORT:', process.env.PORT || 'no configurado');
console.log('  PWD:', process.cwd());
console.log('  Node version:', process.version);
console.log('  Platform:', process.platform);
console.log('  Architecture:', process.arch);

// 2. Verificar variables de entorno críticas
console.log('\n🔑 Variables de entorno críticas:');
const criticalVars = [
  'DATABASE_URL',
  'DB_HOST', 
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
      console.log(`  ✅ ${varName}: CONFIGURADA (${value.length} caracteres)`);
    } else {
      console.log(`  ✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`  ❌ ${varName}: NO CONFIGURADA`);
  }
});

// 3. Verificar archivos de build
console.log('\n📦 Verificación de archivos de build:');
const buildFiles = [
  'dist/index.js',
  'dist/client/index.html',
  'package.json',
  'scripts/start.sh'
];

buildFiles.forEach(file => {
  if (existsSync(file)) {
    const stats = readFileSync(file, 'utf8');
    console.log(`  ✅ ${file}: EXISTE (${stats.length} bytes)`);
  } else {
    console.log(`  ❌ ${file}: NO EXISTE`);
  }
});

// 4. Verificar dependencias
console.log('\n📚 Verificación de dependencias:');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  console.log(`  ✅ package.json: Válido (${packageJson.dependencies ? Object.keys(packageJson.dependencies).length : 0} dependencias)`);
  
  // Verificar node_modules
  if (existsSync('node_modules')) {
    console.log('  ✅ node_modules: Existe');
  } else {
    console.log('  ❌ node_modules: No existe');
  }
} catch (error) {
  console.log('  ❌ package.json: Error al leer');
}

// 5. Verificar scripts de build
console.log('\n🔧 Verificación de scripts de build:');
try {
  console.log('  🔨 Ejecutando build...');
  execSync('npm run build', { stdio: 'pipe', timeout: 60000 });
  console.log('  ✅ Build ejecutado exitosamente');
  
  // Verificar resultado del build
  if (existsSync('dist/index.js')) {
    const buildSize = readFileSync('dist/index.js', 'utf8').length;
    console.log(`  ✅ dist/index.js: ${buildSize} bytes`);
  } else {
    console.log('  ❌ dist/index.js: No se generó');
  }
} catch (error) {
  console.log('  ❌ Build falló:', error.message);
}

// 6. Verificar conexión a base de datos
console.log('\n🗄️ Verificación de base de datos:');
try {
  console.log('  🔌 Probando conexión...');
  execSync('node scripts/test-db-simple.js', { stdio: 'pipe', timeout: 30000 });
  console.log('  ✅ Conexión a base de datos exitosa');
} catch (error) {
  console.log('  ❌ Conexión a base de datos falló:', error.message);
}

// 7. Verificar puerto
console.log('\n🔌 Verificación de puerto:');
const port = process.env.PORT || 3000;
console.log(`  Puerto configurado: ${port}`);

// 8. Simular inicio de aplicación
console.log('\n🚀 Simulación de inicio:');
try {
  console.log('  🔍 Verificando que dist/index.js es ejecutable...');
  const indexContent = readFileSync('dist/index.js', 'utf8');
  if (indexContent.includes('express') || indexContent.includes('server')) {
    console.log('  ✅ dist/index.js parece ser una aplicación válida');
  } else {
    console.log('  ⚠️ dist/index.js no parece ser una aplicación válida');
  }
} catch (error) {
  console.log('  ❌ No se puede verificar dist/index.js:', error.message);
}

console.log('\n✅ Diagnóstico completado');
console.log('\n📝 Recomendaciones:');
console.log('  1. Verificar que todas las variables de entorno estén configuradas en Render');
console.log('  2. Asegurar que el build se ejecute correctamente');
console.log('  3. Verificar que la base de datos esté accesible');
console.log('  4. Confirmar que el puerto esté configurado correctamente'); 