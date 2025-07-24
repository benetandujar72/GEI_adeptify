#!/usr/bin/env node

// Script para verificar si el servidor está funcionando
import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

// Middleware básico
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Ruta de autenticación de prueba
app.get('/api/auth/me', (req, res) => {
  res.status(401).json({ 
    message: 'No autenticado - endpoint de prueba',
    timestamp: new Date().toISOString()
  });
});

// Ruta de login de prueba
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'superadmin@gei.es' && password === 'password123') {
    res.json({
      success: true,
      user: {
        id: "1",
        email: 'superadmin@gei.es',
        displayName: 'Super Administrador',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        instituteId: null
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales incorrectas'
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor de prueba ejecutándose en http://localhost:${port}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   - GET  /api/test`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - POST /api/auth/login`);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
}); 