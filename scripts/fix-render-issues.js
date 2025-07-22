#!/usr/bin/env node

// Script para diagnosticar y solucionar problemas de Render
import postgres from 'postgres';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function checkHealthEndpoint() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(0, () => {
      const port = server.address().port;
      console.log(`✅ Health endpoint funcionando en puerto ${port}`);
      server.close();
      resolve(true);
    });

    server.on('error', (error) => {
      console.log(`❌ Error en health endpoint: ${error.message}`);
      resolve(false);
    });
  });
}

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
    
    return true;
  } catch (error) {
    console.log(`❌ Error leyendo package.json: ${error.message}`);
    return false;
  }
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

  console.log('\n📝 Health check endpoint (añadir a src/index.js):');
  console.log(`
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
`);
}

async function checkCurrentIssues() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMAS EN RENDER');
  console.log('=====================================');
  
  try {
    // 1. Verificar conexión a base de datos
    console.log('\n🗄️ Verificando base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Base de datos: Conectada');
    
    // 2. Verificar health endpoint
    console.log('\n🏥 Verificando health endpoint...');
    const healthOk = await checkHealthEndpoint();
    if (healthOk) {
      console.log('✅ Health endpoint: Funcionando');
    } else {
      console.log('❌ Health endpoint: No funciona');
    }
    
    // 3. Verificar package.json
    console.log('\n📦 Verificando package.json...');
    const packageOk = await checkPackageJson();
    if (packageOk) {
      console.log('✅ package.json: Configurado');
    } else {
      console.log('❌ package.json: Problemas');
    }
    
    // 4. Verificar variables de entorno
    console.log('\n⚙️ Verificando variables de entorno...');
    const requiredVars = ['NODE_ENV', 'DATABASE_URL', 'SESSION_SECRET'];
    let envOk = true;
    
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`  ✅ ${varName}: Configurada`);
      } else {
        console.log(`  ❌ ${varName}: No configurada`);
        envOk = false;
      }
    });
    
    // 5. Verificar archivos de build
    console.log('\n📁 Verificando archivos de build...');
    const buildFiles = [
      'dist/index.js',
      'client/dist/index.html',
      'package.json'
    ];
    
    let buildOk = true;
    buildFiles.forEach(file => {
      if (existsSync(join(process.cwd(), file))) {
        console.log(`  ✅ ${file}: Existe`);
      } else {
        console.log(`  ❌ ${file}: No existe`);
        buildOk = false;
      }
    });
    
    // 6. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('=====================');
    
    if (healthOk && packageOk && envOk && buildOk) {
      console.log('✅ TODO CONFIGURADO CORRECTAMENTE');
      console.log('💡 El problema puede ser:');
      console.log('   - Configuración de Render (health checks)');
      console.log('   - Límites de memoria/CPU');
      console.log('   - Auto-restart por inactividad');
    } else {
      console.log('❌ PROBLEMAS DETECTADOS:');
      if (!healthOk) console.log('   - Health endpoint no funciona');
      if (!packageOk) console.log('   - package.json mal configurado');
      if (!envOk) console.log('   - Variables de entorno faltantes');
      if (!buildOk) console.log('   - Archivos de build faltantes');
    }
    
    // 7. Mostrar configuración recomendada
    await checkRenderConfig();
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await sql.end();
  }
}

checkCurrentIssues().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 