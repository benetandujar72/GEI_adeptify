#!/usr/bin/env node

/**
 * Script simple para corregir el acceso a variables de entorno en producción
 * Elimina la dependencia de archivos .env locales
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 === CORRIGIENDO ACCESO A VARIABLES DE ENTORNO EN PRODUCCIÓN ===\n');

// 1. Actualizar el servidor para no depender de dotenv
const serverContent = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupRoutes } from '../routes/index';

// NO usar dotenv - las variables vienen del sistema
// dotenv.config(); // COMENTADO - usar variables del sistema

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware de compresión
app.use(compression());

// Middleware de CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://gei.adeptify.es'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ruta de health check mejorada
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_CONFIGURED',
    google: process.env.GOOGLE_CLIENT_ID ? 'CONFIGURED' : 'NOT_CONFIGURED',
    session: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_CONFIGURED',
    jwt: process.env.JWT_SECRET ? 'CONFIGURED' : 'NOT_CONFIGURED'
  });
});

// Ruta de información del sistema
app.get('/api/system/info', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    database: {
      configured: !!process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'NOT_SET'
    },
    auth: {
      sessionConfigured: !!process.env.SESSION_SECRET,
      jwtConfigured: !!process.env.JWT_SECRET,
      googleConfigured: !!process.env.GOOGLE_CLIENT_ID
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://gei.adeptify.es'
    }
  });
});

// Configurar rutas de la API
app.use('/api', setupRoutes());

// Middleware de manejo de errores mejorado
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error del servidor:', err);
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString()
  });
});

// Ruta para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor con mejor logging
app.listen(PORT, () => {
  console.log(\`🚀 Servidor iniciado en puerto \${PORT}\`);
  console.log(\`📊 Health check: http://localhost:\${PORT}/health\`);
  console.log(\`🔗 API: http://localhost:\${PORT}/api\`);
  console.log(\`🌍 Entorno: \${process.env.NODE_ENV || 'development'}\`);
  console.log(\`🗄️ Base de datos: \${process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'}\`);
  console.log(\`🔐 Autenticación: \${process.env.SESSION_SECRET ? 'CONFIGURADA' : 'NO CONFIGURADA'}\`);
  console.log(\`🔑 Google OAuth: \${process.env.GOOGLE_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO'}\`);
});

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});
`;

// 2. Actualizar script de inicio
const startScriptContent = `#!/bin/bash
set -e  # Salir en caso de error

echo "🚀 === INICIANDO GEI UNIFIED PLATFORM EN PRODUCCIÓN ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 4.0 - Sin dependencia de .env"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: No se encontró package.json"
    exit 1
fi

# Verificar archivo principal
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERROR: Archivo dist/index.js no encontrado"
    echo "🔧 Ejecutando build..."
    npm run build:server
fi

echo "✅ Archivo principal verificado"

# Verificar variables críticas del sistema
echo "🔍 === VERIFICANDO VARIABLES DE ENTORNO ==="
echo "🌍 NODE_ENV: \${NODE_ENV:-'NO CONFIGURADO'}"
echo "🔌 PORT: \${PORT:-'NO CONFIGURADO'}"
echo "🗄️ DATABASE_URL: \${DATABASE_URL:+'CONFIGURADA'}"
echo "🔐 SESSION_SECRET: \${SESSION_SECRET:+'CONFIGURADO'}"
echo "🔑 JWT_SECRET: \${JWT_SECRET:+'CONFIGURADO'}"
echo "🌐 GOOGLE_CLIENT_ID: \${GOOGLE_CLIENT_ID:+'CONFIGURADO'}"

# Verificar variables críticas
if [ -z "\$DATABASE_URL" ] && [ -z "\$DB_HOST" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
    echo "🔧 Configura las variables de base de datos en Render.com"
fi

if [ -z "\$SESSION_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: SESSION_SECRET no configurado"
    echo "🔧 Configura SESSION_SECRET en Render.com"
fi

if [ -z "\$JWT_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: JWT_SECRET no configurado"
    echo "🔧 Configura JWT_SECRET en Render.com"
fi

# Iniciar servidor
echo "🚀 === INICIANDO SERVIDOR ==="
echo "🌐 Puerto: \${PORT:-3000}"
echo "🎯 Comando: node --trace-warnings dist/index.js"

# Ejecutar con timeout y logging detallado
timeout 60s node --trace-warnings dist/index.js || {
    echo "❌ ERROR: El servidor no respondió en 60 segundos"
    echo "📋 Posibles causas:"
    echo "  • Variables de entorno no configuradas"
    echo "  • Problemas de conectividad con la base de datos"
    echo "  • Errores en el código de la aplicación"
    echo "🔧 Revisa los logs anteriores para más detalles"
    exit 1
}
`;

// 3. Crear guía de configuración
const guideContent = `# 🚀 CONFIGURACIÓN DE PRODUCCIÓN - GEI UNIFIED PLATFORM

## ✅ PROBLEMA SOLUCIONADO

La aplicación ya NO depende de archivos .env locales. Todas las variables se obtienen directamente del sistema.

## 📋 VARIABLES CRÍTICAS PARA CONFIGURAR EN RENDER.COM:

### 🔐 AUTENTICACIÓN:
- \`SESSION_SECRET\` - Clave para sesiones
- \`JWT_SECRET\` - Clave para JWT

### 🗄️ BASE DE DATOS:
- \`DATABASE_URL\` - URL completa de la base de datos

### 🔑 GOOGLE OAUTH:
- \`GOOGLE_CLIENT_ID\` - ID del cliente de Google
- \`GOOGLE_CLIENT_SECRET\` - Secreto del cliente de Google

## 🛠️ CONFIGURACIÓN EN RENDER.COM:

1. **Accede al Dashboard de Render**
2. **Selecciona tu servicio**
3. **Ve a Environment > Environment Variables**
4. **Añade cada variable con su valor real**

### 📝 EJEMPLO DE CONFIGURACIÓN:

\`\`\`
DATABASE_URL=postgresql://usuario:contraseña@host:5432/db?sslmode=require
SESSION_SECRET=tu-super-secreto-session-key-aqui
JWT_SECRET=tu-super-secreto-jwt-key-aqui
GOOGLE_CLIENT_ID=tu-google-client-id-aqui
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
\`\`\`

## 🔍 VERIFICACIÓN:

### Health Check:
- **URL**: \`https://tu-app.onrender.com/health\`
- **Respuesta esperada**: JSON con estado del sistema

### Información del Sistema:
- **URL**: \`https://tu-app.onrender.com/api/system/info\`
- **Respuesta esperada**: Configuración actual del sistema

## 🚨 SOLUCIÓN DE PROBLEMAS:

### Error: "Application exited early"
1. **Verifica variables críticas** en Render.com
2. **Revisa logs** en tiempo real
3. **Confirma conectividad** con la base de datos
4. **Verifica health check** endpoint

---

**✅ La aplicación está lista para producción sin dependencia de archivos .env**
`;

try {
  // Actualizar servidor
  const serverPath = path.join(process.cwd(), 'server/src/index.ts');
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('✅ Servidor actualizado - Eliminada dependencia de dotenv');

  // Actualizar script de inicio
  const startScriptPath = path.join(process.cwd(), 'scripts/start-render.sh');
  fs.writeFileSync(startScriptPath, startScriptContent, 'utf8');
  console.log('✅ Script de inicio actualizado');

  // Crear guía
  const guidePath = path.join(process.cwd(), 'PRODUCTION_SETUP_FIXED.md');
  fs.writeFileSync(guidePath, guideContent, 'utf8');
  console.log('✅ Guía de configuración creada');

  console.log('\n🎯 === RESUMEN DE CAMBIOS ===');
  console.log('✅ Eliminada dependencia de archivos .env locales');
  console.log('✅ Variables de entorno se obtienen del sistema');
  console.log('✅ Health check mejorado con información de configuración');
  console.log('✅ Script de inicio con validación de variables');
  console.log('✅ Guía de configuración actualizada');

  console.log('\n📋 PRÓXIMOS PASOS:');
  console.log('1. Configura las variables críticas en Render.com');
  console.log('2. Realiza un nuevo despliegue');
  console.log('3. Verifica el health check: /health');
  console.log('4. Monitorea los logs en tiempo real');

  console.log('\n🚀 LISTO PARA DESPLIEGUE EN PRODUCCIÓN');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} 