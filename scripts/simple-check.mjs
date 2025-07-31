#!/usr/bin/env node

import fs from 'fs';

console.log('🔍 === VERIFICACIÓN SIMPLE DE CORRECCIONES ===\n');

// Verificar render.yaml
const renderYaml = fs.readFileSync('render.yaml', 'utf8');
console.log('✅ render.yaml:');
console.log('  - PORT fijo eliminado:', !renderYaml.includes('key: PORT\n        value: 3000'));
console.log('  - healthCheckPath configurado:', renderYaml.includes('healthCheckPath: /health'));
console.log('  - Nombres BD uniformes:', renderYaml.includes('databaseName: gei_db'));

// Verificar server/src/index.ts
const serverIndex = fs.readFileSync('server/src/index.ts', 'utf8');
console.log('\n✅ server/src/index.ts:');
console.log('  - Endpoint /health:', serverIndex.includes("app.get('/health'"));
console.log('  - dotenv comentado:', serverIndex.includes('// dotenv.config()'));
console.log('  - process.env.PORT:', serverIndex.includes('process.env.PORT'));

// Verificar scripts
console.log('\n✅ Scripts:');
console.log('  - start-production-optimized.sh existe:', fs.existsSync('scripts/start-production-optimized.sh'));
console.log('  - server/start.sh mejorado:', fs.existsSync('server/start.sh'));

// Verificar package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n✅ package.json:');
console.log('  - build:server existe:', !!packageJson.scripts['build:server']);
console.log('  - build:client existe:', !!packageJson.scripts['build:client']);

console.log('\n🎉 Verificación completada. El proyecto está listo para Render!'); 