#!/usr/bin/env node

// Script para configurar las variables de entorno
import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 CONFIGURANDO VARIABLES DE ENTORNO');
console.log('====================================');

const envContent = `# Configuración de la base de datos
DATABASE_URL=postgresql://gei_db_user:pV89ToE3mgCR8BMidIvsTubt2SycbqBB@dpg-d1uvb5ur433s73f5prpg-a.frankfurt-postgres.render.com/gei_db

# Configuración del servidor
NODE_ENV=production
PORT=3000

# Configuración de seguridad
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Configuración de CORS
CORS_ORIGIN=https://gei.adeptify.es

# Configuración de logs
LOG_LEVEL=info

# Configuración de Redis (opcional)
REDIS_URL=redis://localhost:6379

# Configuración de servicios externos
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Configuración de AI/LLM (opcional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
`;

try {
  const envPath = join(__dirname, '..', '.env');
  
  if (existsSync(envPath)) {
    console.log('⚠️ El archivo .env ya existe');
    console.log('💡 Se sobrescribirá con la nueva configuración');
  }
  
  writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Archivo .env creado/actualizado exitosamente');
  console.log('📍 Ubicación:', envPath);
  
  console.log('\n🔍 VARIABLES CONFIGURADAS:');
  console.log('==========================');
  console.log('✅ DATABASE_URL - Configurada con la URL de Render');
  console.log('✅ NODE_ENV - Configurado como production');
  console.log('✅ PORT - Configurado como 3000');
  console.log('✅ Otras variables de seguridad y configuración');
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('==================');
  console.log('1. Ejecuta: npm run db:create-tables');
  console.log('2. Ejecuta: npm run db:init-simple');
  console.log('3. Ejecuta: npm run db:check-simple');
  console.log('4. Ejecuta: npm run diagnose (para verificar todo)');
  
} catch (error) {
  console.error('❌ Error al crear el archivo .env:', error.message);
  process.exit(1);
} 