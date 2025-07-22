#!/usr/bin/env node

// Script para crear tablas directamente sin archivos de migración
import postgres from 'postgres';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

console.log('🗄️ Creando tablas directamente...');
console.log('==================================');

// Configuración de base de datos
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 1
});

async function createTables() {
  try {
    console.log('🔍 Verificando conexión...');
    await sql`SELECT 1`;
    console.log('✅ Conexión establecida');



    console.log('📋 Creando tablas...');
    
    // Ejecutar comandos SQL uno por uno
    const commands = [
      // Crear ENUMs
      `DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('super_admin', 'institute_admin', 'teacher', 'student', 'parent', 'staff');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      `DO $$ BEGIN
        CREATE TYPE module_status AS ENUM ('active', 'inactive', 'maintenance');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      `DO $$ BEGIN
        CREATE TYPE academic_year_status AS ENUM ('active', 'inactive', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      `DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('system', 'evaluation', 'attendance', 'guard_duty', 'survey', 'resource', 'analytics', 'general');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      // Crear tablas
      `CREATE TABLE IF NOT EXISTS institutes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo TEXT,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        photo_url TEXT,
        role user_role NOT NULL,
        google_id TEXT UNIQUE,
        password_hash TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS academic_years (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status academic_year_status DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        status module_status DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS institute_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(institute_id, module_id)
      );`,
      
      `CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        max_students INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS competencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        capacity INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    ];

    console.log(`📊 Ejecutando ${commands.length} comandos SQL...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        await sql.unsafe(command);
        console.log(`  ✅ Comando ${i + 1}/${commands.length} ejecutado`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate_object')) {
          console.log(`  ⚠️ Comando ${i + 1}/${commands.length} ya existía`);
        } else {
          console.log(`  ❌ Error en comando ${i + 1}/${commands.length}: ${error.message}`);
        }
      }
    }

    // Verificar que las tablas se crearon
    console.log('\n📊 Verificando tablas creadas...');
    
    const tables = [
      'institutes',
      'users', 
      'academic_years',
      'modules',
      'institute_modules',
      'classes',
      'competencies',
      'resources'
    ];

    for (const tableName of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        console.log(`  ✅ ${tableName}: ${result[0].count} registros`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 Tablas creadas exitosamente!');
    console.log('🚀 La base de datos está lista para usar');

  } catch (error) {
    console.error('❌ Error al crear tablas:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Ejecutar creación de tablas
createTables()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }); 