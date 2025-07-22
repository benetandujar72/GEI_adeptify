#!/usr/bin/env node

// Script para diagnosticar problemas de Render
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function checkPackageJson() {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    if (!existsSync(packagePath)) {
      console.log('❌ package.json no encontrado');
      return false;
    }

    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    console.log('📦 package.json encontrado:');
    console.log(`  📝 Nombre: ${packageJson.name}`);
    console.log(`  📝 Versión: ${packageJson.version}`);
    console.log(`  📝 Scripts disponibles: ${Object.keys(packageJson.scripts || {}).join(', ')}`);
    
    // Verificar scripts críticos
    const criticalScripts = ['start', 'build', 'dev'];
    const missingScripts = criticalScripts.filter(script => !packageJson.scripts?.[script]);
    
    if (missingScripts.length > 0) {
      console.log(`  ⚠️ Scripts faltantes: ${missingScripts.join(', ')}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error leyendo package.json: ${error.message}`);
    return false;
  }
}

async function checkBuildFiles() {
  console.log('\n📁 Verificando archivos de build...');
  const buildFiles = [
    'dist/index.js',
    'client/dist/index.html',
    'client/dist/assets'
  ];
  
  let buildOk = true;
  for (const file of buildFiles) {
    try {
      const fullPath = join(process.cwd(), file);
      if (existsSync(fullPath)) {
        const { statSync } = await import('fs');
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          console.log(`  ✅ ${file}: [Directorio]`);
        } else {
          console.log(`  ✅ ${file}: ${stats.size} bytes`);
        }
      } else {
        console.log(`  ❌ ${file}: NO EXISTE`);
        buildOk = false;
      }
    } catch (error) {
      console.log(`  ⚠️ ${file}: Error - ${error.message}`);
      buildOk = false;
    }
  }
  
  return buildOk;
}

async function checkRenderConfig() {
  console.log('\n🔧 CONFIGURACIÓN RECOMENDADA PARA RENDER:');
  console.log('==========================================');
  
  console.log('\n📝 render.yaml (crear en raíz del proyecto):');
  console.log(`
services:
  - type: web
    name: gei-adeptify
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: SESSION_SECRET
        sync: false
    healthCheckPath: /health
    autoDeploy: true
    plan: starter
`);

  console.log('\n📝 package.json scripts recomendados:');
  console.log(`
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild src/index.js --bundle --platform=node --outfile=dist/index.js",
    "build:client": "cd client && npm run build",
    "dev": "node --watch src/index.js",
    "test": "node scripts/test-app-real.js"
  }
}
`);

  console.log('\n📝 Variables de entorno en Render:');
  console.log(`
NODE_ENV=production
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com/gei_db
SESSION_SECRET=tu_session_secret_aqui
PORT=3000
`);

  console.log('\n📝 Health check endpoint (ya existe en server/index.ts):');
  console.log(`
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'GEI Unified Platform'
  });
});
`);
}

async function checkCurrentIssues() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMAS EN RENDER');
  console.log('=====================================');
  
  try {
    // 1. Verificar package.json
    console.log('\n📦 Verificando package.json...');
    const packageOk = await checkPackageJson();
    if (packageOk) {
      console.log('✅ package.json: Configurado');
    } else {
      console.log('❌ package.json: Problemas');
    }
    
    // 2. Verificar archivos de build
    const buildOk = await checkBuildFiles();
    if (buildOk) {
      console.log('✅ Archivos de build: OK');
    } else {
      console.log('❌ Archivos de build: Problemas');
    }
    
    // 3. Verificar variables de entorno
    console.log('\n⚙️ Verificando variables de entorno...');
    const requiredVars = ['NODE_ENV', 'DATABASE_URL', 'SESSION_SECRET'];
    let envOk = true;
    
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
          console.log(`  ✅ ${varName}: [CONFIGURADA]`);
        } else {
          console.log(`  ✅ ${varName}: ${process.env[varName]}`);
        }
      } else {
        console.log(`  ⚠️ ${varName}: [NO CONFIGURADA]`);
        envOk = false;
      }
    });
    
    // 4. Verificar puerto
    console.log('\n🌐 Verificando configuración de red...');
    const port = process.env.PORT || 3000;
    console.log(`✅ Puerto configurado: ${port}`);
    
    // 5. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('=====================');
    
    if (packageOk && buildOk && envOk) {
      console.log('✅ TODO CONFIGURADO CORRECTAMENTE');
      console.log('💡 El problema puede ser:');
      console.log('   - Configuración de Render (health checks)');
      console.log('   - Límites de memoria/CPU');
      console.log('   - Auto-restart por inactividad');
      console.log('   - Problema en el script de inicio');
    } else {
      console.log('❌ PROBLEMAS DETECTADOS:');
      if (!packageOk) console.log('   - package.json mal configurado');
      if (!buildOk) console.log('   - Archivos de build faltantes');
      if (!envOk) console.log('   - Variables de entorno faltantes');
    }
    
    // 6. Análisis del problema de SIGTERM
    console.log('\n🛑 ANÁLISIS DEL PROBLEMA SIGTERM:');
    console.log('==================================');
    console.log('Los logs muestran que el servidor recibe SIGTERM y se cierra.');
    console.log('Esto indica que Render está terminando el proceso.');
    console.log('');
    console.log('Posibles causas:');
    console.log('1. 🔍 Health checks fallando');
    console.log('2. 💾 Límites de memoria excedidos');
    console.log('3. ⏰ Timeout de inactividad');
    console.log('4. 🔄 Auto-restart por configuración');
    console.log('');
    console.log('Soluciones recomendadas:');
    console.log('1. ✅ Verificar que /health responde correctamente');
    console.log('2. ✅ Configurar healthCheckPath en Render');
    console.log('3. ✅ Aumentar límites de memoria si es necesario');
    console.log('4. ✅ Verificar logs de Render para más detalles');
    
    // 7. Mostrar configuración recomendada
    await checkRenderConfig();
    
    // 8. Comandos para probar
    console.log('\n🔧 Comandos para probar en Render:');
    console.log('===================================');
    console.log('1. curl http://localhost:3000/health');
    console.log('2. curl http://localhost:3000/api/health');
    console.log('3. curl http://localhost:3000/api/health/db');
    console.log('4. ps aux | grep node');
    console.log('5. free -m (verificar memoria)');
    console.log('6. tail -f /var/log/render.log');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

checkCurrentIssues().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 