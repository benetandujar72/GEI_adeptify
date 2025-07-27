#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🚀 Iniciando aplicación con manejo mejorado de errores...');

// Verificar variables de entorno críticas
console.log('🔍 Verificando variables de entorno...');
const requiredEnvVars = ['DATABASE_URL', 'NODE_ENV', 'PORT'];
let missingVars = [];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
    console.log(`❌ ${envVar} NO configurada`);
  } else {
    console.log(`✅ ${envVar} configurada`);
  }
});

if (missingVars.length > 0) {
  console.log('⚠️ Variables de entorno faltantes:', missingVars.join(', '));
  console.log('💡 Configurando valores por defecto...');
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('✅ NODE_ENV configurado como "production"');
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '3000';
    console.log('✅ PORT configurado como "3000"');
  }
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL es obligatoria para producción');
    process.exit(1);
  }
}

// Verificar archivos críticos
console.log('📋 Verificando archivos críticos...');
const criticalFiles = [
  'dist/index.js',
  'package.json',
  'server/index.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} NO existe`);
  }
});

// Función para iniciar el servidor con reintentos
function startServer(retryCount = 0) {
  const maxRetries = 3;
  
  console.log(`🔄 Iniciando servidor (intento ${retryCount + 1}/${maxRetries + 1})...`);
  
  const server = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '3000'
    }
  });
  
  server.on('error', (error) => {
    console.error('❌ Error al iniciar servidor:', error.message);
    
    if (retryCount < maxRetries) {
      console.log(`⏳ Reintentando en 5 segundos... (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => startServer(retryCount + 1), 5000);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
      process.exit(1);
    }
  });
  
  server.on('exit', (code) => {
    console.log(`🛑 Servidor terminado con código: ${code}`);
    
    if (code === 0) {
      console.log('✅ Servidor terminado correctamente');
    } else if (retryCount < maxRetries) {
      console.log(`⚠️ Servidor terminó con error, reintentando en 10 segundos... (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => startServer(retryCount + 1), 10000);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
      process.exit(code || 1);
    }
  });
  
  // Manejo de señales para cierre graceful
  const gracefulShutdown = (signal) => {
    console.log(`🛑 Recibida señal ${signal}, cerrando servidor...`);
    server.kill(signal);
    
    setTimeout(() => {
      console.log('⏰ Forzando cierre...');
      server.kill('SIGKILL');
    }, 10000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  return server;
}

// Verificar si el build existe antes de iniciar
if (!fs.existsSync('dist/index.js')) {
  console.log('🔨 Build no encontrado, verificando si se puede generar...');
  
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log('🔨 Ejecutando build...');
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        env: process.env
      });
      
      buildProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ Build completado exitosamente');
          startServer();
        } else {
          console.error('❌ Error en el build');
          process.exit(code);
        }
      });
    } else {
      console.error('❌ Script de build no encontrado en package.json');
      process.exit(1);
    }
  } else {
    console.error('❌ package.json no encontrado');
    process.exit(1);
  }
} else {
  startServer();
}

console.log('🎯 Script de inicio mejorado cargado'); 