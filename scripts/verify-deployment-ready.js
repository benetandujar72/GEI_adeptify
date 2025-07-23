#!/usr/bin/env node

/**
 * Script para verificar que la aplicación esté lista para despliegue
 * Verifica build, dependencias, configuración y archivos críticos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 ===== VERIFICACIÓN DE DESPLIEGUE =====');
console.log(`📂 Directorio del proyecto: ${projectRoot}`);

// Función para verificar si existe un archivo
function checkFile(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

// Función para verificar si existe un directorio
function checkDirectory(dirPath, description) {
  const fullPath = path.join(projectRoot, dirPath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
}

// Función para verificar el contenido de un archivo
function checkFileContent(filePath, description, requiredContent) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${description}: ${filePath} (no existe)`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasContent = requiredContent.some(text => content.includes(text));
  console.log(`${hasContent ? '✅' : '❌'} ${description}: ${filePath}`);
  return hasContent;
}

let allChecksPassed = true;

console.log('\n📋 ===== ARCHIVOS DE CONFIGURACIÓN =====');
allChecksPassed &= checkFile('package.json', 'Package.json');
allChecksPassed &= checkFile('Dockerfile', 'Dockerfile');
allChecksPassed &= checkFile('docker-compose.yml', 'Docker Compose');
allChecksPassed &= checkFile('env.example', 'Archivo de ejemplo de variables de entorno');
allChecksPassed &= checkFile('client/vite.config.ts', 'Configuración de Vite');
allChecksPassed &= checkFile('esbuild.config.js', 'Configuración de esbuild');

console.log('\n📦 ===== DEPENDENCIAS Y BUILD =====');
allChecksPassed &= checkDirectory('node_modules', 'Node modules instalados');
allChecksPassed &= checkDirectory('client/node_modules', 'Node modules del cliente');

// Verificar que el build funcione
console.log('\n🔨 ===== VERIFICACIÓN DE BUILD =====');
try {
  console.log('🔄 Ejecutando build...');
  const { execSync } = await import('child_process');
  execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
  console.log('✅ Build completado exitosamente');
} catch (error) {
  console.log('❌ Error en build:', error.message);
  allChecksPassed = false;
}

console.log('\n📁 ===== ARCHIVOS DE BUILD =====');
allChecksPassed &= checkDirectory('dist', 'Directorio de build del servidor');
allChecksPassed &= checkDirectory('dist/client', 'Directorio de build del cliente');
allChecksPassed &= checkFile('dist/index.js', 'Servidor compilado');
allChecksPassed &= checkFile('dist/client/index.html', 'HTML del cliente');

console.log('\n🎨 ===== COMPONENTES UI =====');
allChecksPassed &= checkFile('client/src/components/ui/tooltip.tsx', 'Componente Tooltip');
allChecksPassed &= checkFile('client/src/components/ui/avatar.tsx', 'Componente Avatar');
allChecksPassed &= checkFile('client/src/components/ui/dropdown-menu.tsx', 'Componente DropdownMenu');
allChecksPassed &= checkFile('client/src/components/ui/button.tsx', 'Componente Button');
allChecksPassed &= checkFile('client/src/components/ui/toaster.tsx', 'Componente Toaster');

console.log('\n🔧 ===== UTILIDADES Y LIBRERÍAS =====');
allChecksPassed &= checkFile('client/src/lib/utils.ts', 'Utilidades del cliente');
allChecksPassed &= checkFile('client/src/lib/queryClient.ts', 'Cliente de React Query');

console.log('\n🌐 ===== COMPONENTES PRINCIPALES =====');
allChecksPassed &= checkFile('client/src/App.tsx', 'Componente principal App');
allChecksPassed &= checkFile('client/src/components/Header.tsx', 'Componente Header');
allChecksPassed &= checkFile('client/src/components/Sidebar.tsx', 'Componente Sidebar');
allChecksPassed &= checkFile('client/src/components/UserMenu.tsx', 'Componente UserMenu');

console.log('\n🔐 ===== AUTENTICACIÓN Y CONTEXTO =====');
allChecksPassed &= checkFile('client/src/context/AuthContext.tsx', 'Contexto de autenticación');
allChecksPassed &= checkFile('client/src/context/ThemeContext.tsx', 'Contexto de tema');

console.log('\n📊 ===== PÁGINAS Y MÓDULOS =====');
allChecksPassed &= checkFile('client/src/pages/LoginPage.tsx', 'Página de login');
allChecksPassed &= checkFile('client/src/pages/DashboardPage.tsx', 'Página de dashboard');
allChecksPassed &= checkDirectory('client/src/pages/evaluation', 'Módulo de evaluación');
allChecksPassed &= checkDirectory('client/src/pages/attendance', 'Módulo de asistencia');
allChecksPassed &= checkDirectory('client/src/pages/guard', 'Módulo de guardias');

console.log('\n⚙️ ===== SERVIDOR Y API =====');
allChecksPassed &= checkFile('server/index.ts', 'Servidor principal');
allChecksPassed &= checkDirectory('server/routes', 'Rutas del servidor');
allChecksPassed &= checkDirectory('server/services', 'Servicios del servidor');
allChecksPassed &= checkDirectory('server/database', 'Base de datos');

console.log('\n📚 ===== DOCUMENTACIÓN =====');
allChecksPassed &= checkFile('README.md', 'README principal');
allChecksPassed &= checkFile('FUNCIONALIDADES_COMPLETAS_ADEPTIFY_ASSISTATUT.md', 'Documentación de funcionalidades');
allChecksPassed &= checkFile('ESTILOS_ADEPTIFY_IMPLEMENTADOS.md', 'Documentación de estilos');

console.log('\n🚀 ===== SCRIPTS DE DESPLIEGUE =====');
allChecksPassed &= checkFile('deploy.sh', 'Script de despliegue');
allChecksPassed &= checkFile('scripts/verify-deployment-ready.js', 'Script de verificación');

// Verificar configuración de Docker
console.log('\n🐳 ===== CONFIGURACIÓN DE DOCKER =====');
allChecksPassed &= checkFileContent('Dockerfile', 'Dockerfile con configuración correcta', [
  'FROM node:18-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci --only=production',
  'COPY . .',
  'RUN npm run build',
  'EXPOSE 3000',
  'CMD ["npm", "start"]'
]);

// Verificar variables de entorno
console.log('\n🔑 ===== VARIABLES DE ENTORNO =====');
allChecksPassed &= checkFileContent('env.example', 'Variables de entorno de ejemplo', [
  'DATABASE_URL=',
  'SESSION_SECRET=',
  'NODE_ENV=',
  'PORT='
]);

// Resultado final
console.log('\n🎯 ===== RESULTADO FINAL =====');
if (allChecksPassed) {
  console.log('✅ ¡TODAS LAS VERIFICACIONES PASARON!');
  console.log('🚀 La aplicación está lista para despliegue');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Configurar variables de entorno en producción');
  console.log('2. Ejecutar: docker build -t gei-unified-platform .');
  console.log('3. Ejecutar: docker run -p 3000:3000 gei-unified-platform');
  console.log('4. O usar el script: ./deploy.sh');
} else {
  console.log('❌ ALGUNAS VERIFICACIONES FALLARON');
  console.log('🔧 Revisa los errores arriba y corrígelos antes del despliegue');
  process.exit(1);
}

console.log('\n📊 ===== ESTADÍSTICAS DEL PROYECTO =====');
try {
  const { execSync } = await import('child_process');
  
  // Contar archivos TypeScript
  const tsFiles = execSync('find . -name "*.ts" -o -name "*.tsx" | wc -l', { cwd: projectRoot, stdio: 'pipe' }).toString().trim();
  console.log(`📄 Archivos TypeScript: ${tsFiles}`);
  
  // Tamaño del build
  const buildSize = execSync('du -sh dist', { cwd: projectRoot, stdio: 'pipe' }).toString().trim();
  console.log(`📦 Tamaño del build: ${buildSize}`);
  
  // Dependencias
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const depCount = Object.keys(packageJson.dependencies || {}).length;
  const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
  console.log(`📦 Dependencias: ${depCount} (prod) + ${devDepCount} (dev)`);
  
} catch (error) {
  console.log('⚠️ No se pudieron obtener estadísticas adicionales');
}

console.log('\n✨ ===== VERIFICACIÓN COMPLETADA ====='); 