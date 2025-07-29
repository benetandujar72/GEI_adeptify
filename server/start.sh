#!/bin/bash
set -e

echo "🚀 Iniciando servidor en puerto $PORT..."

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado. Ejecutando build..."
    npm run build
fi

# Iniciar servidor con binding correcto
exec node dist/index.js
