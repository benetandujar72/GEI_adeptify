#!/usr/bin/env node

// Script para probar el puerto 3000
import express from 'express';
import { createServer } from 'http';

console.log('🔌 Probando puerto 3000...');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Endpoint simple de prueba
app.get('/test', (req, res) => {
    res.json({
        message: 'Puerto funcionando correctamente',
        port: port,
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', port: port });
});

// Iniciar servidor
server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor iniciado en puerto ${port}`);
    console.log(`🌐 URL de prueba: http://localhost:${port}/test`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    
    // Mantener el servidor corriendo por 30 segundos para pruebas
    setTimeout(() => {
        console.log('⏰ Cerrando servidor de prueba...');
        server.close(() => {
            console.log('✅ Servidor de prueba cerrado');
            process.exit(0);
        });
    }, 30000);
});

// Manejo de errores
server.on('error', (error) => {
    console.error('❌ Error al iniciar servidor:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.error('⚠️ El puerto ya está en uso');
    }
    process.exit(1);
}); 