#!/usr/bin/env node

// Script de debug para diagnosticar problemas de base de datos
import { drizzle } from 'drizzle-orm/neon-serverless';
import postgres from '@neondatabase/serverless';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Cargar variables de entorno
config();

const execAsync = promisify(exec);

console.log('🔍 DEBUG: Diagnóstico de conexión a base de datos');
console.log('================================================');

// Mostrar información del entorno
console.log('📡 DATABASE_URL:', process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'no configurado');

if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    process.exit(1);
}

// Analizar la URL de la base de datos
const dbUrl = process.env.DATABASE_URL;
console.log('\n🔍 Analizando DATABASE_URL:');
console.log('  URL completa:', dbUrl);

// Extraer componentes de la URL
try {
    const url = new URL(dbUrl);
    console.log('  Protocolo:', url.protocol);
    console.log('  Hostname:', url.hostname);
    console.log('  Puerto:', url.port || '5432 (por defecto)');
    console.log('  Base de datos:', url.pathname.substring(1));
    console.log('  Usuario:', url.username);
    console.log('  Contraseña:', url.password ? '***CONFIGURADA***' : 'NO CONFIGURADA');
} catch (error) {
    console.log('  ❌ Error al parsear URL:', error.message);
}

// Probar diferentes métodos de conexión
console.log('\n🔌 Probando diferentes métodos de conexión...');

// Método 1: Conexión directa con postgres
console.log('\n📋 Método 1: Conexión directa con postgres');
try {
    console.log('  ✅ Módulo postgres cargado');
    
    const sql = postgres(dbUrl, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
    });
    console.log('  ✅ Cliente postgres creado');
    
    const result = await sql`SELECT 1 as test, current_database() as db, current_user as user`;
    console.log('  ✅ Consulta exitosa:', result[0]);
    
    await sql.end();
    console.log('  ✅ Conexión cerrada');
    
} catch (error) {
    console.log('  ❌ Error en método 1:', error.message);
    console.log('  Código:', error.code);
    console.log('  Detalles:', error.detail);
}

// Método 2: Conexión con parámetros separados
console.log('\n📋 Método 2: Conexión con parámetros separados');
try {
    const url = new URL(dbUrl);
    const sql = postgres({
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.substring(1),
        username: url.username,
        password: url.password,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
    });
    
    console.log('  ✅ Cliente postgres creado con parámetros');
    const result = await sql`SELECT 1 as test`;
    console.log('  ✅ Consulta exitosa:', result[0]);
    
    await sql.end();
    console.log('  ✅ Conexión cerrada');
    
} catch (error) {
    console.log('  ❌ Error en método 2:', error.message);
    console.log('  Código:', error.code);
}

// Método 3: Verificar si es problema de red
console.log('\n📋 Método 3: Verificar conectividad de red');
try {
    const url = new URL(dbUrl);
    const port = url.port || 5432;
    console.log(`  🔍 Probando conectividad a ${url.hostname}:${port}`);
    
    const { stdout, stderr } = await execAsync(`nc -zv ${url.hostname} ${port}`, { timeout: 10000 });
    console.log('  ✅ Conectividad exitosa:', stdout);
    
} catch (error) {
    console.log('  ❌ Error de conectividad:', error.message);
    console.log('  Esto puede indicar un problema de red o firewall');
}

console.log('\n🎯 Resumen del diagnóstico:');
console.log('==========================');
console.log('Si ves errores en todos los métodos, el problema puede ser:');
console.log('1. URL de base de datos incorrecta');
console.log('2. Credenciales incorrectas');
console.log('3. Base de datos no está ejecutándose');
console.log('4. Problema de red/firewall');
console.log('5. Base de datos no permite conexiones externas'); 