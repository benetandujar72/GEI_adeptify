#!/usr/bin/env node

/**
 * Script de verificación de correcciones de despliegue en Render
 * Verifica que todas las correcciones implementadas estén correctas
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 === VERIFICANDO CORRECCIONES DE DESPLIEGUE ===\n');

const checks = [];
let passedChecks = 0;
let totalChecks = 0;

function check(description, condition) {
  totalChecks++;
  if (condition) {
    console.log(`✅ ${description}`);
    passedChecks++;
  } else {
    console.log(`❌ ${description}`);
  }
}

// 1. Verificar que render.yaml no tenga PORT fijo
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  check(
    'render.yaml no tiene PORT fijo (usa process.env.PORT)',
    !renderYaml.includes('key: PORT\n        value: 3000')
  );
} catch (error) {
  check('render.yaml existe y es legible', false);
}

// 2. Verificar que el endpoint /health esté configurado
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  check(
    'healthCheckPath está configurado en render.yaml',
    renderYaml.includes('healthCheckPath: /health')
  );
} catch (error) {
  check('healthCheckPath configurado', false);
}

// 3. Verificar que el endpoint /health esté implementado
try {
  const serverIndex = fs.readFileSync('server/src/index.ts', 'utf8');
  check(
    'Endpoint /health implementado en server/src/index.ts',
    serverIndex.includes("app.get('/health'")
  );
} catch (error) {
  check('Endpoint /health implementado', false);
}

// 4. Verificar que no se use dotenv en server/src/index.ts
try {
  const serverIndex = fs.readFileSync('server/src/index.ts', 'utf8');
  check(
    'No se usa dotenv en server/src/index.ts',
    !serverIndex.includes('dotenv.config()') && serverIndex.includes('// NO usar dotenv')
  );
} catch (error) {
  check('dotenv no usado en server', false);
}

// 5. Verificar que drizzle.config.ts no use dotenv
try {
  const drizzleConfig = fs.readFileSync('drizzle.config.ts', 'utf8');
  check(
    'drizzle.config.ts no usa dotenv',
    !drizzleConfig.includes('dotenv.config()') && drizzleConfig.includes('// NO usar dotenv')
  );
} catch (error) {
  check('drizzle.config.ts sin dotenv', false);
}

// 6. Verificar que gateway/index.ts no use dotenv
try {
  const gatewayIndex = fs.readFileSync('gateway/index.ts', 'utf8');
  check(
    'gateway/index.ts no usa dotenv',
    !gatewayIndex.includes('dotenv.config()') && gatewayIndex.includes('// NO usar dotenv')
  );
} catch (error) {
  check('gateway sin dotenv', false);
}

// 7. Verificar que los scripts de build existan en package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check(
    'Scripts build:server y build:client existen',
    packageJson.scripts['build:server'] && packageJson.scripts['build:client']
  );
} catch (error) {
  check('Scripts de build configurados', false);
}

// 8. Verificar que el script de inicio optimizado existe
check(
  'Script start-production-optimized.sh existe',
  fs.existsSync('scripts/start-production-optimized.sh')
);

// 9. Verificar que server/start.sh esté mejorado
try {
  const startScript = fs.readFileSync('server/start.sh', 'utf8');
  check(
    'server/start.sh incluye verificaciones mejoradas',
    startScript.includes('--trace-warnings') && startScript.includes('DATABASE_URL')
  );
} catch (error) {
  check('server/start.sh mejorado', false);
}

// 10. Verificar que la estructura de directorios sea correcta
check(
  'server/src/index.ts existe',
  fs.existsSync('server/src/index.ts')
);

check(
  'dist/ se creará durante el build',
  fs.existsSync('esbuild.config.js')
);

// 11. Verificar nombres de base de datos uniformes
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  check(
    'Nombres de base de datos uniformes (gei_db, gei_db_user)',
    renderYaml.includes('databaseName: gei_db') && renderYaml.includes('user: gei_db_user')
  );
} catch (error) {
  check('Nombres de BD uniformes', false);
}

// 12. Verificar que las variables críticas estén marcadas como sync: false
try {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  const criticalVars = ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
  const allCriticalVarsMarked = criticalVars.every(varName => 
    renderYaml.includes(`key: ${varName}\n        sync: false`)
  );
  check(
    'Variables críticas marcadas como sync: false',
    allCriticalVarsMarked
  );
} catch (error) {
  check('Variables críticas configuradas', false);
}

console.log('\n📊 === RESUMEN DE VERIFICACIÓN ===');
console.log(`✅ Checks pasados: ${passedChecks}/${totalChecks}`);
console.log(`📈 Porcentaje de éxito: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 ¡Todas las correcciones están implementadas correctamente!');
  console.log('🚀 El proyecto está listo para el despliegue en Render.');
} else {
  console.log('\n⚠️  Algunas correcciones necesitan atención.');
  console.log('🔧 Revisa los checks fallidos y corrígelos antes del despliegue.');
}

console.log('\n📋 === RECOMENDACIONES ADICIONALES ===');
console.log('1. Configura todas las variables de entorno en el dashboard de Render');
console.log('2. Verifica que la base de datos PostgreSQL esté creada');
console.log('3. Prueba el endpoint /health después del despliegue');
console.log('4. Monitorea los logs durante el primer despliegue');

process.exit(passedChecks === totalChecks ? 0 : 1); 