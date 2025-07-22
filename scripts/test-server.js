#!/usr/bin/env node

// Script para verificar si el servidor está funcionando
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function testServer() {
  console.log('🌐 VERIFICANDO SI EL SERVIDOR ESTÁ FUNCIONANDO');
  console.log('==============================================');
  
  try {
    // Verificar si el servidor está ejecutándose
    console.log('\n🔍 Verificando si el servidor está ejecutándose...');
    
    const port = process.env.PORT || 3000;
    console.log(`✅ Puerto configurado: ${port}`);
    
    // Verificar archivos de build
    console.log('\n📁 Verificando archivos de build...');
    const fs = require('fs');
    const path = require('path');
    
    const buildPaths = [
      'dist/index.js',
      'client/dist/index.html',
      'client/dist/assets'
    ];
    
    buildPaths.forEach(buildPath => {
      try {
        const fullPath = path.join(process.cwd(), buildPath);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            console.log(`  ✅ ${buildPath}: [Directorio]`);
          } else {
            console.log(`  ✅ ${buildPath}: ${stats.size} bytes`);
          }
        } else {
          console.log(`  ❌ ${buildPath}: NO EXISTE`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${buildPath}: Error - ${error.message}`);
      }
    });
    
    // Verificar variables de entorno
    console.log('\n⚙️ Verificando variables de entorno...');
    const envVars = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'SESSION_SECRET'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
          console.log(`  ✅ ${varName}: [CONFIGURADA]`);
        } else {
          console.log(`  ✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`  ⚠️ ${varName}: [NO CONFIGURADA]`);
      }
    });
    
    // Verificar procesos en ejecución
    console.log('\n🔄 Verificando procesos en ejecución...');
    try {
      const { execSync } = require('child_process');
      const processes = execSync('ps aux | grep node', { encoding: 'utf8' });
      console.log('📋 Procesos Node.js en ejecución:');
      processes.split('\n').forEach(line => {
        if (line.includes('node') && !line.includes('grep')) {
          console.log(`  🔄 ${line.trim()}`);
        }
      });
    } catch (error) {
      console.log(`  ⚠️ Error verificando procesos: ${error.message}`);
    }
    
    // Verificar puertos en uso
    console.log('\n🌐 Verificando puertos en uso...');
    try {
      const { execSync } = require('child_process');
      const ports = execSync(`netstat -tlnp 2>/dev/null | grep :${port} || ss -tlnp 2>/dev/null | grep :${port} || lsof -i :${port} 2>/dev/null`, { encoding: 'utf8' });
      if (ports) {
        console.log(`✅ Puerto ${port} está en uso:`);
        ports.split('\n').forEach(line => {
          if (line.trim()) {
            console.log(`  🌐 ${line.trim()}`);
          }
        });
      } else {
        console.log(`❌ Puerto ${port} NO está en uso`);
      }
    } catch (error) {
      console.log(`  ⚠️ Error verificando puertos: ${error.message}`);
    }
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. 🔍 Verificar logs de la aplicación en Render');
    console.log('2. 🔍 Verificar si el build del cliente fue exitoso');
    console.log('3. 🔍 Verificar si hay errores en el servidor');
    console.log('4. 🔍 Verificar si las variables de entorno están configuradas');
    console.log('5. 🔍 Verificar si el puerto está siendo usado por otro proceso');
    
    console.log('\n🔧 Comandos para probar manualmente:');
    console.log('=====================================');
    console.log(`1. curl http://localhost:${port}/health`);
    console.log(`2. curl http://localhost:${port}/api/health`);
    console.log(`3. curl http://localhost:${port}/api/auth/me`);
    console.log('4. ls -la dist/');
    console.log('5. ls -la client/dist/');
    console.log('6. ps aux | grep node');
    console.log(`7. netstat -tlnp | grep :${port}`);
    
    console.log('\n🎯 Estado general: VERIFICANDO SERVIDOR');
    console.log('💡 Revisa los logs de Render para errores específicos');
    
  } catch (error) {
    console.error('❌ Error verificando servidor:', error);
    throw error;
  }
}

testServer().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 