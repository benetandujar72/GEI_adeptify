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

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."

while ! node -e "
    const postgres = require('postgres');
    try {
        const sql = postgres(process.env.DATABASE_URL);
        sql.end();
        process.exit(0);
    } catch (error) {
        console.log('Base de datos no disponible aún...');
        process.exit(1);
    }
" 2>/dev/null; do
    echo "⏳ Base de datos no disponible, reintentando en 5 segundos..."
    sleep 5
done

echo "✅ Base de datos conectada exitosamente"

# Ejecutar migraciones
echo "📦 Ejecutando migraciones..."
npm run db:push

# Iniciar la aplicación
echo "🚀 Iniciando servidor..."
echo "🌐 La aplicación estará disponible en el puerto $PORT"

exec node dist/index.js 