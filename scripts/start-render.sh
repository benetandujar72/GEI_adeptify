#!/bin/sh

# Script de inicio específico para Render.com
echo "🚀 === INICIANDO GEI UNIFIED PLATFORM EN RENDER ==="
echo "📅 Timestamp: $(date)"

# Configurar variables de entorno por defecto
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

echo "🔧 === CONFIGURACIÓN ==="
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "📁 PWD: $(pwd)"

# Verificar que el build existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado"
    echo "🔍 Contenido del directorio:"
    ls -la
    echo "🔍 Contenido de dist/ (si existe):"
    ls -la dist/ 2>/dev/null || echo "Directorio dist no existe"
    exit 1
fi

echo "✅ Build encontrado: dist/index.js"

# Verificar variables críticas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no configurada"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ Error: SESSION_SECRET no configurada"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET no configurada"
    exit 1
fi

echo "✅ Variables críticas configuradas"

# Iniciar la aplicación
echo "🚀 Iniciando servidor en puerto $PORT..."
exec node dist/index.js 