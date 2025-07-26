#!/usr/bin/env node

/**
 * Script de inicio simple para Render
 * Enfoque directo sin complejidad innecesaria
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Configurar dotenv
config();

console.log('🚀 ===== INICIO RENDER SIMPLE =====');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`📁 PWD: ${process.cwd()}`);

// Verificaciones básicas
console.log('\n🔍 Verificaciones básicas...');

// 1. Verificar archivo de build
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ dist/index.js no encontrado. Ejecutando build...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completado');
  } catch (error) {
    console.error('❌ Error en build:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ dist/index.js existe');
}

// 2. Verificar variables críticas
const criticalVars = ['DATABASE_URL', 'NODE_ENV', 'PORT'];
for (const varName of criticalVars) {
  if (!process.env[varName]) {
    console.error(`❌ Variable crítica no configurada: ${varName}`);
    process.exit(1);
  }
  console.log(`✅ ${varName} configurada`);
}

// 3. Iniciar servidor
console.log('\n🚀 Iniciando servidor...');
console.log(`📊 Puerto: ${process.env.PORT}`);
console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);

try {
  const { spawn } = await import('child_process');
  const serverPath = path.join(process.cwd(), 'dist', 'index.js');
  
  console.log(`🎯 Iniciando desde: ${serverPath}`);
  
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  
  // Manejar señales
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando...');
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido, cerrando...');
    server.kill('SIGINT');
  });
  
  server.on('close', (code) => {
    console.log(`🔄 Servidor cerrado con código: ${code}`);
    process.exit(code || 0);
  });
  
  server.on('error', (error) => {
    console.error('❌ Error en servidor:', error);
    process.exit(1);
  });
  
  console.log('✅ Servidor iniciado correctamente');
  
} catch (error) {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
} 