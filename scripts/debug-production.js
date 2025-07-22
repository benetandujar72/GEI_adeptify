#!/usr/bin/env node

// Script para diagnosticar problemas de producción en Render
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Diagnóstico de Producción - GEI Unified Platform');
console.log('==================================================');

// 1. Verificar variables de entorno
console.log('\n📋 1. Variables de Entorno:');
const envVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 10)}***`);
    } else {
      console.log(`  ✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`  ❌ ${varName}: NO CONFIGURADA`);
  }
});

// 2. Verificar archivos de build
console.log('\n📦 2. Archivos de Build:');
const buildFiles = [
  'dist/index.js',
  'client/dist/index.html',
  'client/dist/assets'
];

buildFiles.forEach(file => {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    const stats = readFileSync(fullPath, 'utf8').length;
    console.log(`  ✅ ${file}: ${stats} bytes`);
  } else {
    console.log(`  ❌ ${file}: NO EXISTE`);
  }
});

// 3. Verificar memoria y recursos
console.log('\n💾 3. Recursos del Sistema:');
try {
  const memUsage = process.memoryUsage();
  console.log(`  📊 Memoria RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
  console.log(`  📊 Memoria Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
  console.log(`  📊 Memoria Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
} catch (error) {
  console.log(`  ❌ Error al obtener memoria: ${error.message}`);
}

// 4. Verificar puerto
console.log('\n🔌 4. Configuración de Puerto:');
const port = process.env.PORT || 3000;
console.log(`  🔌 Puerto configurado: ${port}`);
console.log(`  🌐 URL esperada: http://localhost:${port}`);

// 5. Verificar base de datos
console.log('\n🗄️ 5. Estado de Base de Datos:');
try {
  const postgres = (await import('postgres')).default;
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    const sql = postgres(databaseUrl, {
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      max: 1,
      connect_timeout: 5
    });
    
    const result = await sql`SELECT 1 as test, current_timestamp as timestamp`;
    console.log(`  ✅ Base de datos: CONECTADA`);
    console.log(`  📊 Test: ${result[0].test}`);
    console.log(`  🕐 Timestamp: ${result[0].timestamp}`);
    
    await sql.end();
  } else {
    console.log(`  ❌ DATABASE_URL: NO CONFIGURADA`);
  }
} catch (error) {
  console.log(`  ❌ Error de base de datos: ${error.message}`);
}

// 6. Verificar archivos de configuración
console.log('\n⚙️ 6. Archivos de Configuración:');
const configFiles = [
  'package.json',
  'vite.config.ts',
  'esbuild.config.js',
  'drizzle.config.ts'
];

configFiles.forEach(file => {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    console.log(`  ✅ ${file}: EXISTE`);
  } else {
    console.log(`  ❌ ${file}: NO EXISTE`);
  }
});

console.log('\n🎯 Diagnóstico Completado');
console.log('========================');
console.log('💡 Si hay errores, revisa los logs de Render para más detalles');
console.log('🔗 Render Dashboard: https://dashboard.render.com'); 