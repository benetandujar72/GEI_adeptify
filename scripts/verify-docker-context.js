#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== Verificando contexto de Docker ===\n');

// Verificar si los archivos existen localmente
const filesToCheck = [
  'client/src/pages/adeptify/Competencies.tsx',
  'client/src/pages/adeptify/Settings.tsx',
  'client/src/pages/adeptify/Statistics.tsx',
  'client/src/pages/adeptify/Evaluations.tsx',
  'client/src/pages/adeptify/Criteria.tsx',
  'client/src/pages/assistatut/Guards.tsx',
  'client/src/pages/assistatut/Attendance.tsx'
];

console.log('=== Verificando archivos localmente ===');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✓' : '✗'} ${file} ${exists ? 'EXISTE' : 'NO EXISTE'}`);
});

// Verificar .dockerignore
console.log('\n=== Verificando .dockerignore ===');
if (fs.existsSync('.dockerignore')) {
  const dockerignore = fs.readFileSync('.dockerignore', 'utf8');
  console.log('Contenido de .dockerignore:');
  console.log(dockerignore);
  
  // Verificar si algún patrón podría estar excluyendo nuestros archivos
  const patterns = dockerignore.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('\nPatrones activos en .dockerignore:');
  patterns.forEach(pattern => {
    console.log(`- ${pattern}`);
  });
} else {
  console.log('No existe .dockerignore');
}

// Verificar estructura de directorios
console.log('\n=== Verificando estructura de directorios ===');
const checkDir = (dir) => {
  if (fs.existsSync(dir)) {
    const items = fs.readdirSync(dir);
    console.log(`${dir}: ${items.length} items`);
    return items;
  } else {
    console.log(`${dir}: NO EXISTE`);
    return [];
  }
};

checkDir('client');
checkDir('client/src');
checkDir('client/src/pages');
checkDir('client/src/pages/adeptify');
checkDir('client/src/pages/assistatut');

// Intentar un build de Docker con --progress=plain para ver más detalles
console.log('\n=== Intentando build de Docker con más detalles ===');
try {
  console.log('Ejecutando: docker build --progress=plain --no-cache .');
  const output = execSync('docker build --progress=plain --no-cache .', { 
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  console.log('Build exitoso!');
} catch (error) {
  console.log('Error en build de Docker:');
  console.log(error.stdout || error.message);
} 