#!/usr/bin/env node

// Script para verificar la conexión a la base de datos de producción
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

console.log('🔍 Verificando conexión a la base de datos...');
console.log('==============================================');

// Configuración de base de datos
const databaseUrl = process.env.DATABASE_URL;
console.log('📡 DATABASE_URL:', databaseUrl ? 'Configurada' : 'NO CONFIGURADA');

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    process.exit(1);
}

try {
    // Conectar a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    const sql = postgres(databaseUrl);
    const db = drizzle(sql);

    // Verificar conexión
    console.log('✅ Conexión establecida correctamente');

    // Listar todas las tablas
    console.log('\n📋 Verificando tablas existentes...');
    const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    `;

    console.log(`📊 Total de tablas encontradas: ${tables.length}`);
    
    if (tables.length > 0) {
        console.log('📋 Tablas en la base de datos:');
        tables.forEach((table, index) => {
            console.log(`  ${index + 1}. ${table.table_name}`);
        });
    } else {
        console.log('⚠️ No se encontraron tablas en la base de datos');
    }

    // Verificar tablas específicas del sistema
    const requiredTables = ['users', 'sessions', 'competencies', 'evaluations'];
    console.log('\n🎯 Verificando tablas requeridas del sistema:');
    
    for (const tableName of requiredTables) {
        const exists = tables.some(t => t.table_name === tableName);
        console.log(`  ${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
    }

    // Verificar datos en tabla users
    console.log('\n👥 Verificando datos en tabla users:');
    try {
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        console.log(`  📊 Total de usuarios: ${userCount[0].count}`);
        
        if (userCount[0].count > 0) {
            const sampleUsers = await sql`SELECT id, email, role, created_at FROM users LIMIT 3`;
            console.log('  👤 Usuarios de ejemplo:');
            sampleUsers.forEach(user => {
                console.log(`    - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Creado: ${user.created_at}`);
            });
        }
    } catch (error) {
        console.log(`  ❌ Error al consultar users: ${error.message}`);
    }

    // Verificar datos en tabla sessions
    console.log('\n🔐 Verificando datos en tabla sessions:');
    try {
        const sessionCount = await sql`SELECT COUNT(*) as count FROM sessions`;
        console.log(`  📊 Total de sesiones: ${sessionCount[0].count}`);
    } catch (error) {
        console.log(`  ❌ Error al consultar sessions: ${error.message}`);
    }

    // Cerrar conexión
    await sql.end();
    console.log('\n✅ Verificación completada exitosamente');

} catch (error) {
    console.error('❌ Error durante la verificación:');
    console.error('  Mensaje:', error.message);
    console.error('  Código:', error.code);
    console.error('  Detalles:', error.detail);
    process.exit(1);
} 