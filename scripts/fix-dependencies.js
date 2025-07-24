#!/usr/bin/env node

/**
 * Script para verificar y corregir dependencias del proyecto
 * Resuelve problemas de importación y configuración
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Iniciando verificación y corrección de dependencias...\n');

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Función para verificar estructura de directorios
function checkDirectoryStructure() {
  console.log('📁 Verificando estructura de directorios...');
  
  const requiredDirs = [
    'client/src',
    'client/src/components',
    'client/src/components/ui',
    'client/src/pages',
    'client/src/pages/adeptify',
    'client/src/pages/assistatut',
    'client/src/hooks',
    'client/src/lib',
    'server/routes',
    'server/middleware'
  ];
  
  let allDirsExist = true;
  
  requiredDirs.forEach(dir => {
    if (!fileExists(dir)) {
      console.log(`❌ Directorio faltante: ${dir}`);
      allDirsExist = false;
    } else {
      console.log(`✅ ${dir}`);
    }
  });
  
  return allDirsExist;
}

// Función para verificar archivos críticos
function checkCriticalFiles() {
  console.log('\n📄 Verificando archivos críticos...');
  
  const criticalFiles = [
    'package.json',
    'client/vite.config.ts',
    'client/src/App.tsx',
    'client/src/main.tsx',
    'server/index.ts',
    'server/routes/index.ts',
    'server/routes/auth.ts'
  ];
  
  let allFilesExist = true;
  
  criticalFiles.forEach(file => {
    if (!fileExists(file)) {
      console.log(`❌ Archivo faltante: ${file}`);
      allFilesExist = false;
    } else {
      console.log(`✅ ${file}`);
    }
  });
  
  return allFilesExist;
}

// Función para verificar dependencias
function checkDependencies() {
  console.log('\n📦 Verificando dependencias...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Verificar dependencias críticas
    const criticalDeps = [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
      'axios',
      'lucide-react',
      'sonner',
      'express',
      'cors',
      'dotenv'
    ];
    
    let allDepsExist = true;
    
    criticalDeps.forEach(dep => {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        console.log(`❌ Dependencia faltante: ${dep}`);
        allDepsExist = false;
      } else {
        console.log(`✅ ${dep}`);
      }
    });
    
    return allDepsExist;
  } catch (error) {
    console.log('❌ Error leyendo package.json:', error.message);
    return false;
  }
}

// Función para limpiar node_modules y reinstalar
function reinstallDependencies() {
  console.log('\n🔄 Reinstalando dependencias...');
  
  try {
    console.log('🗑️  Eliminando node_modules...');
    if (fileExists('node_modules')) {
      execSync('rm -rf node_modules', { stdio: 'inherit' });
    }
    
    console.log('🗑️  Eliminando package-lock.json...');
    if (fileExists('package-lock.json')) {
      execSync('rm package-lock.json', { stdio: 'inherit' });
    }
    
    console.log('📦 Instalando dependencias...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencias reinstaladas correctamente');
    return true;
  } catch (error) {
    console.log('❌ Error reinstalando dependencias:', error.message);
    return false;
  }
}

// Función para verificar configuración de Vite
function checkViteConfig() {
  console.log('\n⚙️  Verificando configuración de Vite...');
  
  try {
    const viteConfig = fs.readFileSync('client/vite.config.ts', 'utf8');
    
    // Verificar configuraciones importantes
    const checks = [
      { name: 'Alias @ configurado', check: viteConfig.includes('@: path.resolve') },
      { name: 'Proxy configurado', check: viteConfig.includes('proxy: {') },
      { name: 'Puerto configurado', check: viteConfig.includes('port: 3000') },
      { name: 'Target del proxy', check: viteConfig.includes('target: \'http://localhost:3001\'') }
    ];
    
    let allChecksPass = true;
    
    checks.forEach(({ name, check }) => {
      if (check) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name}`);
        allChecksPass = false;
      }
    });
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ Error verificando configuración de Vite:', error.message);
    return false;
  }
}

// Función para verificar configuración del servidor
function checkServerConfig() {
  console.log('\n🖥️  Verificando configuración del servidor...');
  
  try {
    const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
    
    // Verificar configuraciones importantes
    const checks = [
      { name: 'Puerto configurado', check: serverIndex.includes('PORT') || serverIndex.includes('3001') },
      { name: 'CORS configurado', check: serverIndex.includes('cors') },
      { name: 'Rutas configuradas', check: serverIndex.includes('setupRoutes') }
    ];
    
    let allChecksPass = true;
    
    checks.forEach(({ name, check }) => {
      if (check) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name}`);
        allChecksPass = false;
      }
    });
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ Error verificando configuración del servidor:', error.message);
    return false;
  }
}

// Función principal
function main() {
  console.log('🚀 GEI Unified Platform - Verificación de Dependencias\n');
  
  const results = {
    directories: checkDirectoryStructure(),
    files: checkCriticalFiles(),
    dependencies: checkDependencies(),
    vite: checkViteConfig(),
    server: checkServerConfig()
  };
  
  console.log('\n📊 Resumen de verificación:');
  console.log(`📁 Directorios: ${results.directories ? '✅' : '❌'}`);
  console.log(`📄 Archivos: ${results.files ? '✅' : '❌'}`);
  console.log(`📦 Dependencias: ${results.dependencies ? '✅' : '❌'}`);
  console.log(`⚙️  Vite: ${results.vite ? '✅' : '❌'}`);
  console.log(`🖥️  Servidor: ${results.server ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ¡Todas las verificaciones pasaron! El proyecto está listo.');
  } else {
    console.log('\n⚠️  Se encontraron problemas. ¿Deseas reinstalar las dependencias? (y/n)');
    
    // En un entorno automatizado, siempre reinstalar
    console.log('🔄 Reinstalando dependencias automáticamente...');
    reinstallDependencies();
  }
  
  console.log('\n✨ Verificación completada.');
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = {
  checkDirectoryStructure,
  checkCriticalFiles,
  checkDependencies,
  checkViteConfig,
  checkServerConfig,
  reinstallDependencies
}; 