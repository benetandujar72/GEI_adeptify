#!/usr/bin/env node

/**
 * Verificación rápida de despliegue - Solo verifica lo esencial
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 ===== VERIFICACIÓN RÁPIDA DE DESPLIEGUE =====');

let allChecksPassed = true;

// Verificar archivos críticos
const criticalFiles = [
  'package.json',
  'Dockerfile',
  'client/vite.config.ts',
  'esbuild.config.js',
  'server/index.ts',
  'client/src/App.tsx',
  'env.example'
];

console.log('\n📋 Verificando archivos críticos...');
for (const file of criticalFiles) {
  const exists = fs.existsSync(path.join(projectRoot, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  allChecksPassed &= exists;
}

// Verificar directorios críticos
const criticalDirs = [
  'node_modules',
  'dist',
  'dist/client',
  'client/src/components/ui',
  'server/routes',
  'server/services'
];

console.log('\n📁 Verificando directorios críticos...');
for (const dir of criticalDirs) {
  const exists = fs.existsSync(path.join(projectRoot, dir));
  console.log(`${exists ? '✅' : '❌'} ${dir}`);
  allChecksPassed &= exists;
}

// Verificar componentes UI críticos
const uiComponents = [
  'client/src/components/ui/tooltip.tsx',
  'client/src/components/ui/avatar.tsx',
  'client/src/components/ui/dropdown-menu.tsx',
  'client/src/components/ui/button.tsx'
];

console.log('\n🎨 Verificando componentes UI...');
for (const component of uiComponents) {
  const exists = fs.existsSync(path.join(projectRoot, component));
  console.log(`${exists ? '✅' : '❌'} ${component.split('/').pop()}`);
  allChecksPassed &= exists;
}

// Verificar build
console.log('\n🔨 Verificando build...');
try {
  const { execSync } = await import('child_process');
  execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
  console.log('✅ Build completado exitosamente');
} catch (error) {
  console.log('❌ Error en build:', error.message);
  allChecksPassed = false;
}

// Resultado final
console.log('\n🎯 ===== RESULTADO =====');
if (allChecksPassed) {
  console.log('✅ ¡DESPLIEGUE LISTO!');
  console.log('\n📋 Para desplegar:');
  console.log('1. docker build -t gei-unified-platform .');
  console.log('2. docker run -p 3000:3000 gei-unified-platform');
  console.log('3. O usar: ./deploy.sh');
} else {
  console.log('❌ Hay problemas que resolver antes del despliegue');
  process.exit(1);
}

console.log('\n✨ Verificación completada'); 