import fs from 'fs';
import path from 'path';

const microservices = [
  'analytics-service',
  'communication-service',
  'course-service',
  'llm-gateway',
  'mcp-orchestrator',
  'mcp-servers',
  'resource-service',
  'student-service',
  'user-service'
];

function updateTsConfig(servicePath) {
  const tsConfigPath = path.join('microservices', servicePath, 'tsconfig.json');
  
  if (!fs.existsSync(tsConfigPath)) {
    console.log(`❌ tsconfig.json no encontrado en ${servicePath}`);
    return;
  }

  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    
    // Agregar typeRoots si no existe
    if (!tsConfig.compilerOptions.typeRoots) {
      tsConfig.compilerOptions.typeRoots = ["../../node_modules/@types", "../../types"];
    }
    
    // Agregar include para tipos globales si no existe
    if (!tsConfig.include.includes("../../types/**/*.d.ts")) {
      tsConfig.include.push("../../types/**/*.d.ts");
    }
    
    // Agregar skipLibCheck: true si no existe
    if (!tsConfig.compilerOptions.skipLibCheck) {
      tsConfig.compilerOptions.skipLibCheck = true;
    }
    
    // Escribir el archivo actualizado
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log(`✅ ${servicePath} actualizado`);
    
  } catch (error) {
    console.error(`❌ Error actualizando ${servicePath}:`, error.message);
  }
}

console.log('🔧 Actualizando tsconfig.json de microservicios...');

microservices.forEach(updateTsConfig);

console.log('✅ Proceso completado');