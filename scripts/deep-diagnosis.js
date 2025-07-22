#!/usr/bin/env node

// Script para diagnóstico profundo del problema de visualización
import fetch from 'node-fetch';

async function deepDiagnosis() {
  console.log('🔍 DIAGNÓSTICO PROFUNDO - PROBLEMA DE VISUALIZACIÓN');
  console.log('===================================================');
  
  try {
    const urls = [
      'https://gei.adeptify.es',
      'https://gei.adeptify.es/',
      'https://gei-adeptify.onrender.com',
      'https://gei-adeptify.onrender.com/'
    ];
    
    console.log('\n🌐 PROBANDO URLs PRINCIPALES:');
    console.log('=============================');
    
    for (const url of urls) {
      try {
        console.log(`\n📡 Probando: ${url}`);
        
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'GEI-Deep-Diagnosis/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          redirect: 'follow',
          timeout: 10000
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`   ⏱️ Tiempo: ${responseTime}ms`);
        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        console.log(`   🔗 URL final: ${response.url}`);
        console.log(`   📏 Tamaño: ${response.headers.get('content-length') || 'desconocido'} bytes`);
        console.log(`   🏷️ Content-Type: ${response.headers.get('content-type') || 'no especificado'}`);
        
        // Verificar si es HTML
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          const html = await response.text();
          console.log(`   📄 Primeros 500 caracteres:`);
          console.log(`   ${html.substring(0, 500)}...`);
          
          // Buscar elementos clave
          const hasTitle = html.includes('<title>');
          const hasBody = html.includes('<body>');
          const hasReact = html.includes('react') || html.includes('React');
          const hasScript = html.includes('<script');
          
          console.log(`   🔍 Análisis HTML:`);
          console.log(`      ${hasTitle ? '✅' : '❌'} Título: ${hasTitle}`);
          console.log(`      ${hasBody ? '✅' : '❌'} Body: ${hasBody}`);
          console.log(`      ${hasReact ? '✅' : '❌'} React: ${hasReact}`);
          console.log(`      ${hasScript ? '✅' : '❌'} Scripts: ${hasScript}`);
          
        } else {
          console.log(`   📄 Respuesta no HTML: ${contentType}`);
          const text = await response.text();
          console.log(`   ${text.substring(0, 200)}...`);
        }
        
        // Verificar headers importantes
        const importantHeaders = {
          'Server': response.headers.get('server'),
          'X-Powered-By': response.headers.get('x-powered-by'),
          'Cache-Control': response.headers.get('cache-control'),
          'Location': response.headers.get('location')
        };
        
        console.log(`   📋 Headers importantes:`);
        Object.entries(importantHeaders).forEach(([key, value]) => {
          if (value) {
            console.log(`      ${key}: ${value}`);
          }
        });
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        if (error.code) {
          console.log(`   🔧 Código de error: ${error.code}`);
        }
      }
    }
    
    // Pruebas específicas de archivos estáticos
    console.log('\n📁 PROBANDO ARCHIVOS ESTÁTICOS:');
    console.log('================================');
    
    const staticFiles = [
      '/index.html',
      '/assets/index.js',
      '/assets/index.css',
      '/favicon.ico'
    ];
    
    for (const file of staticFiles) {
      try {
        const url = `https://gei.adeptify.es${file}`;
        console.log(`\n📡 Probando archivo: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'GEI-Deep-Diagnosis/1.0'
          },
          timeout: 5000
        });
        
        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        console.log(`   📏 Tamaño: ${response.headers.get('content-length') || 'desconocido'} bytes`);
        console.log(`   🏷️ Content-Type: ${response.headers.get('content-type') || 'no especificado'}`);
        
        if (response.ok) {
          console.log(`   ✅ Archivo encontrado`);
        } else {
          console.log(`   ❌ Archivo no encontrado`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Pruebas de DNS
    console.log('\n🌍 VERIFICACIÓN DE DNS:');
    console.log('=======================');
    console.log('💡 Para verificar DNS manualmente:');
    console.log('   nslookup gei.adeptify.es');
    console.log('   dig gei.adeptify.es');
    console.log('   ping gei.adeptify.es');
    
    // Análisis del problema
    console.log('\n🎯 ANÁLISIS DEL PROBLEMA:');
    console.log('==========================');
    console.log('');
    console.log('🔍 Posibles causas:');
    console.log('');
    console.log('1. 🌐 Problema de DNS:');
    console.log('   - El dominio no resuelve correctamente');
    console.log('   - DNS no propagado completamente');
    console.log('   - Configuración incorrecta en el proveedor de DNS');
    console.log('');
    console.log('2. 🚀 Problema de Render:');
    console.log('   - La aplicación no está sirviendo archivos estáticos');
    console.log('   - Configuración incorrecta de rutas');
    console.log('   - Problema con el build del frontend');
    console.log('');
    console.log('3. 📁 Problema de archivos:');
    console.log('   - Los archivos del frontend no se están sirviendo');
    console.log('   - Problema con la configuración de rutas en Express');
    console.log('   - Archivos no encontrados en el servidor');
    console.log('');
    console.log('4. 🔧 Problema de configuración:');
    console.log('   - Variables de entorno incorrectas');
    console.log('   - Configuración de dominio en Render');
    console.log('   - Problema con SSL/certificados');
    
    // Próximos pasos
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. 🔍 Verificar logs de Render Dashboard');
    console.log('2. 🔍 Verificar configuración de dominio en Render');
    console.log('3. 🔍 Verificar que el build del frontend se completó');
    console.log('4. 🔍 Verificar configuración de rutas en Express');
    console.log('5. 🔍 Verificar DNS con herramientas externas');
    console.log('6. 🔍 Contactar soporte de Render si es necesario');
    
    // Comandos para verificar
    console.log('\n🔧 COMANDOS PARA VERIFICAR:');
    console.log('===========================');
    console.log('1. Verificar DNS:');
    console.log('   nslookup gei.adeptify.es');
    console.log('   dig gei.adeptify.es');
    console.log('');
    console.log('2. Verificar conectividad:');
    console.log('   ping gei.adeptify.es');
    console.log('   telnet gei.adeptify.es 443');
    console.log('');
    console.log('3. Verificar con curl:');
    console.log('   curl -I https://gei.adeptify.es');
    console.log('   curl -v https://gei.adeptify.es');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

deepDiagnosis().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 