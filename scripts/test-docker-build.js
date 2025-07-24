#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🐳 Probando build de Docker...');

try {
  // Verificar que Dockerfile existe
  if (!fs.existsSync('Dockerfile')) {
    console.log('❌ Dockerfile no existe');
    process.exit(1);
  }

  console.log('✅ Dockerfile encontrado');

  // Limpiar builds anteriores
  console.log('🧹 Limpiando builds anteriores...');
  try {
    execSync('docker rmi gei-unified-platform:test --force', { stdio: 'pipe' });
  } catch (error) {
    // Ignorar errores si la imagen no existe
  }

  // Construir la imagen de Docker
  console.log('🔨 Construyendo imagen de Docker...');
  execSync('docker build -t gei-unified-platform:test .', { stdio: 'inherit' });

  console.log('✅ Build de Docker completado exitosamente');

  // Verificar que la imagen se creó
  console.log('🔍 Verificando imagen creada...');
  const result = execSync('docker images gei-unified-platform:test', { encoding: 'utf8' });
  console.log(result);

  // Probar que el contenedor puede iniciarse
  console.log('🚀 Probando inicio del contenedor...');
  const containerId = execSync('docker run -d --name test-container gei-unified-platform:test', { encoding: 'utf8' }).trim();
  
  // Esperar un momento para que el contenedor se inicie
  console.log('⏳ Esperando que el contenedor se inicie...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verificar el estado del contenedor
  const containerStatus = execSync(`docker ps -a --filter "id=${containerId}" --format "table {{.Names}}\t{{.Status}}"`, { encoding: 'utf8' });
  console.log('📊 Estado del contenedor:');
  console.log(containerStatus);

  // Limpiar el contenedor de prueba
  console.log('🧹 Limpiando contenedor de prueba...');
  execSync(`docker rm -f ${containerId}`, { stdio: 'pipe' });

  console.log('🎉 Todas las pruebas de Docker pasaron exitosamente!');

} catch (error) {
  console.error('❌ Error durante las pruebas de Docker:', error.message);
  
  // Limpiar en caso de error
  try {
    execSync('docker rm -f test-container', { stdio: 'pipe' });
  } catch (cleanupError) {
    // Ignorar errores de limpieza
  }
  
  process.exit(1);
} 