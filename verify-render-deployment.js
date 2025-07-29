#!/usr/bin/env node

/**
 * Script de verificación para el despliegue en Render
 * Verifica que todos los archivos y configuraciones estén correctos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 VERIFICANDO CONFIGURACIÓN DE DESPLIEGUE RENDER...\n');

const checks = [
  {
    name: 'render.yaml',
    path: 'render.yaml',
    required: true,
    check: (content) => {
      const hasBuildCommand = content.includes('cd server') && content.includes('npm run build');
      const hasStartCommand = content.includes('cd server') && content.includes('./start.sh');
      const hasDatabaseUrl = content.includes('DATABASE_URL');
      const hasSessionSecret = content.includes('SESSION_SECRET');
      
      return {
        buildCommand: hasBuildCommand,
        startCommand: hasStartCommand,
        databaseUrl: hasDatabaseUrl,
        sessionSecret: hasSessionSecret
      };
    }
  },
  {
    name: 'server/src/index.ts',
    path: 'server/src/index.ts',
    required: true,
    check: (content) => {
      const hasExpress = content.includes('express');
      const hasPort = content.includes('process.env.PORT');
      const hasDatabase = content.includes('database');
      
      return {
        express: hasExpress,
        port: hasPort,
        database: hasDatabase
      };
    }
  },
  {
    name: 'server/package.json',
    path: 'server/package.json',
    required: true,
    check: (content) => {
      const hasBuildScript = content.includes('"build"');
      const hasStartScript = content.includes('"start"');
      const hasDependencies = content.includes('"dependencies"');
      
      return {
        buildScript: hasBuildScript,
        startScript: hasStartScript,
        dependencies: hasDependencies
      };
    }
  },
  {
    name: 'server/start.sh',
    path: 'server/start.sh',
    required: true,
    check: (content) => {
      const hasShebang = content.startsWith('#!/bin/bash');
      const hasBuildCheck = content.includes('npm run build');
      const hasNodeExec = content.includes('node dist/index.js');
      
      return {
        shebang: hasShebang,
        buildCheck: hasBuildCheck,
        nodeExec: hasNodeExec
      };
    }
  },
  {
    name: 'render.env',
    path: 'render.env',
    required: true,
    check: (content) => {
      const hasDatabaseUrl = content.includes('DATABASE_URL');
      const hasSessionSecret = content.includes('SESSION_SECRET');
      const hasGoogleConfig = content.includes('GOOGLE_CLIENT_ID');
      
      return {
        databaseUrl: hasDatabaseUrl,
        sessionSecret: hasSessionSecret,
        googleConfig: hasGoogleConfig
      };
    }
  }
];

let allPassed = true;

for (const check of checks) {
  console.log(`📋 Verificando ${check.name}...`);
  
  try {
    const filePath = path.join(__dirname, check.path);
    const exists = fs.existsSync(filePath);
    
    if (!exists) {
      if (check.required) {
        console.log(`❌ ${check.name} NO EXISTE (REQUERIDO)`);
        allPassed = false;
      } else {
        console.log(`⚠️  ${check.name} NO EXISTE (OPCIONAL)`);
      }
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const results = check.check(content);
    
    const passed = Object.values(results).every(Boolean);
    if (passed) {
      console.log(`✅ ${check.name} - OK`);
    } else {
      console.log(`❌ ${check.name} - FALLÓ`);
      Object.entries(results).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '❌'} ${key}`);
      });
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`❌ Error verificando ${check.name}:`, error.message);
    allPassed = false;
  }
  
  console.log('');
}

// Verificar estructura de directorios
console.log('📁 Verificando estructura de directorios...');

const requiredDirs = [
  'server/src',
  'server/routes',
  'server/services',
  'server/database',
  'server/auth'
];

for (const dir of requiredDirs) {
  const dirPath = path.join(__dirname, dir);
  const exists = fs.existsSync(dirPath);
  console.log(`${exists ? '✅' : '❌'} ${dir} ${exists ? 'EXISTE' : 'NO EXISTE'}`);
  
  if (!exists) {
    allPassed = false;
  }
}

console.log('');

// Verificar variables de entorno críticas
console.log('🔧 Verificando variables de entorno críticas...');

const envPath = path.join(__dirname, 'render.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const criticalVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY'
  ];
  
  for (const varName of criticalVars) {
    const hasVar = envContent.includes(varName);
    console.log(`${hasVar ? '✅' : '❌'} ${varName} ${hasVar ? 'CONFIGURADA' : 'FALTANTE'}`);
    
    if (!hasVar) {
      allPassed = false;
    }
  }
}

console.log('');

// Resumen final
if (allPassed) {
  console.log('🎉 ¡TODAS LAS VERIFICACIONES PASARON!');
  console.log('✅ La configuración está lista para el despliegue en Render');
  console.log('');
  console.log('📋 PRÓXIMOS PASOS:');
  console.log('1. Subir cambios a GitHub');
  console.log('2. Conectar repositorio a Render');
  console.log('3. Configurar variables de entorno en Render Dashboard');
  console.log('4. Desplegar automáticamente');
} else {
  console.log('❌ ALGUNAS VERIFICACIONES FALLARON');
  console.log('🔧 Por favor, corrige los errores antes del despliegue');
  process.exit(1);
}