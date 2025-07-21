#!/bin/sh

# Script de inicio simplificado para GEI Unified Platform
echo "🚀 Iniciando GEI Unified Platform..."

# Verificar variables de entorno críticas
echo "🔍 Verificando variables de entorno..."

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL no configurada"
else
    echo "✅ DATABASE_URL configurada"
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️ SESSION_SECRET no configurada"
else
    echo "✅ SESSION_SECRET configurada"
fi

if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "⚠️ GOOGLE_CLIENT_ID no configurada"
else
    echo "✅ GOOGLE_CLIENT_ID configurada"
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "⚠️ GOOGLE_CLIENT_SECRET no configurada"
else
    echo "✅ GOOGLE_CLIENT_SECRET configurada"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️ GEMINI_API_KEY no configurada"
else
    echo "✅ GEMINI_API_KEY configurada"
fi

# Mostrar información del entorno
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "📁 PWD: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Debug de base de datos
echo "🔍 Ejecutando diagnóstico de base de datos..."
node scripts/debug-db.js

# Esperar a que la base de datos esté lista con test simple
echo "⏳ Esperando a que la base de datos esté lista..."

while ! node scripts/test-db-simple.js 2>/dev/null; do
    echo "⏳ Base de datos no disponible, reintentando en 5 segundos..."
    sleep 5
done

echo "✅ Base de datos conectada exitosamente"

# Verificar estructura y datos de la base de datos
echo "🔍 Verificando estructura de la base de datos..."
npm run verify:db

# Ejecutar migraciones
echo "📦 Ejecutando migraciones..."
npm run db:push

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

# Iniciar la aplicación
echo "🚀 Iniciando servidor..."
echo "🌐 La aplicación estará disponible en el puerto $PORT"

exec node dist/index.js 