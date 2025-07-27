#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 Verificando problema de cierre prematuro...');

// Verificar archivos críticos
const files = [
  'server/index.ts',
  'server/database/init.ts',
  'package.json',
  'Dockerfile'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} NO existe`);
  }
});

// Verificar si hay process.exit problemáticos
if (fs.existsSync('server/index.ts')) {
  const content = fs.readFileSync('server/index.ts', 'utf8');
  const exitCount = (content.match(/process\.exit\(/g) || []).length;
  console.log(`📊 Encontrados ${exitCount} process.exit() en server/index.ts`);
}

// Verificar package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('📦 Dependencias críticas:');
  ['express', 'postgres', 'drizzle-orm'].forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep}: NO instalado`);
    }
  });
}

console.log('\n💡 Posibles causas del cierre prematuro:');
console.log('1. Error en la conexión a la base de datos');
console.log('2. Timeout en la inicialización de servicios');
console.log('3. Error en la configuración de SSL');
console.log('4. Falta de manejo de errores en la inicialización');

console.log('\n🔧 Soluciones recomendadas:');
console.log('1. Verificar DATABASE_URL en las variables de entorno');
console.log('2. Aumentar timeouts en la inicialización');
console.log('3. Agregar más logging para identificar el punto exacto del fallo');
console.log('4. Verificar que la base de datos esté accesible desde Render'); 