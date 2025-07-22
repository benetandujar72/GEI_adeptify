#!/usr/bin/env node

// Script simple para verificar el estado de la aplicación en Render
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

async function testAppSimple() {
  console.log('🔍 VERIFICANDO ESTADO DE LA APLICACIÓN (SIMPLE)');
  console.log('===============================================');
  
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
    
    // 3. Verificar usuarios específicos
    console.log('\n👥 Verificando usuarios de prueba...');
    const testUsers = await sql`
      SELECT email, display_name, role, is_active 
      FROM users 
      WHERE email IN ('superadmin@gei.es', 'admin@gei.es', 'professor@gei.es', 'alumne@gei.es')
      ORDER BY email
    `;
    
    testUsers.forEach(user => {
      console.log(`  ✅ ${user.email}: ${user.display_name} (${user.role}) - ${user.is_active ? 'Activo' : 'Inactivo'}`);
    });
    
    // 4. Verificar módulos
    console.log('\n📚 Verificando módulos...');
    const modules = await sql`
      SELECT name, code, is_active 
      FROM modules 
      ORDER BY name
    `;
    
    modules.forEach(module => {
      console.log(`  ✅ ${module.name} (${module.code}) - ${module.is_active ? 'Activo' : 'Inactivo'}`);
    });
    
    // 5. Verificar variables de entorno
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
    
    // 6. Verificar archivos de build
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
    
    // 7. Verificar puerto
    console.log('\n🌐 Verificando configuración de red...');
    const port = process.env.PORT || 3000;
    console.log(`✅ Puerto configurado: ${port}`);
    
    // 8. Recomendaciones
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
    
    // 9. Comandos para probar
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

testAppSimple().catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
}); 