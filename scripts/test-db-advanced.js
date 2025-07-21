#!/usr/bin/env node

// Script avanzado para probar conexión a base de datos con variables separadas
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from '@neondatabase/serverless';

console.log('🔍 Prueba avanzada de conexión a base de datos');
console.log('==============================================');

// Verificar variables de entorno separadas
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = process.env.DB_PORT || 5432;
const dbSsl = process.env.DB_SSL === 'true';

console.log('📡 Variables de entorno de base de datos:');
console.log('  DB_HOST:', dbHost || 'NO CONFIGURADA');
console.log('  DB_NAME:', dbName || 'NO CONFIGURADA');
console.log('  DB_USER:', dbUser || 'NO CONFIGURADA');
console.log('  DB_PASSWORD:', dbPassword ? '***CONFIGURADA***' : 'NO CONFIGURADA');
console.log('  DB_PORT:', dbPort);
console.log('  DB_SSL:', dbSsl);

// Verificar DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
console.log('  DATABASE_URL:', databaseUrl ? 'CONFIGURADA' : 'NO CONFIGURADA');

if (!dbHost || !dbName || !dbUser || !dbPassword) {
    console.error('❌ Error: Faltan variables de entorno de base de datos');
    process.exit(1);
}

// Método 1: Conexión con variables separadas
console.log('\n🔌 Método 1: Conexión con variables separadas');
try {
    const sql = postgres({
        host: dbHost,
        port: parseInt(dbPort),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        ssl: dbSsl ? { rejectUnauthorized: false } : false,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
    });
    
    console.log('  ✅ Cliente postgres creado con variables separadas');
    
    const result = await sql`SELECT 1 as test, current_database() as db, current_user as user, version() as version`;
    console.log('  ✅ Consulta exitosa:', {
        test: result[0].test,
        database: result[0].db,
        user: result[0].user,
        version: result[0].version.substring(0, 50) + '...'
    });
    
    await sql.end();
    console.log('  ✅ Conexión cerrada');
    
} catch (error) {
    console.log('  ❌ Error en método 1:', error.message);
    console.log('  Código:', error.code);
    console.log('  Detalles:', error.detail);
}

// Método 2: Conexión con DATABASE_URL
if (databaseUrl) {
    console.log('\n🔌 Método 2: Conexión con DATABASE_URL');
    try {
        const sql = postgres(databaseUrl, {
            max: 1,
            idle_timeout: 20,
            connect_timeout: 10
        });
        
        console.log('  ✅ Cliente postgres creado con DATABASE_URL');
        
        const result = await sql`SELECT 1 as test, current_database() as db, current_user as user`;
        console.log('  ✅ Consulta exitosa:', result[0]);
        
        await sql.end();
        console.log('  ✅ Conexión cerrada');
        
    } catch (error) {
        console.log('  ❌ Error en método 2:', error.message);
        console.log('  Código:', error.code);
        console.log('  Detalles:', error.detail);
    }
}

// Método 3: Verificar tablas
console.log('\n🔌 Método 3: Verificar tablas en la base de datos');
try {
    const sql = postgres({
        host: dbHost,
        port: parseInt(dbPort),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        ssl: dbSsl ? { rejectUnauthorized: false } : false,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
    });
    
    const tables = await sql`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    `;
    
    console.log(`  ✅ Encontradas ${tables.length} tablas:`);
    tables.forEach(table => {
        console.log(`    - ${table.table_name} (${table.table_type})`);
    });
    
    // Verificar tablas específicas del sistema
    const systemTables = ['users', 'sessions', 'competencies', 'evaluations'];
    console.log('\n  🎯 Verificando tablas del sistema:');
    for (const tableName of systemTables) {
        const exists = tables.some(t => t.table_name === tableName);
        console.log(`    ${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
    }
    
    await sql.end();
    
} catch (error) {
    console.log('  ❌ Error verificando tablas:', error.message);
}

console.log('\n🎉 Diagnóstico completado'); 