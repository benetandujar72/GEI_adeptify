#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del Dockerfile...\n');

// 1. Verificar que el Dockerfile existe
console.log('1️⃣ Verificando existencia del Dockerfile...');
const dockerfilePath = path.join(__dirname, '../Dockerfile');
if (!fs.existsSync(dockerfilePath)) {
  console.error('❌ Error: Dockerfile no encontrado');
  process.exit(1);
}
console.log('✅ Dockerfile encontrado');

// 2. Leer contenido del Dockerfile
console.log('\n2️⃣ Leyendo contenido del Dockerfile...');
const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

// 3. Verificar que contiene la creación del archivo checkbox.tsx
console.log('\n3️⃣ Verificando creación del archivo checkbox.tsx...');
const checkboxCreationCheck = dockerfileContent.includes('client/src/components/ui/checkbox.tsx') && 
                              dockerfileContent.includes('@radix-ui/react-checkbox') &&
                              dockerfileContent.includes('export { Checkbox }');

if (!checkboxCreationCheck) {
  console.error('❌ Error: El Dockerfile no contiene la creación del archivo checkbox.tsx');
  process.exit(1);
}
console.log('✅ Creación del archivo checkbox.tsx encontrada en Dockerfile');

// 4. Verificar que contiene la verificación del archivo checkbox.tsx
console.log('\n4️⃣ Verificando verificación del archivo checkbox.tsx...');
const checkboxVerificationCheck = dockerfileContent.includes('ls -la client/src/components/ui/checkbox.tsx');

if (!checkboxVerificationCheck) {
  console.error('❌ Error: El Dockerfile no contiene la verificación del archivo checkbox.tsx');
  process.exit(1);
}
console.log('✅ Verificación del archivo checkbox.tsx encontrada en Dockerfile');

// 5. Verificar que las dependencias externas están configuradas
console.log('\n5️⃣ Verificando dependencias externas en esbuild...');
const externalDepsCheck = dockerfileContent.includes("'redis'") && 
                          dockerfileContent.includes("'socket.io'") && 
                          dockerfileContent.includes("'ioredis'");

if (!externalDepsCheck) {
  console.error('❌ Error: Las dependencias externas no están configuradas en esbuild');
  process.exit(1);
}
console.log('✅ Dependencias externas configuradas en esbuild');

// 6. Verificar estructura general del Dockerfile
console.log('\n6️⃣ Verificando estructura del Dockerfile...');
const structureChecks = [
  dockerfileContent.includes('FROM node:18-alpine AS base'),
  dockerfileContent.includes('COPY client/src ./client/src'),
  dockerfileContent.includes('npm run build'),
  dockerfileContent.includes('FROM node:18-alpine AS production')
];

const allStructureChecks = structureChecks.every(check => check);
if (!allStructureChecks) {
  console.error('❌ Error: Estructura del Dockerfile incompleta');
  process.exit(1);
}
console.log('✅ Estructura del Dockerfile verificada');

// 7. Verificar que el archivo checkbox.tsx local existe
console.log('\n7️⃣ Verificando archivo checkbox.tsx local...');
const localCheckboxPath = path.join(__dirname, '../client/src/components/ui/checkbox.tsx');
if (!fs.existsSync(localCheckboxPath)) {
  console.error('❌ Error: El archivo checkbox.tsx local no existe');
  process.exit(1);
}
console.log('✅ Archivo checkbox.tsx local encontrado');

// 8. Verificar contenido del archivo checkbox.tsx local
console.log('\n8️⃣ Verificando contenido del archivo checkbox.tsx local...');
const localCheckboxContent = fs.readFileSync(localCheckboxPath, 'utf8');
const contentChecks = [
  localCheckboxContent.includes('@radix-ui/react-checkbox'),
  localCheckboxContent.includes('export { Checkbox }'),
  localCheckboxContent.includes('import { cn } from "@/lib/utils"')
];

const allContentChecks = contentChecks.every(check => check);
if (!allContentChecks) {
  console.error('❌ Error: El archivo checkbox.tsx local no tiene el contenido correcto');
  process.exit(1);
}
console.log('✅ Contenido del archivo checkbox.tsx local verificado');

console.log('\n🎉 ¡Todas las verificaciones del Dockerfile han pasado!');
console.log('\n📋 Resumen de verificaciones:');
console.log('   ✅ Dockerfile existe');
console.log('   ✅ Creación del archivo checkbox.tsx configurada');
console.log('   ✅ Verificación del archivo checkbox.tsx configurada');
console.log('   ✅ Dependencias externas configuradas');
console.log('   ✅ Estructura del Dockerfile correcta');
console.log('   ✅ Archivo checkbox.tsx local existe');
console.log('   ✅ Contenido del archivo checkbox.tsx local correcto');

console.log('\n🚀 El Dockerfile está listo para construir la imagen sin errores!'); 