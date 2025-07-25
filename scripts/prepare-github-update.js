#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparando actualización para GitHub...\n');

// 1. Verificar que estamos en el directorio correcto
console.log('1️⃣ Verificando directorio de trabajo...');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto.');
  process.exit(1);
}
console.log('✅ Directorio de trabajo correcto');

// 2. Verificar estado de git
console.log('\n2️⃣ Verificando estado de Git...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (!gitStatus.trim()) {
    console.log('ℹ️  No hay cambios pendientes para commit');
  } else {
    console.log('📝 Cambios detectados:');
    console.log(gitStatus);
  }
} catch (error) {
  console.error('❌ Error al verificar estado de Git:', error.message);
  process.exit(1);
}

// 3. Verificar que todos los archivos críticos existen
console.log('\n3️⃣ Verificando archivos críticos...');
const criticalFiles = [
  'client/src/components/ui/checkbox.tsx',
  'esbuild.config.js',
  'package.json',
  'client/src/lib/utils.ts',
  'client/src/components/Calendar/EventForm.tsx',
  'client/src/components/Calendar/CalendarFilters.tsx'
];

for (const file of criticalFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Error: Archivo crítico no encontrado: ${file}`);
    process.exit(1);
  }
}
console.log('✅ Todos los archivos críticos verificados');

// 4. Verificar contenido del checkbox.tsx
console.log('\n4️⃣ Verificando contenido del checkbox.tsx...');
const checkboxContent = fs.readFileSync('client/src/components/ui/checkbox.tsx', 'utf8');
if (!checkboxContent.includes('@radix-ui/react-checkbox') || !checkboxContent.includes('export { Checkbox }')) {
  console.error('❌ Error: El archivo checkbox.tsx no tiene el contenido correcto');
  process.exit(1);
}
console.log('✅ Contenido del checkbox.tsx verificado');

// 5. Verificar configuración de esbuild
console.log('\n5️⃣ Verificando configuración de esbuild...');
const esbuildContent = fs.readFileSync('esbuild.config.js', 'utf8');
const requiredExternals = ['redis', 'socket.io', 'ioredis'];
for (const external of requiredExternals) {
  if (!esbuildContent.includes(`'${external}'`)) {
    console.error(`❌ Error: ${external} no está en la lista de dependencias externas`);
    process.exit(1);
  }
}
console.log('✅ Configuración de esbuild verificada');

// 6. Verificar dependencias en package.json
console.log('\n6️⃣ Verificando dependencias en package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['@radix-ui/react-checkbox', 'redis', 'socket.io', 'ioredis'];
for (const dep of requiredDeps) {
  if (!packageJson.dependencies[dep]) {
    console.error(`❌ Error: ${dep} no está en las dependencias`);
    process.exit(1);
  }
}
console.log('✅ Dependencias verificadas');

// 7. Probar build rápido
console.log('\n7️⃣ Probando build rápido...');
try {
  execSync('npm run build:server', { 
    stdio: 'pipe',
    timeout: 30000 // 30 segundos
  });
  console.log('✅ Build del servidor exitoso');
} catch (error) {
  console.error('❌ Error en build del servidor:', error.message);
  process.exit(1);
}

// 8. Preparar commit
console.log('\n8️⃣ Preparando commit...');
const commitMessage = 'Fix: Resuelve errores de build - checkbox faltante y dependencias del servidor\n\n- Crea componente checkbox.tsx faltante\n- Agrega redis, socket.io, ioredis como dependencias externas en esbuild\n- Verifica todas las dependencias y configuraciones\n- Prepara proyecto para deployment exitoso';

try {
  // Agregar todos los archivos
  execSync('git add .', { stdio: 'inherit' });
  console.log('✅ Archivos agregados al staging');
  
  // Crear commit
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  console.log('✅ Commit creado exitosamente');
  
} catch (error) {
  console.error('❌ Error al crear commit:', error.message);
  process.exit(1);
}

// 9. Verificar branch actual
console.log('\n9️⃣ Verificando branch actual...');
try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📍 Branch actual: ${currentBranch}`);
  
  if (currentBranch !== 'main') {
    console.log('⚠️  Advertencia: No estás en el branch main');
    console.log('   Considera cambiar a main antes de hacer push');
  }
} catch (error) {
  console.error('❌ Error al verificar branch:', error.message);
}

// 10. Instrucciones finales
console.log('\n🎉 ¡Preparación completada exitosamente!');
console.log('\n📋 Próximos pasos:');
console.log('   1. Revisa el commit creado: git log --oneline -1');
console.log('   2. Haz push a GitHub: git push origin main');
console.log('   3. Verifica el deployment en Render');
console.log('   4. Prueba la funcionalidad del calendario');

console.log('\n📝 Resumen de cambios:');
console.log('   ✅ Componente checkbox.tsx creado');
console.log('   ✅ Configuración de esbuild actualizada');
console.log('   ✅ Dependencias verificadas');
console.log('   ✅ Build del servidor exitoso');
console.log('   ✅ Commit preparado');

console.log('\n🚀 ¡El proyecto está listo para ser actualizado en GitHub!'); 