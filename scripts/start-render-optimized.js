#!/usr/bin/env node

/**
 * Script de inicio optimizado para Render
 * Maneja errores de inicialización y servicios opcionales
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv
config();

console.log('🚀 ===== INICIO RENDER OPTIMIZADO =====');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔌 PORT: ${process.env.PORT}`);
console.log(`📁 PWD: ${process.cwd()}`);

// Verificar archivos críticos
const criticalFiles = [
  'package.json',
  'dist/index.js',
  'shared/schema.ts'
];

console.log('\n🔍 Verificando archivos críticos...');
for (const file of criticalFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Archivo crítico no encontrado: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file} existe`);
}

// Verificar variables de entorno críticas
console.log('\n🔧 Verificando variables de entorno críticas...');
const criticalEnvVars = ['DATABASE_URL', 'NODE_ENV', 'PORT'];

for (const varName of criticalEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Variable crítica no configurada: ${varName}`);
    process.exit(1);
  }
  console.log(`✅ ${varName} configurada`);
}

// Verificar variables opcionales
console.log('\n📋 Verificando variables opcionales...');
const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OPENAI_API_KEY',
  'REDIS_URL',
  'SESSION_SECRET',
  'CORS_ORIGIN'
];

for (const varName of optionalEnvVars) {
  if (process.env[varName]) {
    console.log(`✅ ${varName} configurada`);
  } else {
    console.log(`⚠️ ${varName} no configurada (opcional)`);
  }
}

// Función para ejecutar comando con manejo de errores
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Ejecutando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Comando completado exitosamente: ${command}`);
        resolve();
      } else {
        console.error(`❌ Comando falló con código ${code}: ${command}`);
        reject(new Error(`Comando falló con código ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ Error ejecutando comando: ${error.message}`);
      reject(error);
    });
  });
}

// Función principal de inicialización
async function initializeRender() {
  try {
    console.log('\n🔨 Iniciando proceso de inicialización...');
    
    // 1. Verificar si necesitamos hacer build
    if (!fs.existsSync('dist/index.js')) {
      console.log('📦 Archivo de build no encontrado, ejecutando build...');
      await runCommand('npm', ['run', 'build']);
    } else {
      console.log('✅ Archivo de build encontrado');
    }
    
    // 2. Verificar dependencias
    if (!fs.existsSync('node_modules')) {
      console.log('📦 node_modules no encontrado, instalando dependencias...');
      await runCommand('npm', ['install']);
    } else {
      console.log('✅ node_modules encontrado');
    }
    
    // 3. Iniciar la aplicación
    console.log('\n🚀 Iniciando aplicación...');
    console.log('📊 La aplicación estará disponible en el puerto', process.env.PORT);
    
    // Usar el archivo compilado directamente
    const serverPath = path.join(process.cwd(), 'dist', 'index.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Archivo del servidor no encontrado: ${serverPath}`);
    }
    
    console.log(`🎯 Iniciando servidor desde: ${serverPath}`);
    
    // Iniciar el servidor
    const server = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3000'
      }
    });
    
    // Manejar señales de terminación
    process.on('SIGTERM', () => {
      console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
      server.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
      server.kill('SIGINT');
    });
    
    // Manejar salida del servidor
    server.on('close', (code) => {
      console.log(`🔄 Servidor cerrado con código: ${code}`);
      if (code !== 0) {
        console.error('❌ Servidor terminó con error');
        process.exit(code);
      }
    });
    
    server.on('error', (error) => {
      console.error('❌ Error en el servidor:', error);
      process.exit(1);
    });
    
    console.log('✅ Servidor iniciado correctamente');
    console.log('🎉 Aplicación lista para recibir peticiones');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('📋 Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('📋 Promise:', promise);
  process.exit(1);
});

// Iniciar la aplicación
initializeRender().catch((error) => {
  console.error('❌ Error fatal durante la inicialización:', error);
  process.exit(1);
}); 