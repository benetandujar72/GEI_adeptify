#!/bin/sh

# Script de inicio optimizado para producción en Render.com
echo "🚀 Iniciando GEI Unified Platform en producción..."

# Verificar variables de entorno críticas
echo "🔍 Verificando variables de entorno..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no configurada - CRÍTICO"
    echo "🔧 Configurando DATABASE_URL con variables separadas..."
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"
    echo "✅ DATABASE_URL configurada: postgresql://${DB_USER}:***@${DB_HOST}:5432/${DB_NAME}?sslmode=require"
else
    echo "✅ DATABASE_URL configurada"
fi

# Mostrar información del entorno
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "📁 PWD: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Verificar que el build existe
echo "🔍 Verificando archivos de build..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado"
    echo "🔧 Intentando rebuild..."
    npm run build
    if [ ! -f "dist/index.js" ]; then
        echo "❌ Error: Build falló. Verificando errores..."
        ls -la dist/ 2>/dev/null || echo "Directorio dist no existe"
        exit 1
    fi
fi

echo "✅ Build verificado: dist/index.js existe"

# Asegurar que el puerto esté configurado
export PORT=${PORT:-3000}

# Iniciar la aplicación con manejo de señales
echo "🚀 Iniciando servidor en puerto $PORT..."
echo "🌐 La aplicación estará disponible en el puerto $PORT"

# Función para manejar señales de terminación
cleanup() {
    echo "🛑 Recibida señal de terminación, cerrando aplicación..."
    exit 0
}

# Configurar manejadores de señales
trap cleanup SIGTERM SIGINT

# Iniciar la aplicación y mantener el proceso vivo
echo "🎯 Iniciando servidor Node.js..."
exec node dist/index.js 