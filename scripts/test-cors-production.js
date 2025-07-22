#!/usr/bin/env node

// Script específico para probar CORS en producción
import fetch from 'node-fetch';

async function testCorsProduction() {
  console.log('🌐 PRUEBA ESPECÍFICA DE CORS EN PRODUCCIÓN');
  console.log('==========================================');
  
  try {
    const baseUrl = 'https://gei.adeptify.es';
    const apiUrl = `${baseUrl}/api/health`;
    
    console.log(`🔍 Probando CORS en: ${apiUrl}`);
    console.log(`🌍 Origen: ${baseUrl}`);
    console.log('');
    
    // 1. Prueba básica de CORS
    console.log('📡 1. Prueba básica de CORS...');
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Origin': baseUrl,
          'User-Agent': 'GEI-CORS-Test/1.0'
        }
      });
      
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      console.log(`   🔗 URL: ${response.url}`);
      
      // Verificar headers de CORS
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
      };
      
      console.log('   📋 Headers de CORS:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`      ${status} ${key}: ${value || 'NO PRESENTE'}`);
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   📄 Respuesta: ${JSON.stringify(data, null, 2)}`);
        console.log(`   ✅ CORS básico: FUNCIONANDO`);
      } else {
        console.log(`   ❌ CORS básico: ERROR ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error en prueba básica: ${error.message}`);
    }
    
    console.log('');
    
    // 2. Prueba OPTIONS (preflight)
    console.log('📡 2. Prueba OPTIONS (preflight)...');
    try {
      const optionsResponse = await fetch(apiUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': baseUrl,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
          'User-Agent': 'GEI-CORS-Test/1.0'
        }
      });
      
      console.log(`   📊 Status: ${optionsResponse.status} ${optionsResponse.statusText}`);
      
      // Verificar headers de preflight
      const preflightHeaders = {
        'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': optionsResponse.headers.get('Access-Control-Allow-Credentials'),
        'Access-Control-Max-Age': optionsResponse.headers.get('Access-Control-Max-Age')
      };
      
      console.log('   📋 Headers de preflight:');
      Object.entries(preflightHeaders).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`      ${status} ${key}: ${value || 'NO PRESENTE'}`);
      });
      
      if (optionsResponse.status === 200 || optionsResponse.status === 204) {
        console.log(`   ✅ Preflight CORS: FUNCIONANDO`);
      } else {
        console.log(`   ❌ Preflight CORS: ERROR ${optionsResponse.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error en preflight: ${error.message}`);
    }
    
    console.log('');
    
    // 3. Prueba con credenciales
    console.log('📡 3. Prueba con credenciales...');
    try {
      const credentialsResponse = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': baseUrl,
          'Content-Type': 'application/json',
          'User-Agent': 'GEI-CORS-Test/1.0'
        }
      });
      
      console.log(`   📊 Status: ${credentialsResponse.status} ${credentialsResponse.statusText}`);
      
      const allowCredentials = credentialsResponse.headers.get('Access-Control-Allow-Credentials');
      console.log(`   🔐 Access-Control-Allow-Credentials: ${allowCredentials || 'NO PRESENTE'}`);
      
      if (credentialsResponse.ok) {
        console.log(`   ✅ CORS con credenciales: FUNCIONANDO`);
      } else {
        console.log(`   ❌ CORS con credenciales: ERROR ${credentialsResponse.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error con credenciales: ${error.message}`);
    }
    
    console.log('');
    
    // 4. Prueba desde navegador simulado
    console.log('📡 4. Prueba desde navegador simulado...');
    console.log('   💡 Para probar desde el navegador real:');
    console.log('   - Abrir https://gei.adeptify.es');
    console.log('   - Abrir DevTools (F12)');
    console.log('   - Ir a Console');
    console.log('   - Ejecutar: fetch("/api/health")');
    console.log('');
    
    // 5. Análisis de resultados
    console.log('🎯 ANÁLISIS DE CORS:');
    console.log('====================');
    console.log('');
    console.log('✅ Si todas las pruebas pasan:');
    console.log('   - CORS está configurado correctamente');
    console.log('   - El frontend puede comunicarse con el backend');
    console.log('   - La aplicación debería funcionar');
    console.log('');
    console.log('❌ Si hay errores CORS:');
    console.log('   - Verificar CORS_ORIGIN en Render');
    console.log('   - Asegurar que coincide con el dominio');
    console.log('   - Hacer redeploy de la aplicación');
    console.log('');
    console.log('🔧 Configuración esperada:');
    console.log('==========================');
    console.log('CORS_ORIGIN=https://gei.adeptify.es');
    console.log('credentials: true');
    console.log('methods: GET, POST, PUT, DELETE, OPTIONS');
    console.log('headers: Content-Type, Authorization');
    
    // 6. Próximos pasos
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. 🔍 Si CORS funciona: Probar la aplicación en el navegador');
    console.log('2. 🔍 Si CORS falla: Verificar configuración en Render');
    console.log('3. 🔍 Si la app no se muestra: Limpiar caché del navegador');
    console.log('4. 🔍 Probar en navegador privado/incógnito');
    console.log('5. 🔍 Probar en diferentes navegadores');
    
  } catch (error) {
    console.error('❌ Error en prueba CORS:', error);
  }
}

testCorsProduction().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 