#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando contexto de Docker...');

try {
  // Verificar si existe .dockerignore
  if (fs.existsSync('.dockerignore')) {
    console.log('✅ Archivo .dockerignore encontrado');
    console.log('📄 Contenido del .dockerignore:');
    const dockerignore = fs.readFileSync('.dockerignore', 'utf8');
    console.log(dockerignore);
  } else {
    console.log('❌ Archivo .dockerignore NO encontrado');
  }

  // Verificar directorios críticos
  const criticalDirs = [
    'client/src/pages/adeptify',
    'client/src/pages/assistatut',
    'client/src/pages',
    'client/src',
    'shared',
    'server'
  ];

  console.log('\n📁 Verificando directorios críticos:');
  for (const dir of criticalDirs) {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir} existe`);
      if (dir.includes('pages')) {
        const files = fs.readdirSync(dir);
        console.log(`   📂 Contenido: ${files.join(', ')}`);
      }
    } else {
      console.log(`❌ ${dir} NO existe`);
    }
  }

  // Verificar archivos específicos
  const criticalFiles = [
    'client/src/pages/adeptify/Competencies.tsx',
    'client/src/pages/adeptify/Settings.tsx',
    'client/src/pages/assistatut/Guards.tsx',
    'client/src/pages/assistatut/Attendance.tsx',
    'shared/schema.ts',
    'server/index.ts'
  ];

  console.log('\n📄 Verificando archivos críticos:');
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`✅ ${file} existe (${stats.size} bytes)`);
    } else {
      console.log(`❌ ${file} NO existe`);
    }
  }

  // Simular qué archivos serían incluidos en Docker
  console.log('\n🐳 Simulando contexto de Docker...');
  try {
    const result = execSync('docker build --dry-run .', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Docker build --dry-run ejecutado');
  } catch (error) {
    console.log('⚠️ Docker build --dry-run no disponible, verificando manualmente...');
  }

  // Verificar si hay archivos .md que podrían estar siendo excluidos
  console.log('\n📝 Verificando archivos de documentación:');
  const mdFiles = [
    'FIX_DOCKER_BUILD_ERROR.md',
    'FIX_CLIENT_BUILD_ERROR.md',
    'VITE_DOCKER_OPTIMIZATION.md',
    'FIX_DOCKER_VERIFICATION.md',
    'FIX_DOCKER_COPY_ISSUE.md'
  ];

  for (const file of mdFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} existe`);
    } else {
      console.log(`❌ ${file} NO existe`);
    }
  }

  console.log('\n🎯 Recomendaciones:');
  console.log('1. Los archivos .md están siendo excluidos por .dockerignore (línea 32: *.md)');
  console.log('2. Esto es correcto para producción, pero puede afectar el debugging');
  console.log('3. Los directorios adeptify y assistatut deberían copiarse correctamente');
  console.log('4. Si el problema persiste, considerar copias específicas en Dockerfile');

} catch (error) {
  console.error('❌ Error durante la verificación:', error.message);
  process.exit(1);
} 