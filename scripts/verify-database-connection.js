#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../server/utils/logger.js';

console.log('🔍 Verificando conexión a la base de datos...');

async function verifyDatabaseConnection() {
  try {
    console.log('📋 Verificando variables de entorno...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('❌ DATABASE_URL no configurada');
      return false;
    }
    
    console.log('✅ DATABASE_URL configurada');
    console.log('🔗 Intentando conectar a la base de datos...');
    
    // Configuración de conexión con SSL para Render
    const sql = postgres(databaseUrl, { 
      max: 1, // Solo una conexión para la verificación
      idle_timeout: 20,
      connect_timeout: 30, // Timeout más largo para la verificación
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      connection: {
        application_name: 'gei-db-verification'
      }
    });
    
    // Verificar conexión básica
    console.log('🔄 Probando conexión básica...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Conexión básica exitosa:', result[0]);
    
    // Verificar que las tablas principales existen
    console.log('📊 Verificando tablas principales...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'institutes', 'academic_years')
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      console.log('✅ Tablas encontradas:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('⚠️ No se encontraron tablas principales');
    }
    
    // Verificar permisos
    console.log('🔐 Verificando permisos...');
    const permissions = await sql`
      SELECT 
        table_name,
        privilege_type
      FROM information_schema.table_privileges 
      WHERE table_schema = 'public' 
      AND grantee = current_user
      AND table_name IN ('users', 'institutes', 'academic_years')
      ORDER BY table_name, privilege_type
    `;
    
    if (permissions.length > 0) {
      console.log('✅ Permisos verificados:');
      permissions.forEach(perm => {
        console.log(`  - ${perm.table_name}: ${perm.privilege_type}`);
      });
    } else {
      console.log('⚠️ No se encontraron permisos específicos');
    }
    
    // Verificar versión de PostgreSQL
    console.log('📋 Verificando versión de PostgreSQL...');
    const version = await sql`SELECT version()`;
    console.log('✅ Versión:', version[0].version);
    
    // Cerrar conexión
    await sql.end();
    console.log('✅ Conexión cerrada correctamente');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error al verificar conexión a la base de datos:');
    console.error('📋 Detalles del error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 El servidor de base de datos no está accesible');
      console.log('💡 Verifica que la base de datos esté ejecutándose');
    } else if (error.message.includes('authentication failed')) {
      console.log('💡 Error de autenticación');
      console.log('💡 Verifica las credenciales en DATABASE_URL');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 La base de datos no existe');
      console.log('💡 Verifica el nombre de la base de datos en DATABASE_URL');
    } else if (error.message.includes('SSL')) {
      console.log('💡 Error de configuración SSL');
      console.log('💡 Verifica la configuración SSL para producción');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Timeout de conexión');
      console.log('💡 Verifica la conectividad de red');
    }
    
    return false;
  }
}

// Ejecutar verificación
verifyDatabaseConnection().then((success) => {
  if (success) {
    console.log('\n🎉 Verificación de base de datos completada exitosamente');
    process.exit(0);
  } else {
    console.log('\n❌ Verificación de base de datos falló');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
}); 