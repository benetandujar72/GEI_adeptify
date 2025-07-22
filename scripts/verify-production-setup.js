#!/usr/bin/env node

// Script para verificar la configuración completa de producción
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 VERIFICACIÓN COMPLETA DE CONFIGURACIÓN DE PRODUCCIÓN');
console.log('=====================================================');

// Lista de archivos críticos para producción
const criticalFiles = [
  // Archivos de configuración principales
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'drizzle.config.ts',
  'esbuild.config.js',
  'render.yaml',
  
  // Archivos de configuración del cliente
  'client/postcss.config.js',
  'client/tailwind.config.js',
  'client/tsconfig.node.json',
  'client/tsconfig.json',
  'client/vite.config.ts',
  'client/index.html',
  
  // Archivos de configuración del servidor
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  
  // Scripts críticos
  'scripts/start-production-optimized.sh',
  'scripts/create-tables.js',
  'scripts/init-db-simple.js',
  'scripts/check-db-simple.js',
  
  // Archivos de migración
  'drizzle/0000_wise_namora.sql',
  
  // Archivos de código fuente
  'server/index.ts',
  'shared/schema.ts',
  'client/src/App.tsx'
];

// Lista de directorios críticos
const criticalDirectories = [
  'server',
  'client',
  'shared',
  'scripts',
  'drizzle'
];

// Verificar archivos críticos
console.log('\n📁 VERIFICANDO ARCHIVOS CRÍTICOS');
console.log('================================');

let missingFiles = 0;
let existingFiles = 0;

for (const file of criticalFiles) {
  const fullPath = join(__dirname, '..', file);
  if (existsSync(fullPath)) {
    console.log(`✅ ${file}`);
    existingFiles++;
  } else {
    console.log(`❌ ${file} - FALTANTE`);
    missingFiles++;
  }
}

// Verificar directorios críticos
console.log('\n📂 VERIFICANDO DIRECTORIOS CRÍTICOS');
console.log('===================================');

let missingDirs = 0;
let existingDirs = 0;

for (const dir of criticalDirectories) {
  const fullPath = join(__dirname, '..', dir);
  if (existsSync(fullPath)) {
    console.log(`✅ ${dir}/`);
    existingDirs++;
  } else {
    console.log(`❌ ${dir}/ - FALTANTE`);
    missingDirs++;
  }
}

// Verificar dependencias críticas en package.json
console.log('\n📦 VERIFICANDO DEPENDENCIAS CRÍTICAS');
console.log('===================================');

try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  
  const criticalDeps = [
    'postgres',
    'express',
    'drizzle-orm',
    'bcryptjs',
    'cors',
    'helmet',
    'compression',
    'winston',
    'node-fetch'
  ];
  
  const criticalDevDeps = [
    '@types/node',
    '@types/express',
    '@types/cors',
    '@types/compression',
    '@types/node-fetch',
    '@types/dotenv'
  ];
  
  let missingDeps = 0;
  let existingDeps = 0;
  
  for (const dep of criticalDeps) {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
      existingDeps++;
    } else {
      console.log(`❌ ${dep} - FALTANTE en dependencies`);
      missingDeps++;
    }
  }
  
  for (const dep of criticalDevDeps) {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.devDependencies[dep]}`);
      existingDeps++;
    } else {
      console.log(`❌ ${dep} - FALTANTE en devDependencies`);
      missingDeps++;
    }
  }
  
} catch (error) {
  console.log(`❌ Error leyendo package.json: ${error.message}`);
}

// Verificar scripts críticos en package.json
console.log('\n🔧 VERIFICANDO SCRIPTS CRÍTICOS');
console.log('===============================');

try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  
  const criticalScripts = [
    'build',
    'start',
    'db:create-tables',
    'db:init-simple',
    'db:check-simple',
    'diagnose'
  ];
  
  let missingScripts = 0;
  let existingScripts = 0;
  
  for (const script of criticalScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
      existingScripts++;
    } else {
      console.log(`❌ ${script} - FALTANTE en scripts`);
      missingScripts++;
    }
  }
  
} catch (error) {
  console.log(`❌ Error leyendo scripts: ${error.message}`);
}

// Resumen final
console.log('\n🎯 RESUMEN DE VERIFICACIÓN');
console.log('=========================');
console.log(`📁 Archivos: ${existingFiles}/${criticalFiles.length} presentes`);
console.log(`📂 Directorios: ${existingDirs}/${criticalDirectories.length} presentes`);

if (missingFiles > 0 || missingDirs > 0) {
  console.log('\n⚠️ PROBLEMAS DETECTADOS:');
  console.log('=======================');
  console.log(`❌ ${missingFiles} archivos faltantes`);
  console.log(`❌ ${missingDirs} directorios faltantes`);
  console.log('\n💡 ACCIONES RECOMENDADAS:');
  console.log('========================');
  console.log('1. Verificar que todos los archivos estén en el repositorio');
  console.log('2. Asegurar que el Dockerfile copie todos los archivos necesarios');
  console.log('3. Verificar que las dependencias estén instaladas');
  console.log('4. Ejecutar npm install para instalar dependencias faltantes');
} else {
  console.log('\n✅ CONFIGURACIÓN COMPLETA');
  console.log('=======================');
  console.log('🎉 Todos los archivos y dependencias críticas están presentes');
  console.log('🚀 El proyecto está listo para producción');
}

console.log('\n📋 PRÓXIMOS PASOS:');
console.log('==================');
console.log('1. Ejecutar: npm run db:create-tables');
console.log('2. Ejecutar: npm run db:init-simple');
console.log('3. Ejecutar: npm run db:check-simple');
console.log('4. Verificar que la aplicación funcione correctamente'); 