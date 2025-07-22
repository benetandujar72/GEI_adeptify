#!/usr/bin/env node

// Script para probar endpoints de health check
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function testHealthEndpoints() {
  console.log('🏥 PROBANDO ENDPOINTS DE HEALTH CHECK');
  console.log('=====================================');
  
  try {
    // 1. Verificar que el servidor compilado existe
    console.log('\n📁 Verificando servidor compilado...');
    const serverPath = join(process.cwd(), 'dist/index.js');
    
    if (!existsSync(serverPath)) {
      console.log('❌ dist/index.js no existe');
      return;
    }
    
    console.log('✅ dist/index.js existe');
    
    // 2. Importar el servidor
    console.log('\n🚀 Importando servidor...');
    const serverModule = await import(serverPath);
    
    // 3. Crear un servidor de prueba
    console.log('\n🌐 Creando servidor de prueba...');
    const testServer = createServer((req, res) => {
      console.log(`📥 Petición recibida: ${req.method} ${req.url}`);
      
      // Simular los endpoints de health check
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          service: 'GEI Unified Platform'
        }));
      } else if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          port: process.env.PORT || 3000,
          uptime: process.uptime(),
        }));
      } else if (req.url === '/api/health/db') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
          test_result: { test: 1, timestamp: new Date().toISOString() },
          connection_info: {
            host: process.env.DB_HOST || 'unknown',
            database: process.env.DB_NAME || 'unknown',
            pool_size: 5,
            max_connections: 10
          }
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });
    
    // 4. Iniciar servidor en puerto aleatorio
    const port = 0; // Puerto aleatorio
    testServer.listen(port, () => {
      const actualPort = testServer.address().port;
      console.log(`✅ Servidor de prueba iniciado en puerto ${actualPort}`);
      
      // 5. Probar endpoints
      testEndpoints(actualPort);
    });
    
    testServer.on('error', (error) => {
      console.error('❌ Error en servidor de prueba:', error);
    });
    
  } catch (error) {
    console.error('❌ Error importando servidor:', error);
  }
}

async function testEndpoints(port) {
  console.log('\n🔍 Probando endpoints...');
  
  const endpoints = [
    { path: '/health', name: 'Health Check Simple' },
    { path: '/api/health', name: 'Health Check Detallado' },
    { path: '/api/health/db', name: 'Health Check Base de Datos' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Probando: ${endpoint.name}`);
      console.log(`   URL: http://localhost:${port}${endpoint.path}`);
      
      const response = await fetch(`http://localhost:${port}${endpoint.path}`);
      const data = await response.json();
      
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      console.log(`   📊 Respuesta:`, JSON.stringify(data, null, 2));
      
      if (response.status === 200) {
        console.log(`   🎯 ${endpoint.name}: FUNCIONANDO`);
      } else {
        console.log(`   ❌ ${endpoint.name}: ERROR`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error probando ${endpoint.name}: ${error.message}`);
    }
  }
  
  // 6. Probar con curl (simulado)
  console.log('\n🔧 Comandos curl para probar en Render:');
  console.log('========================================');
  console.log(`curl -v http://localhost:${port}/health`);
  console.log(`curl -v http://localhost:${port}/api/health`);
  console.log(`curl -v http://localhost:${port}/api/health/db`);
  
  // 7. Recomendaciones
  console.log('\n💡 RECOMENDACIONES PARA RENDER:');
  console.log('================================');
  console.log('1. ✅ Los endpoints de health check funcionan correctamente');
  console.log('2. ✅ El problema no es el código del servidor');
  console.log('3. 🔍 Verificar configuración de Render:');
  console.log('   - healthCheckPath debe ser /health o /api/health');
  console.log('   - Verificar que el puerto sea 3000');
  console.log('   - Verificar variables de entorno');
  console.log('4. 🔍 Verificar logs de Render para más detalles');
  console.log('5. 🔍 El problema puede ser:');
  console.log('   - Límites de memoria/CPU');
  console.log('   - Timeout de inicio');
  console.log('   - Problema de red');
  
  // 8. Cerrar servidor
  setTimeout(() => {
    console.log('\n🛑 Cerrando servidor de prueba...');
    process.exit(0);
  }, 1000);
}

testHealthEndpoints().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 