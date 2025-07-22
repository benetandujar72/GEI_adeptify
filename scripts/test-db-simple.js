#!/usr/bin/env node

// Script simple para probar conexión a base de datos
import { postgres } from '@neondatabase/serverless';

console.log('🔍 Probando conexión simple a la base de datos...');

// Mostrar variables de entorno
console.log('📡 DATABASE_URL:', process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'no configurado');

if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    process.exit(1);
}

// Intentar conexión simple con postgres
try {
    console.log('🔌 Intentando conexión...');
    
    console.log('✅ Módulo postgres cargado correctamente');
    
    // Crear conexión
    const sql = postgres(process.env.DATABASE_URL);
    console.log('✅ Cliente postgres creado');
    
    // Probar consulta simple
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Consulta de prueba exitosa:', result[0]);
    
    // Probar consulta de tablas
    const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        LIMIT 5
    `;
    console.log('✅ Consulta de tablas exitosa');
    console.log('📋 Tablas encontradas:', tables.length);
    tables.forEach(table => console.log('  -', table.table_name));
    
    // Cerrar conexión
    await sql.end();
    console.log('✅ Conexión cerrada correctamente');
    console.log('🎉 ¡Conexión a base de datos exitosa!');
    
} catch (error) {
    console.error('❌ Error de conexión:');
    console.error('  Mensaje:', error.message);
    console.error('  Código:', error.code);
    console.error('  Stack:', error.stack);
    process.exit(1);
} 