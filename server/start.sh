#!/bin/bash
set -e

echo "🚀 === INICIANDO SERVIDOR GEI UNIFIED PLATFORM ==="
echo "📅 Timestamp: $(date)"
echo "🌍 NODE_ENV: ${NODE_ENV:-development}"
echo "🔌 PORT: ${PORT:-3000}"

# Verificar variables de entorno críticas
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: SESSION_SECRET no configurado"
fi

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "🔧 dist/index.js no encontrado. Ejecutando build..."
    npm run build:server
fi

# Verificar que el build fue exitoso
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: El build falló. dist/index.js no existe."
    echo "🔍 Verificando directorio dist:"
    ls -la dist/ 2>/dev/null || echo "Directorio dist no existe"
    exit 1
fi

echo "✅ Build verificado. Tamaño: $(ls -lh dist/index.js | awk '{print $5}')"
echo "🚀 Iniciando servidor en puerto ${PORT:-3000}..."

# Iniciar servidor con binding correcto
exec node --trace-warnings dist/index.js
