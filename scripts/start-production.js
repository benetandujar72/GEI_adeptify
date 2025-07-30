#!/usr/bin/env node

// Script de inicio de producción para Windows
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🚀 INICIANDO APLICACIÓN DE PRODUCCIÓN');
console.log('=====================================');

// Configurar variables de entorno
process.env.NODE_ENV = 'production';

console.log('📊 Configuración:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : 'NO CONFIGURADA'}`);

try {
  console.log('\n📦 Creando servidor Express de producción...');
  const app = express();
  
  // Middleware de seguridad y rendimiento
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://gei.adeptify.es',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Servir archivos estáticos del cliente
  const clientDistPath = join(__dirname, '..', 'dist', 'client');
  app.use(express.static(clientDistPath));
  
  // Rutas de API básicas
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'configurada' : 'no configurada',
      version: '1.0.0'
    });
  });
  
  app.get('/api/status', (req, res) => {
    res.json({ 
      message: 'GEI Unified Platform - API funcionando!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });
  
  // Ruta para servir la aplicación React
  app.get('*', (req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
  
  const port = process.env.PORT || 3000;
  
  console.log('🔌 Iniciando servidor de producción...');
  
  const server = app.listen(port, () => {
    console.log(`✅ Servidor de producción iniciado exitosamente`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/api/health`);
    console.log(`📊 Status: http://localhost:${port}/api/status`);
    console.log(`📁 Archivos estáticos: ${clientDistPath}`);
    console.log('\n🚀 La aplicación está lista para usar!');
    console.log('💡 Presiona Ctrl+C para detener el servidor');
  });
  
  server.on('error', (error) => {
    console.error('❌ Error del servidor:', error.message);
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
  
} catch (error) {
  console.error('❌ Error al crear el servidor:', error.message);
  process.exit(1);
} 