#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando verificación y solución de problemas de build...\n');

// 1. Verificar archivo checkbox.tsx
console.log('1️⃣ Verificando archivo checkbox.tsx...');
const checkboxPath = path.join(__dirname, '../client/src/components/ui/checkbox.tsx');

if (!fs.existsSync(checkboxPath)) {
  console.error('❌ Error: El archivo checkbox.tsx no existe');
  process.exit(1);
}

const checkboxContent = fs.readFileSync(checkboxPath, 'utf8');
if (!checkboxContent.includes('@radix-ui/react-checkbox') || !checkboxContent.includes('export { Checkbox }')) {
  console.error('❌ Error: El archivo checkbox.tsx no tiene el contenido correcto');
  process.exit(1);
}
console.log('✅ Archivo checkbox.tsx verificado correctamente');

// 2. Verificar dependencias en package.json
console.log('\n2️⃣ Verificando dependencias en package.json...');
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = [
  '@radix-ui/react-checkbox',
  'redis',
  'socket.io',
  'ioredis'
];

for (const dep of requiredDeps) {
  if (!packageJson.dependencies[dep]) {
    console.error(`❌ Error: ${dep} no está en las dependencias`);
    process.exit(1);
  }
}
console.log('✅ Todas las dependencias requeridas están presentes');

// 3. Verificar configuración de esbuild
console.log('\n3️⃣ Verificando configuración de esbuild...');
const esbuildPath = path.join(__dirname, '../esbuild.config.js');
const esbuildContent = fs.readFileSync(esbuildPath, 'utf8');

const requiredExternals = ['redis', 'socket.io', 'ioredis'];
for (const external of requiredExternals) {
  if (!esbuildContent.includes(`'${external}'`)) {
    console.error(`❌ Error: ${external} no está en la lista de dependencias externas de esbuild`);
    process.exit(1);
  }
}
console.log('✅ Configuración de esbuild verificada correctamente');

// 4. Verificar función cn en utils.ts
console.log('\n4️⃣ Verificando función cn en utils.ts...');
const utilsPath = path.join(__dirname, '../client/src/lib/utils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

if (!utilsContent.includes('export function cn')) {
  console.error('❌ Error: La función cn no está exportada en utils.ts');
  process.exit(1);
}
console.log('✅ Función cn verificada correctamente');

// 5. Verificar importaciones de Checkbox
console.log('\n5️⃣ Verificando importaciones de Checkbox...');
const filesToCheck = [
  '../client/src/components/Calendar/EventForm.tsx',
  '../client/src/components/Calendar/CalendarFilters.tsx'
];

for (const filePath of filesToCheck) {
  const fullPath = path.join(__dirname, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  if (!content.includes("import { Checkbox } from '@/components/ui/checkbox'")) {
    console.error(`❌ Error: ${filePath} no importa Checkbox correctamente`);
    process.exit(1);
  }
}
console.log('✅ Todas las importaciones de Checkbox verificadas correctamente');

// 6. Probar build del servidor
console.log('\n6️⃣ Probando build del servidor...');
try {
  execSync('npm run build:server', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Build del servidor completado exitosamente');
} catch (error) {
  console.error('❌ Error durante el build del servidor:', error.message);
  process.exit(1);
}

// 7. Probar build del cliente
console.log('\n7️⃣ Probando build del cliente...');
try {
  execSync('npm run build:client', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Build del cliente completado exitosamente');
} catch (error) {
  console.error('❌ Error durante el build del cliente:', error.message);
  process.exit(1);
}

// 8. Probar build completo
console.log('\n8️⃣ Probando build completo...');
try {
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Build completo completado exitosamente');
} catch (error) {
  console.error('❌ Error durante el build completo:', error.message);
  process.exit(1);
}

console.log('\n🎉 ¡Todos los problemas de build han sido resueltos!');
console.log('\n📋 Resumen de verificaciones:');
console.log('   ✅ Archivo checkbox.tsx creado y verificado');
console.log('   ✅ Dependencias redis, socket.io, ioredis verificadas');
console.log('   ✅ Configuración de esbuild actualizada');
console.log('   ✅ Función cn disponible');
console.log('   ✅ Importaciones de Checkbox correctas');
console.log('   ✅ Build del servidor exitoso');
console.log('   ✅ Build del cliente exitoso');
console.log('   ✅ Build completo exitoso');
console.log('\n🚀 El proyecto está listo para ser desplegado en GitHub!'); 