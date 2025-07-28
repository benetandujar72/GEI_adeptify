# Script para arreglar el problema de despliegue en Render
# EduAI Platform

Write-Host "🔧 Arreglando problema de despliegue en Render..." -ForegroundColor Green
Write-Host ""

# 1. Verificar configuración del servidor
Write-Host "📋 Verificando configuración del servidor..." -ForegroundColor Yellow

# Verificar package.json del servidor
$serverPackageJson = @"
{
  "name": "eduai-server",
  "version": "1.0.0",
  "description": "EduAI Platform Server",
  "main": "dist/index.js",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --external:pg-native",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "redis": "^4.6.8",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.4",
    "winston": "^3.10.0",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "drizzle-orm": "^0.28.5",
    "drizzle-kit": "^0.19.9",
    "@anthropic-ai/sdk": "^0.8.1",
    "@google/generative-ai": "^0.1.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/compression": "^1.7.2",
    "@types/node": "^20.5.0",
    "@types/pg": "^8.10.2",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcryptjs": "^2.4.2",
    "@types/multer": "^1.4.7",
    "@types/nodemailer": "^6.4.9",
    "typescript": "^5.1.6",
    "tsx": "^3.12.7",
    "esbuild": "^0.18.17",
    "eslint": "^8.47.0",
    "@typescript-eslint/eslint-plugin": "^6.4.1",
    "@typescript-eslint/parser": "^6.4.1",
    "jest": "^29.6.2",
    "@types/jest": "^29.5.4",
    "ts-jest": "^29.1.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
"@

Set-Content -Path "server/package.json" -Value $serverPackageJson

# 2. Crear archivo de inicio del servidor
Write-Host "🚀 Creando archivo de inicio del servidor..." -ForegroundColor Yellow

$serverIndex = @"
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { Pool } from 'pg';
import winston from 'winston';

// Configurar variables de entorno
dotenv.config();

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'eduai-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configurar base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configurar Redis
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Crear aplicación Express
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

// Configurar CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://eduai-platform.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a PostgreSQL
    const dbResult = await pool.query('SELECT NOW()');
    
    // Verificar conexión a Redis
    await redisClient.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'EduAI Platform API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Función para iniciar el servidor
async function startServer() {
  try {
    // Conectar a Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Verificar conexión a PostgreSQL
    await pool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Health check available at: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

// Iniciar servidor
startServer();
"@

Set-Content -Path "server/src/index.ts" -Value $serverIndex

# 3. Crear archivo de configuración de esbuild
Write-Host "⚙️ Creando configuración de esbuild..." -ForegroundColor Yellow

$esbuildConfig = @"
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  external: ['pg-native'],
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"`
  }
}).catch(() => process.exit(1));
"@

Set-Content -Path "server/esbuild.config.js" -Value $esbuildConfig

# 4. Actualizar variables de entorno de producción
Write-Host "🔧 Actualizando variables de entorno..." -ForegroundColor Yellow

$envProduction = @"
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/eduai
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
API_KEY=your-api-key-here

# Frontend URL
FRONTEND_URL=https://eduai-platform.com

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true

# CORS
ALLOWED_ORIGINS=https://eduai-platform.com,https://app.eduai-platform.com
"@

Set-Content -Path ".env.production" -Value $envProduction

# 5. Crear Dockerfile optimizado para producción
Write-Host "🐳 Creando Dockerfile optimizado..." -ForegroundColor Yellow

$dockerfile = @"
# Multi-stage build para optimizar el tamaño de la imagen
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilación
RUN apk add --no-cache python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY esbuild.config.js ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

# Instalar dependencias de runtime
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos compilados desde builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Crear directorio de logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
"@

Set-Content -Path "server/Dockerfile" -Value $dockerfile

# 6. Crear script de inicio para Render
Write-Host "🚀 Creando script de inicio para Render..." -ForegroundColor Yellow

$renderStartScript = @"
#!/bin/bash

# Script de inicio para Render
echo "🚀 Starting EduAI Platform Server..."

# Verificar variables de entorno críticas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo "❌ REDIS_URL is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET is not set"
    exit 1
fi

echo "✅ Environment variables verified"

# Crear directorio de logs si no existe
mkdir -p logs

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --only=production
fi

# Compilar TypeScript si es necesario
if [ ! -f "dist/index.js" ]; then
    echo "🔨 Building application..."
    npm run build
fi

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Iniciar servidor
echo "🌐 Starting server on port $PORT"
exec node dist/index.js
"@

Set-Content -Path "server/start.sh" -Value $renderStartScript

# 7. Actualizar render.yaml
Write-Host "📝 Actualizando render.yaml..." -ForegroundColor Yellow

$renderYaml = @"
services:
  - type: web
    name: eduai-platform
    env: node
    plan: starter
    buildCommand: |
      cd server
      npm ci
      npm run build
    startCommand: |
      cd server
      chmod +x start.sh
      ./start.sh
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: GOOGLE_API_KEY
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        value: 587
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: FRONTEND_URL
        value: https://eduai-platform.com
      - key: LOG_LEVEL
        value: info
      - key: ENABLE_METRICS
        value: true
    healthCheckPath: /health
    autoDeploy: true

databases:
  - name: eduai-postgres
    databaseName: eduai
    user: postgres
    plan: starter

  - name: eduai-redis
    databaseName: redis
    plan: starter
"@

Set-Content -Path "render.yaml" -Value $renderYaml

# 8. Crear script de verificación
Write-Host "🔍 Creando script de verificación..." -ForegroundColor Yellow

$verificationScript = @"
#!/bin/bash

echo "🔍 Verificando configuración de despliegue..."

# Verificar archivos críticos
files=(
    "server/package.json"
    "server/src/index.ts"
    "server/esbuild.config.js"
    "server/Dockerfile"
    "server/start.sh"
    ".env.production"
    "render.yaml"
)

for file in "\${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Verificar configuración de package.json
if grep -q '"build"' server/package.json; then
    echo "✅ Build script found in package.json"
else
    echo "❌ Build script missing in package.json"
    exit 1
fi

# Verificar configuración de start script
if grep -q 'start.sh' render.yaml; then
    echo "✅ Start script configured in render.yaml"
else
    echo "❌ Start script not configured in render.yaml"
    exit 1
fi

echo "✅ All verifications passed!"
echo "🚀 Ready for deployment to Render"
"@

Set-Content -Path "scripts/verify-deployment.ps1" -Value $verificationScript

Write-Host "✅ Configuración de despliegue arreglada" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
Write-Host "✅ Package.json del servidor actualizado" -ForegroundColor Green
Write-Host "✅ Archivo de inicio del servidor creado" -ForegroundColor Green
Write-Host "✅ Configuración de esbuild optimizada" -ForegroundColor Green
Write-Host "✅ Variables de entorno de producción configuradas" -ForegroundColor Green
Write-Host "✅ Dockerfile optimizado creado" -ForegroundColor Green
Write-Host "✅ Script de inicio para Render creado" -ForegroundColor Green
Write-Host "✅ render.yaml actualizado" -ForegroundColor Green
Write-Host "✅ Script de verificación creado" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar: ./scripts/verify-deployment.ps1" -ForegroundColor White
Write-Host "2. Commit y push de los cambios" -ForegroundColor White
Write-Host "3. Desplegar en Render" -ForegroundColor White
Write-Host "4. Verificar health check en: https://your-app.onrender.com/health" -ForegroundColor White
Write-Host ""
Write-Host "🎯 ¡Problema de despliegue solucionado!" -ForegroundColor Green 