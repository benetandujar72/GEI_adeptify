#!/usr/bin/env node

// Script para iniciar la aplicación en Windows
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🚀 INICIANDO APLICACIÓN EN WINDOWS');
console.log('==================================');

// Configurar variables de entorno
process.env.NODE_ENV = 'production';

console.log('📊 Configuración:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : 'NO CONFIGURADA'}`);

// Verificar que el archivo dist/index.js existe
const distPath = join(__dirname, '..', 'dist', 'index.js');
import { existsSync } from 'fs';

if (!existsSync(distPath)) {
  console.log('\n❌ ERROR: El archivo dist/index.js no existe');
  console.log('💡 Ejecuta primero: npm run build');
  process.exit(1);
}

console.log('\n✅ Archivo dist/index.js encontrado');
console.log('🔌 Iniciando servidor...\n');

// Iniciar el servidor
const server = spawn('node', [distPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('❌ Error al iniciar el servidor:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ El servidor se cerró con código ${code}`);
    process.exit(code);
  }
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...');
  server.kill('SIGTERM');
}); 