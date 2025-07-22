#!/usr/bin/env node

/**
 * Script para monitorear conexiones de base de datos
 * Útil para diagnosticar problemas de conexión en Render.com
 */

import postgres from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

console.log('🔍 Monitoreando conexiones de base de datos...\n');

async function monitorConnections() {
  const sql = postgres(databaseUrl, {
    max: 1, // Solo una conexión para el monitoreo
    connection: {
      application_name: 'db-monitor'
    }
  });

  try {
    // Verificar conexión básica
    console.log('📊 Probando conexión básica...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result[0]);

    // Obtener información de la base de datos
    console.log('\n📋 Información de la base de datos:');
    const dbInfo = await sql`
      SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as version,
        current_timestamp as current_time
    `;
    console.log('   Base de datos:', dbInfo[0].database_name);
    console.log('   Usuario:', dbInfo[0].current_user);
    console.log('   Versión:', dbInfo[0].version.split(' ')[0] + ' ' + dbInfo[0].version.split(' ')[1]);
    console.log('   Hora actual:', dbInfo[0].current_time);

    // Verificar conexiones activas (si tienes permisos)
    console.log('\n🔗 Conexiones activas:');
    try {
      const connections = await sql`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          client_port,
          backend_start,
          state,
          query_start,
          wait_event_type,
          wait_event
        FROM pg_stat_activity 
        WHERE datname = current_database()
        ORDER BY backend_start DESC
      `;

      console.log(`   Total de conexiones: ${connections.length}`);
      
      if (connections.length > 0) {
        console.log('\n   Detalles de conexiones:');
        connections.forEach((conn, index) => {
          console.log(`   ${index + 1}. PID: ${conn.pid}, Usuario: ${conn.usename}, App: ${conn.application_name || 'N/A'}`);
          console.log(`      Cliente: ${conn.client_addr}:${conn.client_port}, Estado: ${conn.state}`);
          console.log(`      Inicio: ${conn.backend_start}, Query: ${conn.query_start || 'N/A'}`);
          if (conn.wait_event_type) {
            console.log(`      Esperando: ${conn.wait_event_type} - ${conn.wait_event}`);
          }
          console.log('');
        });
      }

      // Verificar límites de conexión
      console.log('📈 Límites de conexión:');
      const limits = await sql`
        SELECT 
          setting as max_connections,
          unit
        FROM pg_settings 
        WHERE name = 'max_connections'
      `;
      console.log(`   Máximo de conexiones: ${limits[0].max_connections} ${limits[0].unit || ''}`);

    } catch (error) {
      console.log('   ⚠️  No se pueden ver las conexiones (permisos insuficientes)');
      console.log('   Error:', error.message);
    }

    // Verificar configuración de pgBackRest (si está disponible)
    console.log('\n💾 Verificando configuración de pgBackRest:');
    try {
      const pgbackrest = await sql`
        SELECT 
          name,
          setting
        FROM pg_settings 
        WHERE name LIKE '%archive%' OR name LIKE '%wal%'
        ORDER BY name
      `;
      
      if (pgbackrest.length > 0) {
        pgbackrest.forEach(setting => {
          console.log(`   ${setting.name}: ${setting.setting}`);
        });
      } else {
        console.log('   No se encontraron configuraciones de archivo/WAL');
      }
    } catch (error) {
      console.log('   ⚠️  No se puede verificar pgBackRest');
    }

  } catch (error) {
    console.error('❌ Error al monitorear la base de datos:', error.message);
  } finally {
    await sql.end();
    console.log('\n✅ Monitoreo completado');
  }
}

// Ejecutar monitoreo
monitorConnections().catch(console.error); 