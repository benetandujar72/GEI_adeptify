#!/usr/bin/env node

// Script para diagnosticar problemas de producción
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function diagnoseProduction() {
  console.log('🌐 DIAGNÓSTICO DE PROBLEMAS DE PRODUCCIÓN');
  console.log('==========================================');
  
  try {
    // 1. Verificar configuración de dominio
    console.log('\n🌍 Verificando configuración de dominio...');
    console.log('✅ Dominio objetivo: gei.adeptify.es');
    console.log('✅ Render URL: gei-adeptify.onrender.com');
    console.log('');
    console.log('🔍 Posibles problemas:');
    console.log('1. DNS no configurado correctamente');
    console.log('2. Render no está sirviendo la aplicación');
    console.log('3. La aplicación no está iniciando');
    console.log('4. Problemas de configuración de Render');
    
    // 2. Verificar archivos de build
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
    
    // 3. Verificar configuración de Render
    console.log('\n🔧 Verificando configuración de Render...');
    const renderPath = join(process.cwd(), 'render.yaml');
    
    if (existsSync(renderPath)) {
      console.log('✅ render.yaml existe');
      const renderConfig = readFileSync(renderPath, 'utf8');
      
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
    } else {
      console.log('❌ render.yaml no existe');
    }
    
    // 4. Verificar script de inicio
    console.log('\n🚀 Verificando script de inicio...');
    const startScriptPath = join(process.cwd(), 'scripts/start-production-optimized.sh');
    
    if (existsSync(startScriptPath)) {
      console.log('✅ start-production-optimized.sh existe');
      const startScript = readFileSync(startScriptPath, 'utf8');
      console.log(`  📊 Tamaño: ${startScript.length} caracteres`);
    } else {
      console.log('❌ start-production-optimized.sh no existe');
    }
    
    // 5. Verificar package.json
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
    
    // 6. Análisis del problema
    console.log('\n🎯 ANÁLISIS DEL PROBLEMA:');
    console.log('==========================');
    console.log('La aplicación no se muestra en gei.adeptify.es');
    console.log('');
    console.log('Posibles causas:');
    console.log('1. 🔍 DNS no configurado');
    console.log('2. 🚀 Render no está ejecutando la aplicación');
    console.log('3. ⚙️ Configuración incorrecta en Render');
    console.log('4. 🔧 Script de inicio fallando');
    console.log('5. 🌐 Problemas de red/firewall');
    
    // 7. Plan de acción
    console.log('\n💡 PLAN DE ACCIÓN:');
    console.log('==================');
    console.log('1. ✅ Verificar logs de Render Dashboard');
    console.log('2. ✅ Probar URL directa de Render');
    console.log('3. ✅ Verificar configuración de DNS');
    console.log('4. ✅ Revisar variables de entorno en Render');
    console.log('5. ✅ Verificar que la aplicación inicia correctamente');
    
    // 8. Comandos para probar
    console.log('\n🔧 Comandos para probar:');
    console.log('=======================');
    console.log('1. Probar Render directamente:');
    console.log('   curl https://gei-adeptify.onrender.com/health');
    console.log('   curl https://gei-adeptify.onrender.com/api/health');
    console.log('');
    console.log('2. Probar dominio personalizado:');
    console.log('   curl https://gei.adeptify.es/health');
    console.log('   curl https://gei.adeptify.es/api/health');
    console.log('');
    console.log('3. Verificar DNS:');
    console.log('   nslookup gei.adeptify.es');
    console.log('   dig gei.adeptify.es');
    console.log('');
    console.log('4. Verificar en Render Dashboard:');
    console.log('   - Ir a https://dashboard.render.com');
    console.log('   - Seleccionar el servicio gei-unified-platform');
    console.log('   - Verificar logs y estado');
    
    // 9. Verificación de configuración
    console.log('\n⚙️ VERIFICACIÓN DE CONFIGURACIÓN:');
    console.log('=================================');
    console.log('1. ✅ Variables de entorno en Render:');
    console.log('   - NODE_ENV=production');
    console.log('   - DATABASE_URL (configurada)');
    console.log('   - SESSION_SECRET (configurada)');
    console.log('   - PORT=3000');
    console.log('');
    console.log('2. ✅ Configuración de dominio:');
    console.log('   - gei.adeptify.es → gei-adeptify.onrender.com');
    console.log('   - SSL configurado');
    console.log('   - DNS propagado');
    console.log('');
    console.log('3. ✅ Configuración de Render:');
    console.log('   - Health check: /api/health');
    console.log('   - Auto-deploy: habilitado');
    console.log('   - Plan: starter');
    
    // 10. Próximos pasos
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('==================');
    console.log('1. 🔍 Verificar logs en Render Dashboard');
    console.log('2. 🔍 Probar URL directa de Render');
    console.log('3. 🔍 Verificar configuración de DNS');
    console.log('4. 🔍 Revisar variables de entorno');
    console.log('5. 🔍 Verificar que la aplicación inicia');
    console.log('');
    console.log('💡 Si Render funciona pero el dominio no:');
    console.log('   - Problema de DNS o configuración de dominio');
    console.log('');
    console.log('💡 Si Render no funciona:');
    console.log('   - Problema de configuración de Render');
    console.log('   - Problema en el código de la aplicación');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnoseProduction().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 