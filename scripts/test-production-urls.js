#!/usr/bin/env node

// Script para probar URLs de producción
import fetch from 'node-fetch';

async function testProductionUrls() {
  console.log('🌐 PROBANDO URLs DE PRODUCCIÓN');
  console.log('===============================');
  
  const urls = [
    {
      name: 'Render Health Check',
      url: 'https://gei-adeptify.onrender.com/health',
      description: 'Health check directo de Render'
    },
    {
      name: 'Render API Health',
      url: 'https://gei-adeptify.onrender.com/api/health',
      description: 'API health check de Render'
    },
    {
      name: 'Render Database Health',
      url: 'https://gei-adeptify.onrender.com/api/health/db',
      description: 'Database health check de Render'
    },
    {
      name: 'Dominio Personalizado Health',
      url: 'https://gei.adeptify.es/health',
      description: 'Health check del dominio personalizado'
    },
    {
      name: 'Dominio Personalizado API Health',
      url: 'https://gei.adeptify.es/api/health',
      description: 'API health check del dominio personalizado'
    },
    {
      name: 'Dominio Personalizado Database Health',
      url: 'https://gei.adeptify.es/api/health/db',
      description: 'Database health check del dominio personalizado'
    }
  ];
  
  console.log('\n🔍 Probando URLs...\n');
  
  for (const urlTest of urls) {
    try {
      console.log(`📡 Probando: ${urlTest.name}`);
      console.log(`   URL: ${urlTest.url}`);
      console.log(`   Descripción: ${urlTest.description}`);
      
      const startTime = Date.now();
      const response = await fetch(urlTest.url, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'GEI-Production-Test/1.0'
        }
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   ⏱️ Tiempo de respuesta: ${responseTime}ms`);
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`   📄 Respuesta: ${JSON.stringify(data, null, 2)}`);
          console.log(`   ✅ ${urlTest.name}: FUNCIONANDO`);
        } catch (jsonError) {
          const text = await response.text();
          console.log(`   📄 Respuesta (texto): ${text.substring(0, 200)}...`);
          console.log(`   ✅ ${urlTest.name}: FUNCIONANDO (pero no JSON)`);
        }
      } else {
        console.log(`   ❌ ${urlTest.name}: ERROR ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${urlTest.name}: ERROR - ${error.message}`);
      
      if (error.code === 'ENOTFOUND') {
        console.log(`   💡 Problema: DNS no resuelve el dominio`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Problema: Conexión rechazada`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   💡 Problema: Timeout de conexión`);
      } else if (error.message.includes('SSL')) {
        console.log(`   💡 Problema: Error de certificado SSL`);
      }
    }
    
    console.log(''); // Línea en blanco entre tests
  }
  
  // Análisis de resultados
  console.log('🎯 ANÁLISIS DE RESULTADOS:');
  console.log('==========================');
  console.log('');
  console.log('💡 Si Render funciona pero el dominio personalizado no:');
  console.log('   - Problema de configuración de DNS');
  console.log('   - Problema de configuración de dominio en Render');
  console.log('   - DNS no propagado completamente');
  console.log('');
  console.log('💡 Si Render no funciona:');
  console.log('   - Problema de configuración de Render');
  console.log('   - La aplicación no está iniciando');
  console.log('   - Problema en el código o variables de entorno');
  console.log('');
  console.log('💡 Si ninguna URL funciona:');
  console.log('   - Problema de red/firewall');
  console.log('   - Render está caído');
  console.log('   - Problema de configuración global');
  
  // Comandos adicionales
  console.log('\n🔧 Comandos adicionales para diagnosticar:');
  console.log('==========================================');
  console.log('1. Verificar DNS:');
  console.log('   nslookup gei.adeptify.es');
  console.log('   dig gei.adeptify.es');
  console.log('');
  console.log('2. Verificar en Render Dashboard:');
  console.log('   - Ir a https://dashboard.render.com');
  console.log('   - Seleccionar el servicio gei-unified-platform');
  console.log('   - Verificar logs y estado del servicio');
  console.log('');
  console.log('3. Verificar configuración de dominio:');
  console.log('   - En Render Dashboard, ir a Settings > Domains');
  console.log('   - Verificar que gei.adeptify.es está configurado');
  console.log('   - Verificar que el certificado SSL está activo');
  
  // Próximos pasos
  console.log('\n🎯 PRÓXIMOS PASOS:');
  console.log('==================');
  console.log('1. 🔍 Ejecutar este script para ver resultados');
  console.log('2. 🔍 Verificar logs en Render Dashboard');
  console.log('3. 🔍 Verificar configuración de DNS');
  console.log('4. 🔍 Verificar variables de entorno en Render');
  console.log('5. 🔍 Contactar soporte de Render si es necesario');
}

testProductionUrls().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 