#!/usr/bin/env node

// Script para verificar el despliegue en Render
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 VERIFICANDO DESPLIEGUE EN RENDER');
console.log('===================================');

const issues = [];
const warnings = [];
const successes = [];

try {
  // 1. Verificar archivos críticos para Render
  console.log('\n📁 VERIFICANDO ARCHIVOS CRÍTICOS PARA RENDER');
  console.log('=============================================');

  const criticalFiles = [
    'package.json',
    'scripts/start-render.js',
    'dist/index.js',
    'dist/client/index.html'
  ];

  for (const file of criticalFiles) {
    const fullPath = join(__dirname, '..', file);
    if (existsSync(fullPath)) {
      console.log(`✅ ${file}`);
      successes.push(`Archivo ${file} presente`);
    } else {
      console.log(`❌ ${file} - FALTANTE`);
      issues.push(`Archivo crítico ${file} no encontrado`);
    }
  }

  // 2. Verificar package.json
  console.log('\n📦 VERIFICANDO PACKAGE.JSON');
  console.log('============================');

  try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    
    // Verificar script de inicio
    if (packageJson.scripts && packageJson.scripts.start) {
      console.log(`✅ start: ${packageJson.scripts.start}`);
      successes.push('Script start configurado');
    } else {
      console.log(`❌ start - FALTANTE en scripts`);
      issues.push('Script start no configurado en package.json');
    }

    // Verificar dependencias críticas
    const criticalDeps = [
      'express',
      'cors',
      'helmet',
      'compression'
    ];

    for (const dep of criticalDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
        successes.push(`Dependencia ${dep} instalada`);
      } else {
        console.log(`❌ ${dep} - FALTANTE en dependencies`);
        issues.push(`Dependencia ${dep} no instalada`);
      }
    }

  } catch (error) {
    console.log(`❌ Error leyendo package.json: ${error.message}`);
    issues.push(`Error al leer package.json: ${error.message}`);
  }

  // 3. Verificar variables de entorno
  console.log('\n🔧 VERIFICANDO VARIABLES DE ENTORNO');
  console.log('===================================');

  const requiredEnvVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'PORT'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: ${envVar === 'DATABASE_URL' ? '***configurada***' : process.env[envVar]}`);
      successes.push(`Variable de entorno ${envVar} configurada`);
    } else {
      console.log(`⚠️ ${envVar} - NO CONFIGURADA (se configurará en Render)`);
      warnings.push(`Variable de entorno ${envVar} no configurada localmente`);
    }
  }

  // 4. Verificar directorios de build
  console.log('\n🏗️ VERIFICANDO DIRECTORIOS DE BUILD');
  console.log('===================================');

  const buildDirs = [
    'dist',
    'dist/client',
    'node_modules'
  ];

  for (const dir of buildDirs) {
    const fullPath = join(__dirname, '..', dir);
    if (existsSync(fullPath)) {
      console.log(`✅ ${dir}/ (directorio presente)`);
      successes.push(`Directorio ${dir} presente`);
    } else {
      console.log(`⚠️ ${dir}/ - NO ENCONTRADO`);
      warnings.push(`Directorio ${dir} no encontrado`);
    }
  }

  // 5. Verificar archivos de configuración específicos
  console.log('\n⚙️ VERIFICANDO CONFIGURACIONES ESPECÍFICAS');
  console.log('==========================================');

  const configFiles = [
    'render.yaml',
    'scripts/start-render.js',
    'scripts/start-production.js'
  ];

  for (const file of configFiles) {
    const fullPath = join(__dirname, '..', file);
    if (existsSync(fullPath)) {
      console.log(`✅ ${file}`);
      successes.push(`Archivo de configuración ${file} presente`);
    } else {
      console.log(`⚠️ ${file} - NO ENCONTRADO`);
      warnings.push(`Archivo de configuración ${file} no encontrado`);
    }
  }

  // 6. Verificar configuración de Render
  console.log('\n🌐 VERIFICANDO CONFIGURACIÓN DE RENDER');
  console.log('======================================');

  const renderFiles = [
    'render.yaml',
    'scripts/start-render.js'
  ];

  let renderConfigOk = true;
  for (const file of renderFiles) {
    const fullPath = join(__dirname, '..', file);
    if (!existsSync(fullPath)) {
      renderConfigOk = false;
      break;
    }
  }

  if (renderConfigOk) {
    console.log('✅ Configuración de Render completa');
    successes.push('Configuración de Render completa');
  } else {
    console.log('⚠️ Configuración de Render incompleta');
    warnings.push('Configuración de Render incompleta');
  }

  // 7. Resumen del diagnóstico
  console.log('\n🎯 RESUMEN DE VERIFICACIÓN PARA RENDER');
  console.log('======================================');

  console.log(`✅ Éxitos: ${successes.length}`);
  console.log(`⚠️ Advertencias: ${warnings.length}`);
  console.log(`❌ Problemas: ${issues.length}`);

  if (issues.length === 0) {
    console.log('\n🎉 DESPLIEGUE LISTO PARA RENDER');
    console.log('===============================');
    console.log('✅ Todos los componentes están listos para Render');
    console.log('🚀 El proyecto está listo para despliegue');
  } else {
    console.log('\n❌ PROBLEMAS DETECTADOS');
    console.log('======================');
    console.log('❌ Se encontraron problemas que deben resolverse');
    console.log('💡 Revisa las recomendaciones a continuación');
  }

  // Mostrar problemas
  if (issues.length > 0) {
    console.log('\n🔧 PROBLEMAS A RESOLVER:');
    console.log('========================');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  // Mostrar advertencias
  if (warnings.length > 0) {
    console.log('\n⚠️ ADVERTENCIAS:');
    console.log('===============');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES PARA RENDER:');
  console.log('===============================');
  
  if (issues.length > 0) {
    console.log('1. Resuelve los problemas críticos antes del despliegue');
    console.log('2. Verifica que todos los archivos estén en el repositorio');
    console.log('3. Asegúrate de que el build funcione correctamente');
  }
  
  console.log('4. Configura las variables de entorno en Render');
  console.log('5. Verifica que el puerto esté configurado correctamente');
  console.log('6. Asegúrate de que DATABASE_URL esté configurada en Render');
  console.log('7. Verifica los logs de Render después del despliegue');

  // Código de salida
  const exitCode = issues.length > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    console.log('\n✅ Verificación completada exitosamente');
  } else {
    console.log('\n❌ Verificación completada con problemas');
  }

  process.exit(exitCode);

} catch (error) {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN:');
  console.error('============================');
  console.error(error.message);
  process.exit(1);
} 