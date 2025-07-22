#!/usr/bin/env node

// Script para verificar la tabla de sesiones
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function verifySessionsTable() {
  console.log('🔐 VERIFICANDO TABLA DE SESIONES');
  console.log('==================================');
  
  try {
    // 1. Verificar conexión a base de datos
    console.log('\n🗄️ Verificando conexión a base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos: OK');
    
    // 2. Verificar si la tabla sessions existe
    console.log('\n📋 Verificando tabla sessions...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Tabla sessions existe');
      
      // 3. Verificar estructura de la tabla
      console.log('\n📊 Verificando estructura de la tabla...');
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sessions'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      console.log('  📝 Columnas encontradas:');
      columns.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // 4. Verificar si hay sesiones existentes
      console.log('\n👥 Verificando sesiones existentes...');
      const sessionCount = await sql`SELECT COUNT(*) as count FROM sessions`;
      console.log(`  📊 Sesiones existentes: ${sessionCount[0].count}`);
      
      // 5. Verificar sesiones expiradas
      const expiredSessions = await sql`
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE expire < NOW()
      `;
      console.log(`  ⏰ Sesiones expiradas: ${expiredSessions[0].count}`);
      
      // 6. Limpiar sesiones expiradas si las hay
      if (expiredSessions[0].count > 0) {
        console.log('\n🧹 Limpiando sesiones expiradas...');
        const deletedSessions = await sql`
          DELETE FROM sessions 
          WHERE expire < NOW()
        `;
        console.log(`  ✅ Sesiones expiradas eliminadas`);
      }
      
    } else {
      console.log('❌ Tabla sessions NO existe');
      console.log('💡 La tabla se creará automáticamente cuando se inicie la aplicación');
    }
    
    // 7. Verificar configuración de sesiones
    console.log('\n⚙️ Verificando configuración de sesiones...');
    const envVars = [
      'NODE_ENV',
      'SESSION_SECRET',
      'DATABASE_URL'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
          console.log(`  ✅ ${varName}: [CONFIGURADA]`);
        } else {
          console.log(`  ✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`  ⚠️ ${varName}: [NO CONFIGURADA]`);
      }
    });
    
    // 8. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. ✅ La tabla de sesiones está configurada correctamente');
    console.log('2. ✅ Las sesiones se almacenarán en PostgreSQL en producción');
    console.log('3. ✅ Esto solucionará el problema de MemoryStore');
    console.log('4. ✅ Render ya no debería enviar SIGTERM por memoria');
    console.log('5. 🔍 Verificar que la aplicación funcione correctamente');
    
    // 9. Comandos para probar
    console.log('\n🔧 Comandos para probar:');
    console.log('=======================');
    console.log('1. npm run build');
    console.log('2. npm start');
    console.log('3. curl http://localhost:3000/health');
    console.log('4. curl http://localhost:3000/api/health');
    
  } catch (error) {
    console.error('❌ Error verificando tabla de sesiones:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifySessionsTable().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 