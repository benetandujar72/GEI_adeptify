#!/bin/sh

# Script de inicio mejorado para GEI Unified Platform
echo "🚀 Iniciando GEI Unified Platform..."

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

# Intentar conexión a base de datos con timeout
echo "⏳ Probando conexión a base de datos..."
MAX_ATTEMPTS=12  # 1 minuto máximo (12 * 5 segundos)
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if node scripts/test-db-simple.js >/dev/null 2>&1; then
        echo "✅ Base de datos conectada exitosamente"
        break
    else
        ATTEMPT=$((ATTEMPT + 1))
        REMAINING=$((MAX_ATTEMPTS - ATTEMPT))
        echo "⏳ Base de datos no disponible, reintentando en 5 segundos... (intentos restantes: $REMAINING)"
        sleep 5
    fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ ERROR: No se pudo conectar a la base de datos después de $MAX_ATTEMPTS intentos"
    echo "🔍 Ejecutando diagnóstico detallado..."
    node scripts/test-db-simple.js
    echo "⚠️ Continuando sin conexión a base de datos..."
fi

# Ejecutar migraciones solo si la base de datos está disponible
echo "📦 Intentando ejecutar migraciones..."
if npm run db:push >/dev/null 2>&1; then
    echo "✅ Migraciones ejecutadas exitosamente"
else
    echo "⚠️ No se pudieron ejecutar las migraciones"
fi

# Iniciar la aplicación
echo "🚀 Iniciando servidor en puerto $PORT..."
echo "🌐 La aplicación estará disponible en el puerto $PORT"

# Asegurar que el puerto esté configurado
export PORT=${PORT:-3000}

exec node dist/index.js 