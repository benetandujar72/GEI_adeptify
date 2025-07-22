#!/usr/bin/env node

// Script para verificar configuración de Render
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function verifyRenderConfig() {
  console.log('🔧 VERIFICANDO CONFIGURACIÓN DE RENDER');
  console.log('=======================================');
  
  try {
    // 1. Verificar render.yaml
    console.log('\n📝 Verificando render.yaml...');
    const renderPath = join(process.cwd(), 'render.yaml');
    
    if (!existsSync(renderPath)) {
      console.log('❌ render.yaml no existe');
      return;
    }
    
    const renderConfig = readFileSync(renderPath, 'utf8');
    console.log('✅ render.yaml existe');
    
    // Verificar configuración crítica
    const criticalConfigs = [
      'healthCheckPath: /api/health',
      'startCommand: ./scripts/start-production-optimized.sh',
      'buildCommand: npm install && npm run build'
    ];
    
    criticalConfigs.forEach(config => {
      if (renderConfig.includes(config)) {
        console.log(`  ✅ ${config}`);
      } else {
        console.log(`  ❌ ${config} - NO ENCONTRADO`);
      }
    });
    
    // 2. Verificar script de inicio
    console.log('\n🚀 Verificando script de inicio...');
    const startScriptPath = join(process.cwd(), 'scripts/start-production-optimized.sh');
    
    if (!existsSync(startScriptPath)) {
      console.log('❌ scripts/start-production-optimized.sh no existe');
    } else {
      console.log('✅ scripts/start-production-optimized.sh existe');
      const startScript = readFileSync(startScriptPath, 'utf8');
      console.log(`  📊 Tamaño: ${startScript.length} caracteres`);
    }
    
    // 3. Verificar archivos de build
    console.log('\n📁 Verificando archivos de build...');
    const buildFiles = [
      'dist/index.js',
      'client/dist/index.html',
      'client/dist/assets'
    ];
    
    for (const file of buildFiles) {
      const fullPath = join(process.cwd(), file);
      if (existsSync(fullPath)) {
        const { statSync } = await import('fs');
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          console.log(`  ✅ ${file}: [Directorio]`);
        } else {
          console.log(`  ✅ ${file}: ${stats.size} bytes`);
        }
      } else {
        console.log(`  ❌ ${file}: NO EXISTE`);
      }
    }
    
    // 4. Verificar package.json scripts
    console.log('\n📦 Verificando package.json...');
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    const requiredScripts = ['start', 'build'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts?.[script]) {
        console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`);
      } else {
        console.log(`  ❌ ${script}: NO CONFIGURADO`);
      }
    });
    
    // 5. Análisis del problema SIGTERM
    console.log('\n🛑 ANÁLISIS DEL PROBLEMA SIGTERM:');
    console.log('==================================');
    console.log('Los logs muestran que Render envía SIGTERM al servidor.');
    console.log('Esto indica que Render está terminando el proceso.');
    console.log('');
    console.log('Posibles causas y soluciones:');
    console.log('');
    console.log('1. 🔍 Health Check Timeout:');
    console.log('   - Render espera respuesta en /api/health');
    console.log('   - Si no responde en tiempo, envía SIGTERM');
    console.log('   - Solución: Verificar que /api/health responde rápido');
    console.log('');
    console.log('2. 💾 Límites de Memoria:');
    console.log('   - Plan starter tiene límites de memoria');
    console.log('   - Si se excede, Render termina el proceso');
    console.log('   - Solución: Optimizar uso de memoria');
    console.log('');
    console.log('3. ⏰ Timeout de Inicio:');
    console.log('   - Render tiene timeout para que la app esté lista');
    console.log('   - Si tarda mucho en iniciar, envía SIGTERM');
    console.log('   - Solución: Optimizar tiempo de inicio');
    console.log('');
    console.log('4. 🔄 Auto-restart:');
    console.log('   - Render puede reiniciar por configuración');
    console.log('   - Verificar configuración de auto-restart');
    console.log('');
    
    // 6. Recomendaciones específicas
    console.log('💡 RECOMENDACIONES ESPECÍFICAS:');
    console.log('================================');
    console.log('1. ✅ Verificar en Render Dashboard:');
    console.log('   - Ir a https://dashboard.render.com');
    console.log('   - Seleccionar el servicio gei-unified-platform');
    console.log('   - Verificar logs completos');
    console.log('   - Verificar métricas de memoria/CPU');
    console.log('');
    console.log('2. ✅ Probar health check manualmente:');
    console.log('   - curl https://gei-adeptify.onrender.com/health');
    console.log('   - curl https://gei-adeptify.onrender.com/api/health');
    console.log('   - curl https://gei-adeptify.onrender.com/api/health/db');
    console.log('');
    console.log('3. ✅ Verificar variables de entorno en Render:');
    console.log('   - NODE_ENV=production');
    console.log('   - DATABASE_URL (configurada)');
    console.log('   - SESSION_SECRET (configurada)');
    console.log('   - PORT=3000');
    console.log('');
    console.log('4. ✅ Optimizar script de inicio:');
    console.log('   - Verificar que start-production-optimized.sh funciona');
    console.log('   - Asegurar que el servidor inicia rápido');
    console.log('   - Verificar que responde a health checks');
    
    // 7. Comandos para ejecutar en Render
    console.log('\n🔧 Comandos para ejecutar en Render:');
    console.log('====================================');
    console.log('1. Verificar proceso:');
    console.log('   ps aux | grep node');
    console.log('');
    console.log('2. Verificar memoria:');
    console.log('   free -m');
    console.log('');
    console.log('3. Verificar puerto:');
    console.log('   netstat -tlnp | grep :3000');
    console.log('');
    console.log('4. Verificar logs:');
    console.log('   tail -f /var/log/render.log');
    console.log('');
    console.log('5. Probar endpoints:');
    console.log('   curl -v http://localhost:3000/health');
    console.log('   curl -v http://localhost:3000/api/health');
    console.log('   curl -v http://localhost:3000/api/health/db');
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error);
  }
}

verifyRenderConfig().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 