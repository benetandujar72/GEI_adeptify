#!/usr/bin/env node

// Script de diagnóstico completo del sistema
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔬 DIAGNÓSTICO COMPLETO DEL SISTEMA');
console.log('===================================');

async function diagnoseSystem() {
  const issues = [];
  const warnings = [];
  const successes = [];

  try {
    // 1. Verificar archivos críticos
    console.log('\n📁 VERIFICANDO ARCHIVOS CRÍTICOS');
    console.log('================================');

    const criticalFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'drizzle.config.ts',
      'esbuild.config.js',
      'shared/schema.ts',
      'server/index.ts',
      'client/src/App.tsx',
      '.env'
    ];

    for (const file of criticalFiles) {
      const fullPath = join(__dirname, '..', file);
      if (existsSync(fullPath)) {
        console.log(`✅ ${file}`);
        successes.push(`Archivo ${file} presente`);
      } else {
        console.log(`❌ ${file} - FALTANTE`);
        issues.push(`Archivo crítico ${file} no encontrado`);
      }
    }

    // 2. Verificar package.json
    console.log('\n📦 VERIFICANDO PACKAGE.JSON');
    console.log('============================');

    try {
      const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
      
      // Verificar scripts críticos
      const criticalScripts = [
        'build',
        'start',
        'db:create-tables',
        'db:init-simple',
        'db:check-simple',
        'diagnose'
      ];

      for (const script of criticalScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
          successes.push(`Script ${script} configurado`);
        } else {
          console.log(`❌ ${script} - FALTANTE en scripts`);
          issues.push(`Script ${script} no configurado en package.json`);
        }
      }

      // Verificar dependencias críticas
      const criticalDeps = [
        'postgres',
        'express',
        'drizzle-orm',
        'bcryptjs',
        'cors',
        'helmet',
        'compression',
        'winston',
        'node-fetch'
      ];

      for (const dep of criticalDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
          successes.push(`Dependencia ${dep} instalada`);
        } else {
          console.log(`❌ ${dep} - FALTANTE en dependencies`);
          issues.push(`Dependencia ${dep} no instalada`);
        }
      }

    } catch (error) {
      console.log(`❌ Error leyendo package.json: ${error.message}`);
      issues.push(`Error al leer package.json: ${error.message}`);
    }

    // 3. Verificar variables de entorno
    console.log('\n🔧 VERIFICANDO VARIABLES DE ENTORNO');
    console.log('===================================');

    const requiredEnvVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'PORT'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: ${envVar === 'DATABASE_URL' ? '***configurada***' : process.env[envVar]}`);
        successes.push(`Variable de entorno ${envVar} configurada`);
      } else {
        console.log(`❌ ${envVar} - NO CONFIGURADA`);
        issues.push(`Variable de entorno ${envVar} no configurada`);
      }
    }

    // 4. Verificar conexión a base de datos
    console.log('\n🗄️ VERIFICANDO CONEXIÓN A BASE DE DATOS');
    console.log('======================================');

    if (process.env.DATABASE_URL) {
      try {
        const sql = postgres(process.env.DATABASE_URL, { 
          max: 1,
          ssl: {
            rejectUnauthorized: false
          }
        });
        await sql`SELECT 1 as test`;
        console.log('✅ Conexión a base de datos exitosa');
        successes.push('Conexión a base de datos establecida');

        // Verificar tablas
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `;

        if (tables.length > 0) {
          console.log(`✅ ${tables.length} tablas encontradas en la base de datos`);
          successes.push(`${tables.length} tablas presentes en la base de datos`);
        } else {
          console.log('⚠️ No se encontraron tablas en la base de datos');
          warnings.push('No se encontraron tablas en la base de datos');
        }

        await sql.end();
      } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
        issues.push(`Error de conexión a base de datos: ${error.message}`);
      }
    } else {
      console.log('⚠️ DATABASE_URL no configurada, saltando verificación de BD');
      warnings.push('DATABASE_URL no configurada');
    }

    // 5. Verificar directorios de build
    console.log('\n🏗️ VERIFICANDO DIRECTORIOS DE BUILD');
    console.log('===================================');

    const buildDirs = [
      'dist',
      'client/dist',
      'node_modules'
    ];

    for (const dir of buildDirs) {
      const fullPath = join(__dirname, '..', dir);
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          console.log(`✅ ${dir}/ (directorio presente)`);
          successes.push(`Directorio ${dir} presente`);
        } else {
          console.log(`⚠️ ${dir} existe pero no es un directorio`);
          warnings.push(`${dir} existe pero no es un directorio`);
        }
      } else {
        console.log(`⚠️ ${dir}/ - NO ENCONTRADO`);
        warnings.push(`Directorio ${dir} no encontrado`);
      }
    }

    // 6. Verificar archivos de configuración específicos
    console.log('\n⚙️ VERIFICANDO CONFIGURACIONES ESPECÍFICAS');
    console.log('==========================================');

    const configFiles = [
      'client/vite.config.ts',
      'client/tailwind.config.js',
      'client/postcss.config.js',
      'drizzle/0000_wise_namora.sql'
    ];

    for (const file of configFiles) {
      const fullPath = join(__dirname, '..', file);
      if (existsSync(fullPath)) {
        console.log(`✅ ${file}`);
        successes.push(`Archivo de configuración ${file} presente`);
      } else {
        console.log(`⚠️ ${file} - NO ENCONTRADO`);
        warnings.push(`Archivo de configuración ${file} no encontrado`);
      }
    }

    // 7. Verificar permisos de archivos
    console.log('\n🔐 VERIFICANDO PERMISOS');
    console.log('=======================');

    const criticalFilesForPermissions = [
      'package.json',
      'server/index.ts',
      'client/src/App.tsx'
    ];

    for (const file of criticalFilesForPermissions) {
      const fullPath = join(__dirname, '..', file);
      if (existsSync(fullPath)) {
        try {
          const stats = statSync(fullPath);
          const isReadable = (stats.mode & 0o400) !== 0;
          if (isReadable) {
            console.log(`✅ ${file} (legible)`);
            successes.push(`Archivo ${file} tiene permisos de lectura`);
          } else {
            console.log(`❌ ${file} (sin permisos de lectura)`);
            issues.push(`Archivo ${file} no tiene permisos de lectura`);
          }
        } catch (error) {
          console.log(`❌ ${file} (error al verificar permisos: ${error.message})`);
          issues.push(`Error al verificar permisos de ${file}: ${error.message}`);
        }
      }
    }

    // 8. Verificar versión de Node.js
    console.log('\n🟢 VERIFICANDO VERSIÓN DE NODE.JS');
    console.log('==================================');

    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    console.log(`📊 Versión actual: ${nodeVersion}`);
    
    if (nodeMajor >= 18) {
      console.log('✅ Versión de Node.js compatible (>= 18)');
      successes.push(`Node.js ${nodeVersion} es compatible`);
    } else {
      console.log('❌ Versión de Node.js incompatible (< 18)');
      issues.push(`Node.js ${nodeVersion} no es compatible (se requiere >= 18)`);
    }

    // 9. Verificar memoria disponible
    console.log('\n💾 VERIFICANDO RECURSOS DEL SISTEMA');
    console.log('====================================');

    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024)
    };

    console.log(`📊 Memoria RSS: ${memUsageMB.rss} MB`);
    console.log(`📊 Heap Total: ${memUsageMB.heapTotal} MB`);
    console.log(`📊 Heap Usado: ${memUsageMB.heapUsed} MB`);

    if (memUsageMB.rss < 100) {
      console.log('✅ Uso de memoria normal');
      successes.push('Uso de memoria dentro de límites normales');
    } else {
      console.log('⚠️ Uso de memoria alto');
      warnings.push('Uso de memoria alto');
    }

    // 10. Resumen del diagnóstico
    console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO');
    console.log('==========================');

    console.log(`✅ Éxitos: ${successes.length}`);
    console.log(`⚠️ Advertencias: ${warnings.length}`);
    console.log(`❌ Problemas: ${issues.length}`);

    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n🎉 SISTEMA EN PERFECTO ESTADO');
      console.log('=============================');
      console.log('✅ Todos los componentes están funcionando correctamente');
      console.log('🚀 El sistema está listo para producción');
    } else if (issues.length === 0) {
      console.log('\n⚠️ SISTEMA FUNCIONAL CON ADVERTENCIAS');
      console.log('=====================================');
      console.log('✅ El sistema funciona correctamente');
      console.log('⚠️ Hay algunas advertencias menores que puedes revisar');
    } else {
      console.log('\n❌ PROBLEMAS DETECTADOS');
      console.log('======================');
      console.log('❌ Se encontraron problemas que deben resolverse');
      console.log('💡 Revisa las recomendaciones a continuación');
    }

    // Mostrar problemas
    if (issues.length > 0) {
      console.log('\n🔧 PROBLEMAS A RESOLVER:');
      console.log('========================');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Mostrar advertencias
    if (warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:');
      console.log('===============');
      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('===================');
    
    if (issues.length > 0) {
      console.log('1. Resuelve los problemas críticos antes de continuar');
      console.log('2. Ejecuta npm install para instalar dependencias faltantes');
      console.log('3. Verifica la configuración de variables de entorno');
      console.log('4. Asegúrate de que la base de datos esté accesible');
    }
    
    if (warnings.length > 0) {
      console.log('5. Revisa las advertencias para optimizar el sistema');
    }
    
    console.log('6. Ejecuta npm run build para compilar el proyecto');
    console.log('7. Ejecuta npm start para iniciar la aplicación');

    // Código de salida
    const exitCode = issues.length > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      console.log('\n✅ Diagnóstico completado exitosamente');
    } else {
      console.log('\n❌ Diagnóstico completado con problemas');
    }

    process.exit(exitCode);

  } catch (error) {
    console.error('\n❌ ERROR EN EL DIAGNÓSTICO:');
    console.error('============================');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar diagnóstico
diagnoseSystem(); 