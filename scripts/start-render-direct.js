#!/usr/bin/env node

/**
 * Script de inicio directo para Render
 * Inicia el servidor directamente sin verificaciones complejas
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';

// Configurar dotenv
config();

console.log('🚀 ===== INICIO RENDER DIRECTO =====');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`📁 PWD: ${process.cwd()}`);

// Iniciar servidor directamente
console.log('\n🚀 Iniciando servidor directamente...');

try {
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