#!/usr/bin/env node

// Script para probar el endpoint de diagnóstico
import fetch from 'node-fetch';

async function testDebugEndpoint() {
  console.log('🔍 PROBANDO ENDPOINT DE DIAGNÓSTICO');
  console.log('====================================');
  
  const urls = [
    'https://gei.adeptify.es/api/debug',
    'https://gei-adeptify.onrender.com/api/debug'
  ];
  
  for (const url of urls) {
    try {
      console.log(`\n📡 Probando: ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'GEI-Debug-Test/1.0'
        },
        timeout: 10000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   ⏱️ Tiempo: ${responseTime}ms`);
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   📄 Respuesta:`);
        console.log(`   =============`);
        console.log(`   Timestamp: ${data.timestamp}`);
        console.log(`   Environment: ${data.environment}`);
        console.log(`   Static Path: ${data.staticPath}`);
        console.log(`   Index Path: ${data.indexPath}`);
        console.log(`   Static Path Exists: ${data.staticPathExists ? '✅' : '❌'}`);
        console.log(`   Index HTML Exists: ${data.indexHtmlExists ? '✅' : '❌'}`);
        console.log(`   Current Dir: ${data.currentDir}`);
        console.log(`   Process CWD: ${data.processCwd}`);
        console.log(`   File Count: ${data.fileCount || 'N/A'}`);
        
        if (data.files) {
          console.log(`   📋 Archivos encontrados:`);
          data.files.slice(0, 10).forEach(file => {
            console.log(`      📄 ${file}`);
          });
          if (data.files.length > 10) {
            console.log(`      ... y ${data.files.length - 10} archivos más`);
          }
        }
        
        if (data.env) {
          console.log(`   🔧 Variables de entorno:`);
          console.log(`      NODE_ENV: ${data.env.NODE_ENV}`);
          console.log(`      PORT: ${data.env.PORT}`);
          console.log(`      CORS_ORIGIN: ${data.env.CORS_ORIGIN}`);
        }
        
        if (data.readError) {
          console.log(`   ❌ Error leyendo archivos: ${data.readError}`);
        }
        
      } else {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`   📄 Respuesta: ${text}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Análisis de resultados
  console.log('\n🎯 ANÁLISIS DE RESULTADOS:');
  console.log('==========================');
  console.log('');
  console.log('✅ Si staticPathExists es true:');
  console.log('   - El directorio de archivos estáticos existe');
  console.log('   - Los archivos deberían servirse correctamente');
  console.log('');
  console.log('❌ Si staticPathExists es false:');
  console.log('   - El directorio de archivos estáticos NO existe');
  console.log('   - Problema con el build del frontend');
  console.log('   - Problema con la configuración de rutas');
  console.log('');
  console.log('✅ Si indexHtmlExists es true:');
  console.log('   - El archivo index.html existe');
  console.log('   - La aplicación SPA debería funcionar');
  console.log('');
  console.log('❌ Si indexHtmlExists es false:');
  console.log('   - El archivo index.html NO existe');
  console.log('   - Problema con el build del frontend');
  console.log('');
  console.log('🔧 Próximos pasos:');
  console.log('==================');
  console.log('1. 🔍 Verificar logs de Render Dashboard');
  console.log('2. 🔍 Verificar que el build se completó correctamente');
  console.log('3. 🔍 Verificar configuración de rutas');
  console.log('4. 🔍 Verificar variables de entorno');
}

testDebugEndpoint().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 