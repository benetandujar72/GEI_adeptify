#!/usr/bin/env node

/**
 * Script de diagnóstico específico para Render
 * Verifica todos los aspectos críticos del despliegue en producción
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
config();

console.log('🔍 ===== DIAGNÓSTICO RENDER PRODUCCIÓN =====');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`📁 PWD: ${process.cwd()}`);

// 1. Verificar estructura de archivos
console.log('\n📁 1. VERIFICANDO ESTRUCTURA DE ARCHIVOS...');

const criticalFiles = [
  'package.json',
  'server/index.ts',
  'shared/schema.ts',
  'client/index.html',
  'dist/index.js'
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file} ${exists ? 'existe' : 'NO EXISTE'}`);
  
  if (exists) {
    try {
      const stats = fs.statSync(file);
      console.log(`   📊 Tamaño: ${stats.size} bytes`);
      console.log(`   📅 Modificado: ${stats.mtime.toISOString()}`);
    } catch (error) {
      console.log(`   ⚠️ Error al leer estadísticas: ${error.message}`);
    }
  }
});

// 2. Verificar variables de entorno críticas
console.log('\n🔧 2. VERIFICANDO VARIABLES DE ENTORNO...');

const criticalEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  'SESSION_SECRET',
  'CORS_ORIGIN'
];

const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'REDIS_URL'
];

criticalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '***CONFIGURADO***' : value}`);
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADO`);
  }
});

console.log('\n📋 Variables opcionales:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') || varName.includes('KEY') ? '***CONFIGURADO***' : value}`);
  } else {
    console.log(`⚠️ ${varName}: NO CONFIGURADO (opcional)`);
  }
});

// 3. Verificar configuración de build
console.log('\n🔨 3. VERIFICANDO CONFIGURACIÓN DE BUILD...');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ package.json válido`);
  console.log(`📦 Nombre: ${packageJson.name}`);
  console.log(`📋 Versión: ${packageJson.version}`);
  console.log(`🚀 Scripts disponibles: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
  
  if (packageJson.scripts?.build) {
    console.log(`✅ Script de build configurado`);
  } else {
    console.log(`❌ Script de build NO configurado`);
  }
  
  if (packageJson.scripts?.start) {
    console.log(`✅ Script de start configurado`);
  } else {
    console.log(`❌ Script de start NO configurado`);
  }
} catch (error) {
  console.log(`❌ Error leyendo package.json: ${error.message}`);
}

// 4. Verificar archivos de configuración
console.log('\n⚙️ 4. VERIFICANDO ARCHIVOS DE CONFIGURACIÓN...');

const configFiles = [
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'drizzle.config.ts',
  'render.yaml'
];

configFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '⚠️'} ${file} ${exists ? 'existe' : 'NO EXISTE'}`);
});

// 5. Verificar directorios importantes
console.log('\n📂 5. VERIFICANDO DIRECTORIOS...');

const directories = [
  'server',
  'client',
  'shared',
  'scripts',
  'dist',
  'node_modules'
];

directories.forEach(dir => {
  const exists = fs.existsSync(dir);
  if (exists) {
    try {
      const stats = fs.statSync(dir);
      const isDir = stats.isDirectory();
      console.log(`${isDir ? '✅' : '⚠️'} ${dir}/ ${isDir ? 'es directorio' : 'NO es directorio'}`);
      
      if (isDir) {
        const files = fs.readdirSync(dir);
        console.log(`   📄 Archivos: ${files.length}`);
      }
    } catch (error) {
      console.log(`❌ Error accediendo a ${dir}: ${error.message}`);
    }
  } else {
    console.log(`❌ ${dir}/ NO EXISTE`);
  }
});

// 6. Verificar permisos de archivos críticos
console.log('\n🔐 6. VERIFICANDO PERMISOS...');

const executableFiles = [
  'scripts/start.sh',
  'scripts/setup.sh',
  'scripts/start-production.sh'
];

executableFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const stats = fs.statSync(file);
      const isExecutable = (stats.mode & 0o111) !== 0;
      console.log(`${isExecutable ? '✅' : '⚠️'} ${file} ${isExecutable ? 'es ejecutable' : 'NO es ejecutable'}`);
    } catch (error) {
      console.log(`❌ Error verificando permisos de ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠️ ${file} NO EXISTE`);
  }
});

// 7. Verificar conectividad de red
console.log('\n🌐 7. VERIFICANDO CONECTIVIDAD...');

const testUrls = [
  'https://api.github.com',
  'https://www.google.com'
];

for (const url of testUrls) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 5000 
    });
    console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`❌ ${url}: ${error.message}`);
  }
}

// 8. Verificar memoria y recursos del sistema
console.log('\n💾 8. VERIFICANDO RECURSOS DEL SISTEMA...');

console.log(`📊 Memoria total: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`);
console.log(`📊 Memoria usada: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
console.log(`📊 Memoria externa: ${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`);

// 9. Verificar versión de Node.js
console.log('\n🟢 9. VERIFICANDO VERSIÓN DE NODE.JS...');

console.log(`📦 Node.js: ${process.version}`);
console.log(`📦 Plataforma: ${process.platform}`);
console.log(`📦 Arquitectura: ${process.arch}`);

// 10. Recomendaciones
console.log('\n💡 10. RECOMENDACIONES...');

const recommendations = [];

if (!process.env.DATABASE_URL) {
  recommendations.push('❌ Configurar DATABASE_URL en Render');
}

if (!process.env.SESSION_SECRET) {
  recommendations.push('❌ Configurar SESSION_SECRET en Render');
}

if (!process.env.CORS_ORIGIN) {
  recommendations.push('⚠️ Configurar CORS_ORIGIN para producción');
}

if (!fs.existsSync('dist/index.js')) {
  recommendations.push('❌ Ejecutar npm run build antes del despliegue');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  recommendations.push('⚠️ Google Sheets estará deshabilitado (opcional)');
}

if (recommendations.length === 0) {
  console.log('✅ Todas las configuraciones críticas están correctas');
} else {
  recommendations.forEach(rec => console.log(rec));
}

console.log('\n🎯 ===== DIAGNÓSTICO COMPLETADO =====');
console.log('📋 Si hay errores, revisa las recomendaciones anteriores');
console.log('🔧 Para más ayuda, consulta la documentación de Render'); 