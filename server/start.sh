#!/bin/bash
set -e

echo "🚀 Iniciando servidor en puerto $PORT..."

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado. Ejecutando build..."
    npm run build
fi

# Verificar que el build fue exitoso
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: El build falló. dist/index.js no existe."
    exit 1
fi

echo "✅ Build completado. Iniciando servidor..."

# Iniciar servidor con binding correcto
exec node dist/index.js
