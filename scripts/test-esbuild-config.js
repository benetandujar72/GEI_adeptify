#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('🔍 Probando configuración de esbuild...');

try {
  // Verificar que los archivos necesarios existen
  const requiredFiles = [
    'esbuild.config.js',
    'shared/schema.ts',
    'server/index.ts'
  ];

  console.log('📁 Verificando archivos requeridos...');
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} existe`);
    } else {
      console.log(`❌ ${file} NO existe`);
      process.exit(1);
    }
  }

  // Verificar que el directorio shared existe
  if (fs.existsSync('shared')) {
    console.log('✅ Directorio shared existe');
    console.log('📂 Contenido del directorio shared:');
    const sharedFiles = fs.readdirSync('shared');
    sharedFiles.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log('❌ Directorio shared NO existe');
    process.exit(1);
  }

  // Probar la configuración de esbuild
  console.log('🔧 Probando build del servidor...');
  execSync('npm run build:server', { stdio: 'inherit' });
  
  console.log('✅ Build del servidor completado exitosamente');
  
  // Verificar que el archivo de salida existe
  if (fs.existsSync('dist/index.js')) {
    console.log('✅ Archivo de salida dist/index.js creado');
  } else {
    console.log('❌ Archivo de salida dist/index.js NO existe');
    process.exit(1);
  }

  console.log('🎉 Todas las pruebas pasaron exitosamente!');

} catch (error) {
  console.error('❌ Error durante las pruebas:', error.message);
  process.exit(1);
} 