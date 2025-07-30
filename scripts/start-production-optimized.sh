#!/bin/sh

# Script de inicio optimizado para producción en Render.com
echo "🚀 === INICIANDO GEI UNIFIED PLATFORM EN PRODUCCIÓN ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 3.0 - Optimizado para Docker"

# Verificar variables de entorno críticas
echo "🔍 === VERIFICANDO VARIABLES DE ENTORNO ==="
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "🗄️ DATABASE_URL: ${DATABASE_URL:0:50}..." # Mostrar solo los primeros 50 caracteres por seguridad

# Configurar variables de entorno por defecto si no están definidas
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    echo "🔧 NODE_ENV configurada por defecto: $NODE_ENV"
fi

if [ -z "$PORT" ]; then
    export PORT=3000
    echo "🔧 PORT configurada por defecto: $PORT"
fi

# Verificar variables críticas
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
    echo "🔧 Configura las variables de base de datos en el entorno"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: SESSION_SECRET no configurado"
    echo "🔧 Configura SESSION_SECRET en el entorno"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: JWT_SECRET no configurado"
    echo "🔧 Configura JWT_SECRET en el entorno"
fi

# Mostrar información del entorno
echo "🔧 === INFORMACIÓN DEL ENTORNO ==="
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "📁 PWD: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo "🐧 Sistema operativo: $(uname -a)"

# Verificar estructura del proyecto
echo "📁 === VERIFICANDO ESTRUCTURA DEL PROYECTO ==="
echo "📂 Directorio actual: $(pwd)"
echo "📂 Contenido del directorio actual:"
ls -la

# Verificar que el build existe
echo "🔍 === VERIFICANDO ARCHIVOS DE BUILD ==="
echo "📁 Buscando archivo principal del servidor..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado"
    echo "🔍 Verificando directorio dist:"
    ls -la dist/ 2>/dev/null || echo "Directorio dist no existe"
    echo "🔍 Verificando directorio actual:"
    ls -la
    echo "🔧 Intentando rebuild..."
    npm run build:server
    if [ ! -f "dist/index.js" ]; then
        echo "❌ Error: Build falló. Verificando errores..."
        ls -la dist/ 2>/dev/null || echo "Directorio dist no existe"
        echo "❌ CRÍTICO: No se puede continuar sin el archivo de build"
        exit 1
    fi
fi

echo "✅ Build verificado: dist/index.js existe"
echo "📄 Tamaño del archivo: $(ls -lh dist/index.js | awk '{print $5}')"

# Verificar archivos críticos
echo "🔍 === VERIFICANDO ARCHIVOS CRÍTICOS ==="
echo "📁 Verificando directorio dist:"
ls -la dist/ 2>/dev/null || echo "⚠️  Directorio dist no encontrado"

echo "📁 Verificando directorio shared:"
ls -la shared/ 2>/dev/null || echo "⚠️  Directorio shared no encontrado"

echo "📁 Verificando directorio scripts:"
ls -la scripts/ 2>/dev/null || echo "⚠️  Directorio scripts no encontrado"

echo "📁 Verificando directorio client/dist:"
ls -la client/dist/ 2>/dev/null || echo "⚠️  Directorio client/dist no encontrado"

# Verificar dependencias
echo "📦 === VERIFICANDO DEPENDENCIAS ==="
echo "📄 Verificando package.json:"
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    echo "📦 Nombre del proyecto: $(node -p "require('./package.json').name")"
    echo "📦 Versión: $(node -p "require('./package.json').version")"
else
    echo "❌ package.json no encontrado"
fi

echo "📦 Verificando node_modules:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules encontrado"
    echo "📦 Número de dependencias: $(ls node_modules | wc -l)"
else
    echo "❌ node_modules no encontrado"
fi

# Asegurar que el puerto esté configurado
export PORT=${PORT:-3000}
echo "🔌 Puerto configurado: $PORT"

# Verificar conectividad de red
echo "🌐 === VERIFICANDO CONECTIVIDAD ==="
echo "🔍 Verificando conectividad local..."
if command -v curl >/dev/null 2>&1; then
    echo "✅ curl disponible"
else
    echo "⚠️  curl no disponible"
fi

# Función para manejar señales de terminación
cleanup() {
    echo "🛑 === RECIBIDA SEÑAL DE TERMINACIÓN ==="
    echo "📊 Estado final del proceso: $?"
    echo "📅 Timestamp de terminación: $(date)"
    echo "🔄 Cerrando aplicación..."
    exit 0
}

# Configurar manejadores de señales
trap cleanup SIGTERM SIGINT

# Verificar permisos de archivos
echo "🔐 === VERIFICANDO PERMISOS ==="
echo "👤 Usuario actual: $(whoami)"
echo "👥 Grupo actual: $(id -gn)"
echo "📄 Permisos del archivo principal:"
ls -la dist/index.js 2>/dev/null || echo "❌ No se puede verificar permisos del archivo principal"

# Iniciar la aplicación con logs detallados
echo "🚀 === INICIANDO SERVIDOR ==="
echo "🌐 La aplicación estará disponible en el puerto $PORT"
echo "🎯 Iniciando servidor Node.js con logs detallados..."
echo "📄 Comando de ejecución: node --trace-warnings dist/index.js"
echo "📅 Timestamp de inicio: $(date)"

# Ejecutar con más información de debug
echo "🔧 === EJECUTANDO APLICACIÓN ==="
exec node --trace-warnings dist/index.js 