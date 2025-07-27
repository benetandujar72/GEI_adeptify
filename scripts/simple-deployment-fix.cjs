#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Solucionando problemas de despliegue...');

// Verificar archivos críticos
console.log('\n📋 Verificando archivos críticos...');
const criticalFiles = [
  'package.json',
  'server/index.ts',
  'client/index.html',
  'docker-compose.yml',
  'Dockerfile'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} NO existe`);
  }
});

// Verificar estructura de directorios
console.log('\n📁 Verificando estructura de directorios...');
const criticalDirs = [
  'server',
  'client',
  'shared',
  'scripts'
];

criticalDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`✅ ${dir}/ existe`);
  } else {
    console.log(`❌ ${dir}/ NO existe`);
  }
});

// Verificar variables de entorno
console.log('\n🌍 Verificando variables de entorno...');
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} configurada`);
  } else {
    console.log(`❌ ${envVar} NO configurada`);
  }
});

// Verificar build
console.log('\n🔨 Verificando build...');
const buildFiles = [
  'dist/index.js',
  'client/dist'
];

buildFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} NO existe`);
  }
});

// Crear .gitignore si no existe
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

console.log('\n🎉 Diagnóstico completado'); 