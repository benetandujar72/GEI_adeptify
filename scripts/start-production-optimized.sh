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

# Verificar archivos críticos
echo "🔍 Verificando archivos críticos..."
ls -la dist/ 2>/dev/null || echo "⚠️  Directorio dist no encontrado"
ls -la shared/ 2>/dev/null || echo "⚠️  Directorio shared no encontrado"
ls -la scripts/ 2>/dev/null || echo "⚠️  Directorio scripts no encontrado"

# Asegurar que el puerto esté configurado
export PORT=${PORT:-3000}

# Función para manejar señales de terminación
cleanup() {
    echo "🛑 Recibida señal de terminación, cerrando aplicación..."
    echo "📊 Estado final del proceso: $?"
    exit 0
}

# Configurar manejadores de señales
trap cleanup SIGTERM SIGINT

# Iniciar la aplicación con logs detallados
echo "🚀 Iniciando servidor en puerto $PORT..."
echo "🌐 La aplicación estará disponible en el puerto $PORT"
echo "🎯 Iniciando servidor Node.js con logs detallados..."

# Ejecutar con más información de debug
exec node --trace-warnings dist/index.js 2>&1 | tee -a /tmp/app.log 