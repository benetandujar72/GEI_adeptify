#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Solucionando problema de cierre prematuro de la aplicación...');

// Verificar el archivo principal del servidor
console.log('\n📋 Verificando server/index.ts...');
if (fs.existsSync('server/index.ts')) {
  console.log('✅ server/index.ts existe');
  
  // Leer el archivo para verificar si hay problemas
  try {
    const content = fs.readFileSync('server/index.ts', 'utf8');
    
    // Verificar si hay process.exit() problemáticos
    const exitMatches = content.match(/process\.exit\(/g);
    if (exitMatches) {
      console.log(`⚠️ Encontrados ${exitMatches.length} process.exit() en el código`);
    }
    
    // Verificar si hay manejo de señales
    if (content.includes('SIGTERM') || content.includes('SIGINT')) {
      console.log('✅ Manejo de señales detectado');
    } else {
      console.log('⚠️ No se detectó manejo de señales');
    }
    
  } catch (error) {
    console.log('❌ Error al leer server/index.ts:', error.message);
  }
} else {
  console.log('❌ server/index.ts NO existe');
}

// Verificar el archivo de configuración de la base de datos
console.log('\n📋 Verificando server/database/init.ts...');
if (fs.existsSync('server/database/init.ts')) {
  console.log('✅ server/database/init.ts existe');
  
  try {
    const content = fs.readFileSync('server/database/init.ts', 'utf8');
    
    // Verificar configuración de SSL para producción
    if (content.includes('ssl: process.env.NODE_ENV === \'production\'')) {
      console.log('✅ Configuración SSL para producción detectada');
    } else {
      console.log('⚠️ Configuración SSL para producción NO detectada');
    }
    
    // Verificar timeout de conexión
    if (content.includes('connect_timeout')) {
      console.log('✅ Timeout de conexión configurado');
    } else {
      console.log('⚠️ Timeout de conexión NO configurado');
    }
    
  } catch (error) {
    console.log('❌ Error al leer server/database/init.ts:', error.message);
  }
} else {
  console.log('❌ server/database/init.ts NO existe');
}

// Verificar package.json
console.log('\n📋 Verificando package.json...');
if (fs.existsSync('package.json')) {
  console.log('✅ package.json existe');
  
  try {
    const content = fs.readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(content);
    
    // Verificar scripts
    if (packageJson.scripts) {
      console.log('📝 Scripts disponibles:');
      Object.keys(packageJson.scripts).forEach(script => {
        console.log(`  - ${script}: ${packageJson.scripts[script]}`);
      });
    }
    
    // Verificar dependencias
    if (packageJson.dependencies) {
      const criticalDeps = ['express', 'postgres', 'drizzle-orm'];
      criticalDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
          console.log(`✅ ${dep} instalado (${packageJson.dependencies[dep]})`);
        } else {
          console.log(`❌ ${dep} NO instalado`);
        }
      });
    }
    
  } catch (error) {
    console.log('❌ Error al leer package.json:', error.message);
  }
} else {
  console.log('❌ package.json NO existe');
}

// Verificar Dockerfile
console.log('\n📋 Verificando Dockerfile...');
if (fs.existsSync('Dockerfile')) {
  console.log('✅ Dockerfile existe');
  
  try {
    const content = fs.readFileSync('Dockerfile', 'utf8');
    
    // Verificar si hay problemas comunes
    if (content.includes('CMD') || content.includes('ENTRYPOINT')) {
      console.log('✅ Comando de inicio configurado');
    } else {
      console.log('⚠️ Comando de inicio NO configurado');
    }
    
    if (content.includes('EXPOSE')) {
      console.log('✅ Puerto expuesto');
    } else {
      console.log('⚠️ Puerto NO expuesto');
    }
    
  } catch (error) {
    console.log('❌ Error al leer Dockerfile:', error.message);
  }
} else {
  console.log('❌ Dockerfile NO existe');
}

// Crear un script de inicio mejorado
console.log('\n📝 Creando script de inicio mejorado...');
const startScript = `#!/usr/bin/env node

import { spawn } from 'child_process';
import { logger } from './server/utils/logger.js';

console.log('🚀 Iniciando aplicación con manejo mejorado de errores...');

// Función para iniciar el servidor
function startServer() {
  console.log('🔄 Iniciando servidor...');
  
  const server = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
  });
  
  server.on('error', (error) => {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    console.log(\`🛑 Servidor terminado con código: \${code}\`);
    if (code !== 0) {
      console.log('⚠️ Servidor terminó con error, reintentando en 5 segundos...');
      setTimeout(startServer, 5000);
    }
  });
  
  // Manejo de señales
  process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM');
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT');
    server.kill('SIGINT');
  });
}

// Iniciar servidor
startServer();
`;

try {
  fs.writeFileSync('scripts/start-improved.js', startScript);
  console.log('✅ Script de inicio mejorado creado: scripts/start-improved.js');
} catch (error) {
  console.log('❌ Error al crear script de inicio:', error.message);
}

console.log('\n🎉 Análisis completado');
console.log('\n💡 Recomendaciones:');
console.log('1. Verifica que DATABASE_URL esté configurada correctamente');
console.log('2. Asegúrate de que la base de datos esté accesible');
console.log('3. Revisa los logs de la aplicación para errores específicos');
console.log('4. Considera usar el script de inicio mejorado'); 