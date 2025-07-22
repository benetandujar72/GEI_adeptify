#!/usr/bin/env node

// Script para probar endpoints de la API
import fetch from 'node-fetch';

console.log('🧪 PROBANDO ENDPOINTS DE LA API');
console.log('===============================');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const endpoints = [
  { path: '/', method: 'GET', description: 'Página principal' },
  { path: '/health', method: 'GET', description: 'Health check simple' },
  { path: '/api/health', method: 'GET', description: 'Health check detallado' },
  { path: '/api/health/db', method: 'GET', description: 'Health check de base de datos' },
  { path: '/api/auth/me', method: 'GET', description: 'Verificar autenticación' },
  { path: '/api/auth/login', method: 'POST', description: 'Login endpoint' },
  { path: '/api/auth/logout', method: 'POST', description: 'Logout endpoint' },
  { path: '/api/auth/register', method: 'POST', description: 'Register endpoint' }
];

async function testEndpoint(endpoint) {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    console.log(`\n🔍 Probando: ${endpoint.description}`);
    console.log(`   URL: ${url}`);
    console.log(`   Método: ${endpoint.method}`);
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    };
    
    // Agregar body para POST requests
    if (endpoint.method === 'POST') {
      options.body = JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      });
    }
    
    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`   ⏱️ Tiempo de respuesta: ${responseTime}ms`);
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      try {
        const data = await response.text();
        console.log(`   ✅ Respuesta: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      } catch (error) {
        console.log(`   ✅ Respuesta: [Contenido no legible]`);
      }
    } else {
      console.log(`   ❌ Error: ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
  }
}

async function testAllEndpoints() {
  console.log(`🌐 URL base: ${BASE_URL}`);
  console.log(`⏰ Fecha: ${new Date().toISOString()}`);
  console.log('');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n🎯 RESUMEN DE PRUEBAS');
  console.log('=====================');
  console.log('✅ Pruebas completadas');
  console.log('📋 Revisa los resultados anteriores');
}

// Ejecutar pruebas
testAllEndpoints()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }); 