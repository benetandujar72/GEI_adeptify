#!/bin/bash
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
echo "🌍 NODE_ENV: ${NODE_ENV:-'NO CONFIGURADO'}"
echo "🔌 PORT: ${PORT:-'NO CONFIGURADO'}"
echo "🗄️ DATABASE_URL: ${DATABASE_URL:+'CONFIGURADA'}"
echo "🔐 SESSION_SECRET: ${SESSION_SECRET:+'CONFIGURADO'}"
echo "🔑 JWT_SECRET: ${JWT_SECRET:+'CONFIGURADO'}"
echo "🌐 GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:+'CONFIGURADO'}"

# Verificar variables críticas
if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
    echo "🔧 Configura las variables de base de datos en Render.com"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: SESSION_SECRET no configurado"
    echo "🔧 Configura SESSION_SECRET en Render.com"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  ADVERTENCIA: JWT_SECRET no configurado"
    echo "🔧 Configura JWT_SECRET en Render.com"
fi

# Iniciar servidor
echo "🚀 === INICIANDO SERVIDOR ==="
echo "🌐 Puerto: ${PORT:-3000}"
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
