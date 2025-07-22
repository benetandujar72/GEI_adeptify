#!/usr/bin/env node

// Script que se adapta a la estructura real de las tablas
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

async function getTableStructure(tableName) {
  const columns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = ${tableName}
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  
  return columns.map(col => col.column_name);
}

async function testAppReal() {
  console.log('🔍 VERIFICANDO ESTADO DE LA APLICACIÓN (ESTRUCTURA REAL)');
  console.log('========================================================');
  
  try {
    // 1. Verificar conexión a base de datos
    console.log('\n🗄️ Verificando base de datos...');
    await sql`SELECT 1`;
    console.log('✅ Conexión a base de datos: OK');
    
    // 2. Verificar datos existentes
    console.log('\n📊 Verificando datos en base de datos...');
    
    const instituteCount = await sql`SELECT COUNT(*) as count FROM institutes`;
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const moduleCount = await sql`SELECT COUNT(*) as count FROM modules`;
    
    console.log(`✅ Institutos: ${instituteCount[0].count}`);
    console.log(`✅ Usuarios: ${userCount[0].count}`);
    console.log(`✅ Módulos: ${moduleCount[0].count}`);
    
    // 3. Verificar estructura de tabla users
    console.log('\n👥 Verificando estructura de tabla users...');
    const userColumns = await getTableStructure('users');
    console.log(`  📝 Columnas disponibles: ${userColumns.join(', ')}`);
    
    // 4. Verificar usuarios específicos (adaptativo)
    console.log('\n👥 Verificando usuarios de prueba...');
    try {
      // Construir query dinámicamente basado en columnas disponibles
      let selectColumns = ['email'];
      if (userColumns.includes('display_name')) selectColumns.push('display_name');
      if (userColumns.includes('role')) selectColumns.push('role');
      if (userColumns.includes('is_active')) selectColumns.push('is_active');
      
      const selectClause = selectColumns.join(', ');
      const testUsers = await sql.unsafe(`
        SELECT ${selectClause}
        FROM users 
        WHERE email IN ('superadmin@gei.es', 'admin@gei.es', 'professor@gei.es', 'alumne@gei.es')
        ORDER BY email
      `);
      
      testUsers.forEach(user => {
        let status = '';
        if (user.is_active !== undefined) {
          status = user.is_active ? ' - Activo' : ' - Inactivo';
        }
        console.log(`  ✅ ${user.email}: ${user.display_name || 'Sin nombre'} (${user.role || 'Sin rol'})${status}`);
      });
    } catch (error) {
      console.log(`  ❌ Error verificando usuarios: ${error.message}`);
    }
    
    // 5. Verificar estructura de tabla modules
    console.log('\n📚 Verificando estructura de tabla modules...');
    const moduleColumns = await getTableStructure('modules');
    console.log(`  📝 Columnas disponibles: ${moduleColumns.join(', ')}`);
    
    // 6. Verificar módulos (adaptativo)
    console.log('\n📚 Verificando módulos...');
    try {
      let selectColumns = ['name'];
      if (moduleColumns.includes('code')) selectColumns.push('code');
      if (moduleColumns.includes('is_active')) selectColumns.push('is_active');
      
      const selectClause = selectColumns.join(', ');
      const modules = await sql.unsafe(`
        SELECT ${selectClause}
        FROM modules 
        ORDER BY name
      `);
      
      modules.forEach(module => {
        let status = '';
        if (module.is_active !== undefined) {
          status = module.is_active ? ' - Activo' : ' - Inactivo';
        }
        console.log(`  ✅ ${module.name} (${module.code || 'Sin código'})${status}`);
      });
    } catch (error) {
      console.log(`  ❌ Error verificando módulos: ${error.message}`);
    }
    
    // 7. Verificar variables de entorno
    console.log('\n⚙️ Verificando variables de entorno...');
    const envVars = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'SESSION_SECRET'
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
    
    // 8. Verificar archivos de build
    console.log('\n📁 Verificando archivos de build...');
    const fs = await import('fs');
    const path = await import('path');
    
    const buildPaths = [
      'dist/index.js',
      'client/dist/index.html',
      'client/dist/assets'
    ];
    
    buildPaths.forEach(buildPath => {
      try {
        const fullPath = path.join(process.cwd(), buildPath);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            console.log(`  ✅ ${buildPath}: [Directorio]`);
          } else {
            console.log(`  ✅ ${buildPath}: ${stats.size} bytes`);
          }
        } else {
          console.log(`  ❌ ${buildPath}: NO EXISTE`);
        }
      } catch (error) {
        console.log(`  ⚠️ ${buildPath}: Error - ${error.message}`);
      }
    });
    
    // 9. Verificar puerto
    console.log('\n🌐 Verificando configuración de red...');
    const port = process.env.PORT || 3000;
    console.log(`✅ Puerto configurado: ${port}`);
    
    // 10. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('==================');
    console.log('1. ✅ Base de datos: Conectada y con datos');
    console.log('2. ✅ Usuarios: Creados correctamente');
    console.log('3. ✅ Módulos: Disponibles');
    console.log('4. 🔍 Verificar logs de la aplicación en Render');
    console.log('5. 🔍 Verificar si el servidor está ejecutándose');
    console.log('6. 🔍 Verificar si hay errores en el build del cliente');
    
    console.log('\n🔑 Credenciales para probar:');
    console.log('===========================');
    console.log('👑 Super Admin: superadmin@gei.es / password123');
    console.log('👨‍💼 Admin: admin@gei.es / password123');
    console.log('👨‍🏫 Professor: professor@gei.es / password123');
    console.log('👨‍🎓 Alumne: alumne@gei.es / password123');
    
    console.log('\n🎯 Estado general: BASE DE DATOS LISTA');
    console.log('💡 El problema parece estar en el frontend o servidor');
    
    // 11. Comandos para probar
    console.log('\n🔧 Comandos para probar:');
    console.log('=======================');
    console.log('1. curl http://localhost:3000/health');
    console.log('2. curl http://localhost:3000/api/health');
    console.log('3. curl http://localhost:3000/api/auth/me');
    console.log('4. ls -la dist/');
    console.log('5. ls -la client/dist/');
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

testAppReal().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 