#!/bin/bash

# Script de inicio para Render
echo "🚀 Starting EduAI Platform Server..."

# Verificar variables de entorno críticas
if [ -z "" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "" ]; then
    echo "❌ REDIS_URL is not set"
    exit 1
fi

if [ -z "" ]; then
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
echo "🌐 Starting server on port "
exec node dist/index.js
