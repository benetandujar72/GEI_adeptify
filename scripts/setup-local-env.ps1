# Script para configurar variables de entorno locales
# Ejecutar después de instalar las dependencias

Write-Host "=== Configuración de Variables de Entorno Locales ===" -ForegroundColor Green

# Crear archivo .env para el cliente
$clientEnv = @"
# Configuración del Cliente React
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENVIRONMENT=development

# Configuración de autenticación
REACT_APP_AUTH_DOMAIN=adeptify.auth0.com
REACT_APP_AUTH_CLIENT_ID=your_auth0_client_id
REACT_APP_AUTH_AUDIENCE=https://api.adeptify.es

# Configuración de servicios externos
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
"@

$clientEnv | Out-File -FilePath "client/.env.local" -Encoding UTF8
Write-Host "✓ Archivo .env.local creado en client/" -ForegroundColor Green

# Crear archivo .env para el servidor
$serverEnv = @"
# Configuración del Servidor
NODE_ENV=development
PORT=3001
HOST=localhost

# Configuración de bases de datos
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gei_adeptify
POSTGRES_USER=adeptify_user
POSTGRES_PASSWORD=adeptify_password
POSTGRES_URL=postgresql://adeptify_user:adeptify_password@localhost:5432/gei_adeptify

# MongoDB
MONGODB_URI=mongodb://adeptify_admin:adeptify_password@localhost:27017/gei_adeptify?authSource=admin
MONGODB_DB=gei_adeptify

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# SQLite (para desarrollo)
SQLITE_DB_PATH=./database/sqlite/gei_adeptify.db

# Configuración de autenticación
JWT_SECRET=your_jwt_secret_key_here_change_in_production
AUTH0_DOMAIN=adeptify.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://api.adeptify.es

# Configuración de servicios externos
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Configuración de microservicios
AI_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
COMMUNICATION_SERVICE_URL=http://localhost:3004
COURSE_SERVICE_URL=http://localhost:3005
USER_SERVICE_URL=http://localhost:3006
RESOURCE_SERVICE_URL=http://localhost:3007
STUDENT_SERVICE_URL=http://localhost:3008

# Configuración de LLM Gateway
LLM_GATEWAY_URL=http://localhost:3009
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Configuración de MCP
MCP_ORCHESTRATOR_URL=http://localhost:3010
MCP_SERVERS_URL=http://localhost:3011

# Configuración de logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Configuración de CORS
CORS_ORIGIN=http://localhost:3000

# Configuración de rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@

$serverEnv | Out-File -FilePath "server/.env" -Encoding UTF8
Write-Host "✓ Archivo .env creado en server/" -ForegroundColor Green

# Crear archivo .env para microservicios
$microservicesEnv = @"
# Configuración común para microservicios
NODE_ENV=development
LOG_LEVEL=debug

# Bases de datos
POSTGRES_URL=postgresql://adeptify_user:adeptify_password@localhost:5432/gei_adeptify
MONGODB_URI=mongodb://adeptify_admin:adeptify_password@localhost:27017/gei_adeptify?authSource=admin
REDIS_URL=redis://localhost:6379

# Configuración de servicios
GATEWAY_URL=http://localhost:3001
AI_SERVICE_PORT=3002
ANALYTICS_SERVICE_PORT=3003
COMMUNICATION_SERVICE_PORT=3004
COURSE_SERVICE_PORT=3005
USER_SERVICE_PORT=3006
RESOURCE_SERVICE_PORT=3007
STUDENT_SERVICE_PORT=3008

# Configuración de autenticación
JWT_SECRET=your_jwt_secret_key_here_change_in_production
AUTH0_DOMAIN=adeptify.auth0.com
AUTH0_AUDIENCE=https://api.adeptify.es

# Configuración de servicios externos
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
"@

$microservicesEnv | Out-File -FilePath "microservices/.env" -Encoding UTF8
Write-Host "✓ Archivo .env creado en microservices/" -ForegroundColor Green

# Crear directorios necesarios
$directories = @(
    "database/sqlite",
    "database/mongo-init",
    "logs",
    "uploads",
    "temp"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "✓ Directorio creado: $dir" -ForegroundColor Green
    }
}

# Crear archivo de inicialización para MongoDB
$mongoInit = @"
use gei_adeptify;

// Crear colecciones iniciales
db.createCollection('users');
db.createCollection('courses');
db.createCollection('analytics');
db.createCollection('communications');

// Crear índices
db.users.createIndex({ "email": 1 }, { unique: true });
db.courses.createIndex({ "code": 1 }, { unique: true });
db.analytics.createIndex({ "timestamp": 1 });
db.communications.createIndex({ "createdAt": 1 });

print('MongoDB inicializado correctamente');
"@

$mongoInit | Out-File -FilePath "database/mongo-init/init.js" -Encoding UTF8
Write-Host "✓ Script de inicialización de MongoDB creado" -ForegroundColor Green

Write-Host "`n=== Configuración completada ===" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Edita los archivos .env con tus claves reales" -ForegroundColor White
Write-Host "2. Ejecuta: docker-compose -f docker-compose.local.yml up -d" -ForegroundColor White
Write-Host "3. Instala dependencias: npm install" -ForegroundColor White
Write-Host "4. Inicia el servidor: npm run dev" -ForegroundColor White
Write-Host "`nURLs de administración:" -ForegroundColor Yellow
Write-Host "- pgAdmin: http://localhost:5050 (admin@adeptify.es / admin123)" -ForegroundColor White
Write-Host "- MongoDB Express: http://localhost:8081 (admin / admin123)" -ForegroundColor White 