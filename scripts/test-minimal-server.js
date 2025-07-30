#!/usr/bin/env node

// Script para probar un servidor mínimo
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 PROBANDO SERVIDOR MÍNIMO');
console.log('============================');

// Configurar variables de entorno
process.env.NODE_ENV = 'production';

console.log('📊 Configuración:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : 'NO CONFIGURADA'}`);

try {
  console.log('\n📦 Creando servidor Express...');
  const app = express();
  
  // Middleware básico
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Rutas básicas
  app.get('/', (req, res) => {
    res.json({ 
      message: 'GEI Unified Platform - Servidor funcionando!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });
  
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'configurada' : 'no configurada'
    });
  });
  
  app.get('/test', (req, res) => {
    res.json({ 
      message: 'Endpoint de prueba funcionando!',
      timestamp: new Date().toISOString()
    });
  });
  
  const port = process.env.PORT || 3000;
  
  console.log('🔌 Iniciando servidor...');
  
  const server = app.listen(port, () => {
    console.log(`✅ Servidor iniciado exitosamente en puerto ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
    
    // Cerrar servidor después de 10 segundos
    setTimeout(() => {
      console.log('\n🛑 Cerrando servidor de prueba...');
      server.close(() => {
        console.log('✅ Servidor cerrado exitosamente');
        process.exit(0);
      });
    }, 10000);
  });
  
  server.on('error', (error) => {
    console.error('❌ Error del servidor:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error al crear el servidor:', error.message);
  process.exit(1);
} 