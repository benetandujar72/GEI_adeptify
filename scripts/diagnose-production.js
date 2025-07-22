#!/usr/bin/env node

// Script de diagnóstico completo para producción
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { config } from 'dotenv';

// Configuración
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 DIAGNÓSTICO COMPLETO DE PRODUCCIÓN');
console.log('=====================================');
console.log(`📅 Fecha: ${new Date().toISOString()}`);
console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
console.log('');

async function diagnoseProduction() {
  try {
    // 1. Verificar variables de entorno
    console.log('🔧 1. VERIFICANDO VARIABLES DE ENTORNO');
    console.log('----------------------------------------');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'PORT'
    ];
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (varName === 'DATABASE_URL') {
          const masked = value.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
          console.log(`✅ ${varName}: ${masked}`);
        } else {
          console.log(`✅ ${varName}: ${value}`);
        }
      } else {
        console.log(`❌ ${varName}: NO CONFIGURADA`);
      }
    });
    
    // 2. Verificar archivos de build
    console.log('\n📁 2. VERIFICANDO ARCHIVOS DE BUILD');
    console.log('------------------------------------');
    
    const buildPaths = [
      'dist/index.js',
      'client/dist/index.html',
      'client/dist/assets'
    ];
    
    buildPaths.forEach(path => {
      const fullPath = join(__dirname, '..', path);
      if (existsSync(fullPath)) {
        try {
          const stats = readFileSync(fullPath, 'utf8').length;
          console.log(`✅ ${path}: ${stats} bytes`);
        } catch (error) {
          if (error.code === 'EISDIR') {
            console.log(`✅ ${path}: [Directorio]`);
          } else {
            console.log(`⚠️ ${path}: Error leyendo archivo - ${error.message}`);
          }
        }
      } else {
        console.log(`❌ ${path}: NO EXISTE`);
      }
    });
    
    // 3. Verificar dependencias
    console.log('\n📦 3. VERIFICANDO DEPENDENCIAS');
    console.log('-------------------------------');
    
    try {
      const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
      console.log(`✅ package.json: ${packageJson.name} v${packageJson.version}`);
      
      const requiredDeps = ['postgres', 'drizzle-orm', 'express', 'cors'];
      requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
          console.log(`✅ ${dep}: v${packageJson.dependencies[dep]}`);
        } else {
          console.log(`❌ ${dep}: NO INSTALADA`);
        }
      });
    } catch (error) {
      console.log(`❌ Error leyendo package.json: ${error.message}`);
    }
    
    // 4. Verificar conexión a base de datos
    console.log('\n🗄️ 4. VERIFICANDO CONEXIÓN A BASE DE DATOS');
    console.log('-------------------------------------------');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('❌ DATABASE_URL no configurada');
    } else {
      try {
        const sql = postgres(databaseUrl, {
          ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
          } : false,
          max: 1,
          connect_timeout: 10
        });
        
        const result = await sql`SELECT version()`;
        console.log('✅ Conexión a base de datos establecida');
        console.log(`📊 PostgreSQL: ${result[0].version.split(' ')[0]}`);
        
        // Verificar tablas
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `;
        
        console.log(`📋 Tablas encontradas: ${tables.length}`);
        tables.slice(0, 5).forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
        if (tables.length > 5) {
          console.log(`  ... y ${tables.length - 5} más`);
        }
        
        await sql.end();
      } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
      }
    }
    
    // 5. Verificar puerto y procesos
    console.log('\n🌐 5. VERIFICANDO PUERTO Y PROCESOS');
    console.log('-----------------------------------');
    
    const port = process.env.PORT || 3000;
    console.log(`🔌 Puerto configurado: ${port}`);
    
    try {
      const netstat = execSync(`netstat -tuln | grep :${port}`, { encoding: 'utf8' });
      console.log('✅ Puerto en uso detectado');
      console.log(netstat.trim());
    } catch (error) {
      console.log('❌ Puerto no detectado en netstat');
    }
    
    // 6. Verificar memoria y recursos
    console.log('\n💾 6. VERIFICANDO RECURSOS DEL SISTEMA');
    console.log('--------------------------------------');
    
    try {
      const memory = execSync('free -h', { encoding: 'utf8' });
      console.log('📊 Memoria del sistema:');
      console.log(memory.trim());
    } catch (error) {
      console.log('❌ No se pudo obtener información de memoria');
    }
    
    // 7. Verificar logs del sistema
    console.log('\n📝 7. VERIFICANDO LOGS DEL SISTEMA');
    console.log('----------------------------------');
    
    try {
      const logs = execSync('tail -n 20 /var/log/syslog 2>/dev/null || tail -n 20 /var/log/messages 2>/dev/null || echo "No se encontraron logs del sistema"', { encoding: 'utf8' });
      console.log('📋 Últimas entradas de log:');
      console.log(logs.trim().split('\n').slice(-5).join('\n'));
    } catch (error) {
      console.log('❌ No se pudieron leer los logs del sistema');
    }
    
    // 8. Verificar configuración de la aplicación
    console.log('\n⚙️ 8. VERIFICANDO CONFIGURACIÓN DE LA APLICACIÓN');
    console.log('------------------------------------------------');
    
    const configFiles = [
      'render.yaml',
      'Dockerfile',
      'esbuild.config.js',
      'drizzle.config.ts'
    ];
    
    configFiles.forEach(file => {
      const fullPath = join(__dirname, '..', file);
      if (existsSync(fullPath)) {
        console.log(`✅ ${file}: Existe`);
      } else {
        console.log(`❌ ${file}: NO EXISTE`);
      }
    });
    
    console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO');
    console.log('==========================');
    console.log('✅ Verificación completada');
    console.log('📋 Revisa los resultados anteriores para identificar problemas');
    console.log('💡 Si hay errores, ejecuta los comandos de corrección correspondientes');
    
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnoseProduction()
  .then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 