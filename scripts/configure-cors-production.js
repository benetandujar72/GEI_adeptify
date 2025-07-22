#!/usr/bin/env node

// Script para configurar CORS_ORIGIN en producción
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function configureCorsProduction() {
  console.log('🌐 CONFIGURACIÓN DE CORS PARA PRODUCCIÓN');
  console.log('=========================================');
  
  try {
    // 1. Verificar configuración actual
    console.log('\n🔍 Verificando configuración actual...');
    
    const envExamplePath = join(process.cwd(), 'env.example');
    if (existsSync(envExamplePath)) {
      const envContent = readFileSync(envExamplePath, 'utf8');
      const corsLine = envContent.split('\n').find(line => line.startsWith('CORS_ORIGIN'));
      if (corsLine) {
        console.log(`📋 Configuración actual: ${corsLine.trim()}`);
      }
    }
    
    // 2. Explicar la función de CORS_ORIGIN
    console.log('\n📚 FUNCIÓN DE CORS_ORIGIN:');
    console.log('============================');
    console.log('🔧 ¿Qué es CORS?');
    console.log('   - CORS = Cross-Origin Resource Sharing');
    console.log('   - Permite que el frontend se comunique con el backend');
    console.log('   - Es una medida de seguridad del navegador');
    console.log('');
    console.log('⚠️ ¿Por qué es importante?');
    console.log('   - Sin CORS configurado, el navegador bloquea las peticiones');
    console.log('   - Causa errores: "Access to fetch has been blocked by CORS policy"');
    console.log('   - Impide que el frontend funcione correctamente');
    
    // 3. Valores correctos para producción
    console.log('\n🎯 VALORES CORRECTOS PARA PRODUCCIÓN:');
    console.log('=====================================');
    console.log('');
    console.log('🌐 Para tu aplicación en gei.adeptify.es:');
    console.log('');
    console.log('✅ OPCIÓN 1 - Dominio específico (RECOMENDADO):');
    console.log('   CORS_ORIGIN=https://gei.adeptify.es');
    console.log('');
    console.log('✅ OPCIÓN 2 - Múltiples dominios:');
    console.log('   CORS_ORIGIN=https://gei.adeptify.es,https://www.gei.adeptify.es');
    console.log('');
    console.log('✅ OPCIÓN 3 - Dominio con subdominios:');
    console.log('   CORS_ORIGIN=https://*.adeptify.es');
    console.log('');
    console.log('⚠️ OPCIÓN 4 - Solo para desarrollo (NO USAR EN PRODUCCIÓN):');
    console.log('   CORS_ORIGIN=*');
    console.log('');
    
    // 4. Configuración en Render
    console.log('🔧 CONFIGURACIÓN EN RENDER:');
    console.log('===========================');
    console.log('');
    console.log('1. 🌐 Ir a Render Dashboard:');
    console.log('   https://dashboard.render.com');
    console.log('');
    console.log('2. 🔍 Seleccionar tu servicio:');
    console.log('   gei-unified-platform');
    console.log('');
    console.log('3. ⚙️ Ir a Environment:');
    console.log('   Settings > Environment');
    console.log('');
    console.log('4. ➕ Añadir variable:');
    console.log('   Key: CORS_ORIGIN');
    console.log('   Value: https://gei.adeptify.es');
    console.log('');
    console.log('5. 💾 Guardar cambios');
    console.log('');
    console.log('6. 🔄 Redeploy automático');
    console.log('   Render hará redeploy automáticamente');
    
    // 5. Verificar configuración actual en el código
    console.log('\n📁 VERIFICANDO CONFIGURACIÓN EN EL CÓDIGO:');
    console.log('==========================================');
    
    const serverPath = join(process.cwd(), 'server/index.ts');
    if (existsSync(serverPath)) {
      const serverContent = readFileSync(serverPath, 'utf8');
      const corsSection = serverContent.split('\n').slice(65, 80).join('\n');
      console.log('🔍 Configuración CORS en server/index.ts:');
      console.log(corsSection);
      console.log('');
    }
    
    // 6. Comandos para probar
    console.log('🧪 COMANDOS PARA PROBAR:');
    console.log('=========================');
    console.log('');
    console.log('1. 🔍 Probar CORS desde el navegador:');
    console.log('   - Abrir DevTools (F12)');
    console.log('   - Ir a Console');
    console.log('   - Ejecutar: fetch("/api/health")');
    console.log('');
    console.log('2. 🔍 Probar desde curl:');
    console.log('   curl -H "Origin: https://gei.adeptify.es" \\');
    console.log('        -H "Access-Control-Request-Method: GET" \\');
    console.log('        -H "Access-Control-Request-Headers: Content-Type" \\');
    console.log('        -X OPTIONS https://gei.adeptify.es/api/health');
    console.log('');
    console.log('3. 🔍 Verificar headers de respuesta:');
    console.log('   curl -I https://gei.adeptify.es/api/health');
    
    // 7. Solución de problemas comunes
    console.log('\n🔧 SOLUCIÓN DE PROBLEMAS COMUNES:');
    console.log('==================================');
    console.log('');
    console.log('❌ Error: "Access to fetch has been blocked by CORS policy"');
    console.log('💡 Solución:');
    console.log('   1. Verificar que CORS_ORIGIN está configurado correctamente');
    console.log('   2. Asegurar que el dominio coincide exactamente');
    console.log('   3. Verificar que incluye https://');
    console.log('');
    console.log('❌ Error: "No \'Access-Control-Allow-Origin\' header"');
    console.log('💡 Solución:');
    console.log('   1. Verificar que la variable está en Render');
    console.log('   2. Hacer redeploy de la aplicación');
    console.log('   3. Verificar logs de Render');
    console.log('');
    console.log('❌ Error: "Credentials flag is \'true\'"');
    console.log('💡 Solución:');
    console.log('   1. No usar CORS_ORIGIN=* con credentials: true');
    console.log('   2. Usar dominio específico');
    console.log('   3. Verificar configuración de cookies');
    
    // 8. Configuración recomendada final
    console.log('\n🎯 CONFIGURACIÓN RECOMENDADA FINAL:');
    console.log('===================================');
    console.log('');
    console.log('📋 Variables de entorno en Render:');
    console.log('==================================');
    console.log('NODE_ENV=production');
    console.log('CORS_ORIGIN=https://gei.adeptify.es');
    console.log('DATABASE_URL=tu-url-de-base-de-datos');
    console.log('SESSION_SECRET=tu-session-secret');
    console.log('PORT=3000');
    console.log('');
    console.log('📋 Verificación:');
    console.log('===============');
    console.log('✅ CORS_ORIGIN configurado');
    console.log('✅ Dominio específico (no wildcard)');
    console.log('✅ HTTPS configurado');
    console.log('✅ Variables guardadas en Render');
    console.log('✅ Redeploy completado');
    
    // 9. Próximos pasos
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. 🔧 Configurar CORS_ORIGIN en Render Dashboard');
    console.log('2. 🔄 Esperar redeploy automático');
    console.log('3. 🧪 Probar la aplicación');
    console.log('4. 🔍 Verificar que no hay errores CORS');
    console.log('5. ✅ Confirmar que todo funciona');
    
  } catch (error) {
    console.error('❌ Error en configuración:', error);
  }
}

configureCorsProduction().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 