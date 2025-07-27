#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Solucionando problemas de despliegue...');

// Función para verificar archivos críticos
function checkCriticalFiles() {
  console.log('\n📋 Verificando archivos críticos...');
  
  const criticalFiles = [
    'package.json',
    'server/index.ts',
    'client/index.html',
    'docker-compose.yml',
    'Dockerfile',
    'render.yaml'
  ];
  
  let allFilesExist = true;
  
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} existe`);
    } else {
      console.log(`❌ ${file} NO existe`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Función para verificar estructura de directorios
function checkDirectoryStructure() {
  console.log('\n📁 Verificando estructura de directorios...');
  
  const criticalDirs = [
    'server',
    'client',
    'shared',
    'scripts',
    'drizzle'
  ];
  
  let allDirsExist = true;
  
  criticalDirs.forEach(dir => {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      console.log(`✅ ${dir}/ existe`);
    } else {
      console.log(`❌ ${dir}/ NO existe`);
      allDirsExist = false;
    }
  });
  
  return allDirsExist;
}

// Función para verificar variables de entorno
function checkEnvironmentVariables() {
  console.log('\n🌍 Verificando variables de entorno...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'PORT'
  ];
  
  let allEnvVarsSet = true;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} configurada`);
    } else {
      console.log(`❌ ${envVar} NO configurada`);
      allEnvVarsSet = false;
    }
  });
  
  return allEnvVarsSet;
}

// Función para verificar build
function checkBuild() {
  console.log('\n🔨 Verificando build...');
  
  const buildFiles = [
    'dist/index.js',
    'client/dist'
  ];
  
  let buildExists = false;
  
  buildFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} existe`);
      buildExists = true;
    } else {
      console.log(`❌ ${file} NO existe`);
    }
  });
  
  return buildExists;
}

// Función para crear .gitignore si no existe
function createGitignore() {
  console.log('\n📝 Verificando .gitignore...');
  
  if (!fs.existsSync('.gitignore')) {
    console.log('📝 Creando .gitignore...');
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp

# Database files
*.db
*.sqlite
*.sqlite3

# Docker
.dockerignore

# Render
.render-buildlogs/
`;
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✅ .gitignore creado');
  } else {
    console.log('✅ .gitignore ya existe');
  }
}

// Función para limpiar archivos temporales
function cleanTempFiles() {
  console.log('\n🧹 Limpiando archivos temporales...');
  
  const tempPatterns = [
    '*.tmp',
    '*.temp',
    '*.log',
    'node_modules/.cache'
  ];
  
  // En Windows, no podemos usar glob patterns fácilmente
  // Solo verificamos algunos archivos comunes
  const tempFiles = [
    'npm-debug.log',
    'yarn-error.log',
    'package-lock.json.tmp'
  ];
  
  tempFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`🗑️ Eliminado: ${file}`);
      } catch (error) {
        console.log(`⚠️ No se pudo eliminar: ${file}`);
      }
    }
  });
}

// Función principal
async function fixDeploymentIssues() {
  try {
    console.log('🚀 Iniciando diagnóstico y reparación...');
    
    // Verificar archivos críticos
    const criticalFilesOk = checkCriticalFiles();
    
    // Verificar estructura de directorios
    const directoryStructureOk = checkDirectoryStructure();
    
    // Verificar variables de entorno
    const envVarsOk = checkEnvironmentVariables();
    
    // Verificar build
    const buildOk = checkBuild();
    
    // Crear .gitignore si es necesario
    createGitignore();
    
    // Limpiar archivos temporales
    cleanTempFiles();
    
    // Resumen
    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
    console.log(`📋 Archivos críticos: ${criticalFilesOk ? '✅ OK' : '❌ PROBLEMAS'}`);
    console.log(`📁 Estructura de directorios: ${directoryStructureOk ? '✅ OK' : '❌ PROBLEMAS'}`);
    console.log(`🌍 Variables de entorno: ${envVarsOk ? '✅ OK' : '❌ PROBLEMAS'}`);
    console.log(`🔨 Build: ${buildOk ? '✅ OK' : '❌ PROBLEMAS'}`);
    
    if (criticalFilesOk && directoryStructureOk && envVarsOk && buildOk) {
      console.log('\n🎉 ¡Todo está listo para el despliegue!');
    } else {
      console.log('\n⚠️ Se encontraron problemas que deben resolverse antes del despliegue');
    }
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error.message);
  }
}

// Ejecutar reparación
fixDeploymentIssues().then(() => {
  console.log('\n✅ Proceso de reparación completado');
}).catch((error) => {
  console.error('❌ Error en el proceso de reparación:', error.message);
}); 