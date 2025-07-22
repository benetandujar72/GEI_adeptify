#!/usr/bin/env node

// Script para configurar variables de entorno en Render
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function configureRenderEnv() {
  console.log('⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO EN RENDER');
  console.log('==================================================');
  
  try {
    // 1. Leer configuración actual
    console.log('\n🔍 Leyendo configuración actual...');
    
    const envExamplePath = join(process.cwd(), 'env.example');
    if (existsSync(envExamplePath)) {
      const envContent = readFileSync(envExamplePath, 'utf8');
      console.log('✅ env.example encontrado');
    } else {
      console.log('❌ env.example no encontrado');
      return;
    }
    
    // 2. Variables requeridas para producción
    console.log('\n📋 VARIABLES REQUERIDAS PARA PRODUCCIÓN:');
    console.log('=========================================');
    console.log('');
    
    const requiredVars = [
      {
        key: 'NODE_ENV',
        value: 'production',
        description: 'Entorno de producción',
        required: true
      },
      {
        key: 'CORS_ORIGIN',
        value: 'https://gei.adeptify.es',
        description: 'Dominio permitido para CORS',
        required: true
      },
      {
        key: 'DATABASE_URL',
        value: 'postgresql://...',
        description: 'URL de conexión a PostgreSQL',
        required: true
      },
      {
        key: 'SESSION_SECRET',
        value: 'tu-session-secret-super-seguro',
        description: 'Clave secreta para sesiones',
        required: true
      },
      {
        key: 'PORT',
        value: '3000',
        description: 'Puerto de la aplicación',
        required: false
      },
      {
        key: 'LOG_LEVEL',
        value: 'info',
        description: 'Nivel de logging',
        required: false
      }
    ];
    
    console.log('🔧 Variables que debes configurar en Render:');
    console.log('');
    
    requiredVars.forEach((variable, index) => {
      const required = variable.required ? '🔴 REQUERIDA' : '🟡 OPCIONAL';
      console.log(`${index + 1}. ${variable.key} (${required})`);
      console.log(`   Valor: ${variable.value}`);
      console.log(`   Descripción: ${variable.description}`);
      console.log('');
    });
    
    // 3. Instrucciones paso a paso
    console.log('📝 INSTRUCCIONES PASO A PASO:');
    console.log('=============================');
    console.log('');
    console.log('1. 🌐 Abrir Render Dashboard:');
    console.log('   https://dashboard.render.com');
    console.log('');
    console.log('2. 🔍 Seleccionar tu servicio:');
    console.log('   gei-unified-platform');
    console.log('');
    console.log('3. ⚙️ Ir a Environment:');
    console.log('   Settings > Environment');
    console.log('');
    console.log('4. ➕ Añadir cada variable:');
    console.log('   - Hacer clic en "Add Environment Variable"');
    console.log('   - Introducir Key y Value');
    console.log('   - Guardar');
    console.log('');
    console.log('5. 🔄 Esperar redeploy:');
    console.log('   Render hará redeploy automáticamente');
    console.log('');
    
    // 4. Configuración específica para CORS
    console.log('🌐 CONFIGURACIÓN ESPECÍFICA PARA CORS:');
    console.log('=====================================');
    console.log('');
    console.log('🔧 Variable: CORS_ORIGIN');
    console.log('📝 Valor: https://gei.adeptify.es');
    console.log('');
    console.log('💡 Explicación:');
    console.log('   - Esta variable permite que tu frontend se comunique con el backend');
    console.log('   - Sin ella, el navegador bloqueará las peticiones');
    console.log('   - Debe coincidir exactamente con tu dominio');
    console.log('');
    console.log('⚠️ Importante:');
    console.log('   - No usar * en producción');
    console.log('   - Incluir https://');
    console.log('   - No incluir barra final');
    console.log('');
    
    // 5. Verificación de configuración
    console.log('✅ VERIFICACIÓN DE CONFIGURACIÓN:');
    console.log('=================================');
    console.log('');
    console.log('🔍 Después de configurar, verifica:');
    console.log('');
    console.log('1. 📊 Estado del servicio:');
    console.log('   - Debe estar "Live"');
    console.log('   - Sin errores en logs');
    console.log('');
    console.log('2. 🌐 Health checks:');
    console.log('   - https://gei.adeptify.es/health');
    console.log('   - https://gei.adeptify.es/api/health');
    console.log('');
    console.log('3. 🔧 Variables de entorno:');
    console.log('   - Todas las variables configuradas');
    console.log('   - Valores correctos');
    console.log('');
    
    // 6. Comandos de prueba
    console.log('🧪 COMANDOS DE PRUEBA:');
    console.log('======================');
    console.log('');
    console.log('1. 🔍 Probar health check:');
    console.log('   curl https://gei.adeptify.es/health');
    console.log('');
    console.log('2. 🔍 Probar API health:');
    console.log('   curl https://gei.adeptify.es/api/health');
    console.log('');
    console.log('3. 🔍 Probar CORS:');
    console.log('   curl -H "Origin: https://gei.adeptify.es" \\');
    console.log('        -X OPTIONS https://gei.adeptify.es/api/health');
    console.log('');
    
    // 7. Solución de problemas
    console.log('🔧 SOLUCIÓN DE PROBLEMAS:');
    console.log('==========================');
    console.log('');
    console.log('❌ Si el servicio no inicia:');
    console.log('   - Verificar DATABASE_URL');
    console.log('   - Verificar SESSION_SECRET');
    console.log('   - Revisar logs de Render');
    console.log('');
    console.log('❌ Si hay errores CORS:');
    console.log('   - Verificar CORS_ORIGIN');
    console.log('   - Asegurar que coincide con el dominio');
    console.log('   - Hacer redeploy');
    console.log('');
    console.log('❌ Si la base de datos no conecta:');
    console.log('   - Verificar DATABASE_URL');
    console.log('   - Verificar que la base de datos esté activa');
    console.log('   - Verificar credenciales');
    console.log('');
    
    // 8. Resumen final
    console.log('🎯 RESUMEN FINAL:');
    console.log('==================');
    console.log('');
    console.log('📋 Variables a configurar en Render:');
    console.log('====================================');
    console.log('NODE_ENV=production');
    console.log('CORS_ORIGIN=https://gei.adeptify.es');
    console.log('DATABASE_URL=tu-url-de-postgresql');
    console.log('SESSION_SECRET=tu-clave-secreta');
    console.log('PORT=3000');
    console.log('LOG_LEVEL=info');
    console.log('');
    console.log('✅ Después de configurar:');
    console.log('   - La aplicación estará disponible en gei.adeptify.es');
    console.log('   - CORS funcionará correctamente');
    console.log('   - Las sesiones se guardarán en PostgreSQL');
    console.log('   - Los logs serán informativos');
    
  } catch (error) {
    console.error('❌ Error en configuración:', error);
  }
}

configureRenderEnv().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 