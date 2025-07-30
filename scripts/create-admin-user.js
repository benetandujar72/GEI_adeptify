#!/usr/bin/env node

// Script para crear un usuario administrador
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('👤 CREANDO USUARIO ADMINISTRADOR');
console.log('================================');

async function createAdminUser() {
  try {
    // Verificar variables de entorno
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definida en las variables de entorno');
    }

    console.log('📡 Conectando a la base de datos...');
    
    // Crear conexión a la base de datos
    const sql = postgres(databaseUrl, { 
      max: 1,
      ssl: {
        rejectUnauthorized: false
      }
    });
    const db = drizzle(sql);

    // Verificar que las tablas existan
    console.log('🔍 Verificando estructura de la base de datos...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = 'users'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      throw new Error('La tabla users no existe. Ejecuta primero: npm run db:create-tables');
    }

    console.log('✅ Tabla users encontrada');

    // Verificar si ya existe un usuario administrador
    const existingAdmin = await sql`
      SELECT id, email, display_name, role 
      FROM users 
      WHERE role = 'super_admin' 
      OR email = 'admin@gei.adeptify.es'
      LIMIT 1;
    `;

    if (existingAdmin.length > 0) {
      console.log('⚠️ Ya existe un usuario administrador:');
      console.log(`   Email: ${existingAdmin[0].email}`);
      console.log(`   Nombre: ${existingAdmin[0].display_name}`);
      console.log(`   Rol: ${existingAdmin[0].role}`);
      console.log('\n💡 Credenciales para login:');
      console.log('   Email: admin@gei.adeptify.es');
      console.log('   Contraseña: admin123');
      return;
    }

    // Crear hash de la contraseña
    const password = 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Obtener el primer instituto (o crear uno si no existe)
    let instituteId;
    const institutes = await sql`SELECT id FROM institutes LIMIT 1`;
    
    if (institutes.length === 0) {
      console.log('⚠️ No se encontraron institutos, creando uno...');
      const newInstitute = await sql`
        INSERT INTO institutes (name, code, address, phone, email, website, is_active)
        VALUES ('Instituto Demo', 'DEMO001', 'Calle Demo 123', '+34 123 456 789', 'info@institutodemo.es', 'https://institutodemo.es', true)
        RETURNING id;
      `;
      instituteId = newInstitute[0].id;
      console.log(`✅ Instituto creado con ID: ${instituteId}`);
    } else {
      instituteId = institutes[0].id;
      console.log(`✅ Usando instituto existente con ID: ${instituteId}`);
    }

    // Crear usuario administrador
    console.log('👤 Creando usuario administrador...');
    
    const adminUser = await sql`
      INSERT INTO users (
        institute_id,
        email,
        display_name,
        first_name,
        last_name,
        role,
        password_hash,
        is_active,
        preferences
      ) VALUES (
        ${instituteId},
        'admin@gei.adeptify.es',
        'Administrador GEI',
        'Admin',
        'GEI',
        'super_admin',
        ${passwordHash},
        true,
        '{"theme": "light", "language": "es"}'
      )
      RETURNING id, email, display_name, role;
    `;

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log(`   ID: ${adminUser[0].id}`);
    console.log(`   Email: ${adminUser[0].email}`);
    console.log(`   Nombre: ${adminUser[0].display_name}`);
    console.log(`   Rol: ${adminUser[0].role}`);

    // Crear usuarios adicionales para testing
    console.log('\n👥 Creando usuarios adicionales para testing...');

    const testUsers = [
      {
        email: 'teacher@gei.adeptify.es',
        display_name: 'Profesor Demo',
        first_name: 'Profesor',
        last_name: 'Demo',
        role: 'teacher',
        password: 'teacher123'
      },
      {
        email: 'student@gei.adeptify.es',
        display_name: 'Estudiante Demo',
        first_name: 'Estudiante',
        last_name: 'Demo',
        role: 'student',
        password: 'student123'
      },
      {
        email: 'parent@gei.adeptify.es',
        display_name: 'Padre Demo',
        first_name: 'Padre',
        last_name: 'Demo',
        role: 'parent',
        password: 'parent123'
      }
    ];

    for (const userData of testUsers) {
      const userPasswordHash = await bcrypt.hash(userData.password, saltRounds);
      
      await sql`
        INSERT INTO users (
          institute_id,
          email,
          display_name,
          first_name,
          last_name,
          role,
          password_hash,
          is_active,
          preferences
        ) VALUES (
          ${instituteId},
          ${userData.email},
          ${userData.display_name},
          ${userData.first_name},
          ${userData.last_name},
          ${userData.role},
          ${userPasswordHash},
          true,
          '{"theme": "light", "language": "es"}'
        )
        ON CONFLICT (email) DO NOTHING;
      `;
      
      console.log(`✅ Usuario ${userData.role} creado: ${userData.email}`);
    }

    // Cerrar conexión
    await sql.end();
    
    console.log('\n🎉 USUARIOS CREADOS EXITOSAMENTE');
    console.log('================================');
    console.log('\n📋 CREDENCIALES PARA LOGIN:');
    console.log('============================');
    console.log('👑 Administrador:');
    console.log('   Email: admin@gei.adeptify.es');
    console.log('   Contraseña: admin123');
    console.log('   Rol: super_admin');
    console.log('');
    console.log('👨‍🏫 Profesor:');
    console.log('   Email: teacher@gei.adeptify.es');
    console.log('   Contraseña: teacher123');
    console.log('   Rol: teacher');
    console.log('');
    console.log('👨‍🎓 Estudiante:');
    console.log('   Email: student@gei.adeptify.es');
    console.log('   Contraseña: student123');
    console.log('   Rol: student');
    console.log('');
    console.log('👨‍👩‍👧‍👦 Padre:');
    console.log('   Email: parent@gei.adeptify.es');
    console.log('   Contraseña: parent123');
    console.log('   Rol: parent');
    console.log('');
    console.log('🚀 Ahora puedes hacer login en la aplicación!');
    
  } catch (error) {
    console.error('\n❌ ERROR AL CREAR USUARIO ADMINISTRADOR:');
    console.error('=========================================');
    console.error(error.message);
    
    if (error.message.includes('La tabla users no existe')) {
      console.error('\n💡 EJECUTA PRIMERO:');
      console.error('==================');
      console.error('npm run db:create-tables');
      console.error('npm run db:init-simple');
    }
    
    process.exit(1);
  }
}

// Ejecutar el script
createAdminUser(); 