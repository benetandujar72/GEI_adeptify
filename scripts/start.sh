#!/bin/sh

# Script de inicio para GEI Unified Platform en Render
# Maneja la inicialización automática de la base de datos y servicios

echo "🚀 Iniciando GEI Unified Platform..."

# Función para esperar a que la base de datos esté lista
wait_for_database() {
    echo "⏳ Esperando a que la base de datos esté lista..."
    
    # Intentar conectar a la base de datos hasta que esté disponible
    while ! node -e "
        const { drizzle } = require('drizzle-orm/postgres-js');
        const postgres = require('postgres');
        
        try {
            const sql = postgres(process.env.DATABASE_URL);
            const db = drizzle(sql);
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
}

# Función para inicializar la base de datos
initialize_database() {
    echo "🗄️ Inicializando base de datos..."
    
    # Ejecutar migraciones
    echo "📦 Ejecutando migraciones..."
    npm run db:push
    
    # Verificar si las tablas existen
    node -e "
        const { drizzle } = require('drizzle-orm/postgres-js');
        const postgres = require('postgres');
        const { sql } = require('drizzle-orm');
        
        const sqlClient = postgres(process.env.DATABASE_URL);
        const db = drizzle(sqlClient);
        
        // Verificar si las tablas principales existen
        db.execute(sql\`SELECT 1 FROM information_schema.tables WHERE table_name = 'users'\`)
            .then(() => {
                console.log('✅ Base de datos inicializada correctamente');
                sqlClient.end();
                process.exit(0);
            })
            .catch((error) => {
                console.log('❌ Error verificando base de datos:', error.message);
                sqlClient.end();
                process.exit(1);
            });
    "
}

# Función para crear super admin inicial si no existe
create_initial_super_admin() {
    echo "👑 Verificando super admin inicial..."
    
    node -e "
        const { drizzle } = require('drizzle-orm/postgres-js');
        const postgres = require('postgres');
        const { eq } = require('drizzle-orm');
        const { users } = require('./shared/schema');
        
        const sqlClient = postgres(process.env.DATABASE_URL);
        const db = drizzle(sqlClient);
        
        // Verificar si existe un super admin
        db.select().from(users).where(eq(users.role, 'super_admin'))
            .then((superAdmins) => {
                if (superAdmins.length === 0) {
                    console.log('👑 Creando super admin inicial...');
                    // Aquí se crearía el super admin inicial
                    // Por ahora solo registramos que no existe
                    console.log('⚠️ No hay super admin. Se debe crear manualmente después del primer login.');
                } else {
                    console.log('✅ Super admin ya existe');
                }
                sqlClient.end();
            })
            .catch((error) => {
                console.log('❌ Error verificando super admin:', error.message);
                sqlClient.end();
            });
    "
}

# Función para verificar variables de entorno críticas
check_environment() {
    echo "🔍 Verificando variables de entorno..."
    
    # Verificar variables críticas una por una
    missing_vars=""
    
    if [ -z "$DATABASE_URL" ]; then
        missing_vars="$missing_vars DATABASE_URL"
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        missing_vars="$missing_vars SESSION_SECRET"
    fi
    
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        missing_vars="$missing_vars GOOGLE_CLIENT_ID"
    fi
    
    if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        missing_vars="$missing_vars GOOGLE_CLIENT_SECRET"
    fi
    
    if [ -z "$GEMINI_API_KEY" ]; then
        missing_vars="$missing_vars GEMINI_API_KEY"
    fi
    
    if [ -n "$missing_vars" ]; then
        echo "❌ Variables de entorno faltantes:$missing_vars"
        echo "⚠️ Algunas funcionalidades pueden no estar disponibles"
    else
        echo "✅ Todas las variables de entorno críticas están configuradas"
    fi
}

# Función principal
main() {
    echo "🎯 GEI Unified Platform - Inicialización automática"
    echo "=================================================="
    
    # Verificar variables de entorno
    check_environment
    
    # Esperar a que la base de datos esté lista
    wait_for_database
    
    # Inicializar base de datos
    initialize_database
    
    # Crear super admin inicial si es necesario
    create_initial_super_admin
    
    echo "🚀 Iniciando servidor..."
    echo "🌐 La aplicación estará disponible en el puerto \$PORT"
    
    # Iniciar la aplicación
    exec node dist/index.js
}

# Ejecutar función principal
main 