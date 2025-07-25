#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando que el archivo checkbox.tsx existe...');

const checkboxPath = path.join(__dirname, '../client/src/components/ui/checkbox.tsx');

if (!fs.existsSync(checkboxPath)) {
  console.error('❌ Error: El archivo checkbox.tsx no existe');
  process.exit(1);
}

console.log('✅ Archivo checkbox.tsx encontrado');

console.log('🔍 Verificando contenido del archivo checkbox.tsx...');
const checkboxContent = fs.readFileSync(checkboxPath, 'utf8');

if (!checkboxContent.includes('@radix-ui/react-checkbox')) {
  console.error('❌ Error: El archivo checkbox.tsx no importa @radix-ui/react-checkbox');
  process.exit(1);
}

if (!checkboxContent.includes('export { Checkbox }')) {
  console.error('❌ Error: El archivo checkbox.tsx no exporta Checkbox');
  process.exit(1);
}

console.log('✅ Contenido del archivo checkbox.tsx es correcto');

console.log('🔍 Verificando que @radix-ui/react-checkbox está en package.json...');
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies['@radix-ui/react-checkbox']) {
  console.error('❌ Error: @radix-ui/react-checkbox no está en las dependencias');
  process.exit(1);
}

console.log('✅ @radix-ui/react-checkbox está en las dependencias');

console.log('🔍 Verificando que la función cn está disponible...');
const utilsPath = path.join(__dirname, '../client/src/lib/utils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

if (!utilsContent.includes('export function cn')) {
  console.error('❌ Error: La función cn no está exportada en utils.ts');
  process.exit(1);
}

console.log('✅ Función cn está disponible');

console.log('🔍 Verificando que EventForm.tsx importa checkbox correctamente...');
const eventFormPath = path.join(__dirname, '../client/src/components/Calendar/EventForm.tsx');
const eventFormContent = fs.readFileSync(eventFormPath, 'utf8');

if (!eventFormContent.includes("import { Checkbox } from '@/components/ui/checkbox'")) {
  console.error('❌ Error: EventForm.tsx no importa Checkbox correctamente');
  process.exit(1);
}

console.log('✅ EventForm.tsx importa Checkbox correctamente');

console.log('🔍 Verificando que CalendarFilters.tsx también importa checkbox...');
const calendarFiltersPath = path.join(__dirname, '../client/src/components/Calendar/CalendarFilters.tsx');
const calendarFiltersContent = fs.readFileSync(calendarFiltersPath, 'utf8');

if (!calendarFiltersContent.includes("import { Checkbox } from '@/components/ui/checkbox'")) {
  console.error('❌ Error: CalendarFilters.tsx no importa Checkbox correctamente');
  process.exit(1);
}

console.log('✅ CalendarFilters.tsx importa Checkbox correctamente');

console.log('🚀 Iniciando prueba de build del cliente...');

try {
  // Cambiar al directorio del cliente
  process.chdir(path.join(__dirname, '../client'));
  
  // Ejecutar el build
  execSync('npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('✅ Build del cliente completado exitosamente');
  
} catch (error) {
  console.error('❌ Error durante el build del cliente:', error.message);
  process.exit(1);
}

console.log('🎉 ¡Todas las verificaciones pasaron! El problema del checkbox ha sido resuelto.'); 