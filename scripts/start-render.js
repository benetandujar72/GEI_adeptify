#!/usr/bin/env node

// Script de inicio específico para Render
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 INICIANDO APLICACIÓN EN RENDER');
console.log('==================================');

// Cargar variables de entorno
try {
  dotenv.config({ path: join(__dirname, '..', '.env') });
  console.log('✅ Variables de entorno cargadas');
} catch (error) {
  console.log('⚠️ No se pudo cargar .env, usando variables del sistema');
}

// Configurar variables de entorno
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('📊 Configuración:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : 'NO CONFIGURADA'}`);

try {
  console.log('\n📦 Creando servidor Express...');
  const app = express();
  
  // Middleware de seguridad y rendimiento
  app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar CSP para desarrollo
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Verificar si existen archivos estáticos del cliente
  const clientDistPath = join(__dirname, '..', 'dist', 'client');
  const indexHtmlPath = join(clientDistPath, 'index.html');
  
  if (existsSync(clientDistPath)) {
    console.log('✅ Directorio client/dist encontrado');
    app.use(express.static(clientDistPath));
    
    if (existsSync(indexHtmlPath)) {
      console.log('✅ index.html encontrado');
    } else {
      console.log('⚠️ index.html no encontrado en client/dist');
    }
  } else {
    console.log('⚠️ Directorio client/dist no encontrado');
  }
  
  // Rutas de API básicas
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'configurada' : 'no configurada',
      version: '1.0.0',
      platform: 'render'
    });
  });
  
  app.get('/api/status', (req, res) => {
    res.json({ 
      message: 'GEI Unified Platform - API funcionando en Render!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: 'render'
    });
  });
  
  app.get('/api/info', (req, res) => {
    res.json({
      name: 'GEI Unified Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      platform: 'render',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });
  
  // Ruta para servir la aplicación React
  app.get('*', (req, res) => {
    if (existsSync(indexHtmlPath)) {
      res.sendFile(indexHtmlPath);
    } else {
      res.json({
        message: 'GEI Unified Platform - Servidor funcionando',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        note: 'Frontend no encontrado, solo API disponible'
      });
    }
  });
  
  const port = process.env.PORT || 3000;
  
  console.log('🔌 Iniciando servidor en Render...');
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor iniciado exitosamente en puerto ${port}`);
    console.log(`🌐 URL: http://0.0.0.0:${port}`);
    console.log(`🏥 Health check: http://0.0.0.0:${port}/api/health`);
    console.log(`📊 Status: http://0.0.0.0:${port}/api/status`);
    console.log(`ℹ️ Info: http://0.0.0.0:${port}/api/info`);
    console.log('\n🚀 La aplicación está lista en Render!');
  });
  
  server.on('error', (error) => {
    console.error('❌ Error del servidor:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error('💡 El puerto ya está en uso');
    }
    process.exit(1);
  });
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.close(() => {
      console.log('✅ Servidor detenido exitosamente');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.close(() => {
      console.log('✅ Servidor detenido exitosamente');
      process.exit(0);
    });
  });
  
  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error al crear el servidor:', error.message);
  console.error(error.stack);
  process.exit(1);
} 