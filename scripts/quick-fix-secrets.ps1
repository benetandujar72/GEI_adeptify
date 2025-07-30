# Solución rápida para eliminar secretos del historial de Git
# Esta solución es específica para el problema actual

Write-Host "🔒 Solución rápida para eliminar secretos del historial..." -ForegroundColor Green

# 1. Verificar el estado actual
Write-Host "📋 Estado actual del repositorio:" -ForegroundColor Yellow
git status

# 2. Abortar cualquier rebase en curso
Write-Host "🛑 Abortando rebase en curso..." -ForegroundColor Yellow
git rebase --abort 2>$null

# 3. Resetear al commit antes del problema
Write-Host "⏪ Reseteando al commit antes del problema..." -ForegroundColor Yellow
git reset --hard fcd70b1

# 4. Crear un nuevo commit limpio
Write-Host "📝 Creando nuevo commit limpio..." -ForegroundColor Yellow

# Eliminar el archivo production.env del tracking
git rm --cached production.env 2>$null

# Crear .env.example seguro
@"
# ============================================================================
# VARIABLES DE ENTORNO - PLANTILLA SEGURA
# ============================================================================
# Copia este archivo como .env y configura tus valores reales
# NUNCA subas archivos .env con claves reales al repositorio

DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_PORT=5432
DB_SSL=true

NODE_ENV=production
PORT=3000
HOST=0.0.0.0

SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

CORS_ORIGIN=https://gei.adeptify.es
ALLOWED_ORIGINS=https://gei.adeptify.es,https://www.gei.adeptify.es

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://gei.adeptify.es/auth/google/callback

GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_SYNC_INTERVAL=30

# APIs DE IA (CONFIGURAR SEGÚN NECESIDAD)
# GEMINI_API_KEY=your-gemini-api-key
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key

# STRIPE (OPCIONAL)
# STRIPE_SECRET_KEY=your-stripe-secret-key
# STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
# STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# EMAIL (OPCIONAL)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email
# SMTP_PASS=your-email-password

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

GATEWAY_PORT=5000
USER_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
RESOURCE_SERVICE_URL=http://localhost:3004
COMMUNICATION_SERVICE_URL=http://localhost:3005
ANALYTICS_SERVICE_URL=http://localhost:3006
AUTH_SERVICE_URL=http://localhost:3007
NOTIFICATION_SERVICE_URL=http://localhost:3008
FILE_SERVICE_URL=http://localhost:3009
SEARCH_SERVICE_URL=http://localhost:3010
LLM_GATEWAY_URL=http://localhost:3011
AI_SERVICES_URL=http://localhost:3012
MCP_ORCHESTRATOR_URL=http://localhost:3013
MCP_SERVERS_URL=http://localhost:3014

PRODUCTION_URL=https://gei.adeptify.es
API_BASE_URL=https://gei.adeptify.es/api
CLIENT_BASE_URL=https://gei.adeptify.es
"@ | Out-File -FilePath ".env.example" -Encoding UTF8

# 5. Agregar archivos y crear commit
Write-Host "💾 Creando commit de seguridad..." -ForegroundColor Yellow
git add .gitignore .env.example
git commit -m "security: Implementar buenas prácticas de seguridad - Eliminar claves API del repositorio y crear .env.example seguro"

# 6. Forzar push
Write-Host "📤 Forzando push al repositorio..." -ForegroundColor Yellow
Write-Host "⚠️  ADVERTENCIA: Esto reescribirá el historial del repositorio" -ForegroundColor Red

$confirm = Read-Host "¿Estás seguro de que quieres continuar? (y/N)"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    git push origin main --force
    Write-Host "✅ Push forzado completado" -ForegroundColor Green
} else {
    Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
}

Write-Host "🎉 Proceso completado!" -ForegroundColor Green
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Configura las variables de entorno en el servidor de producción"
Write-Host "   2. Usa .env.example como plantilla para desarrollo local"
Write-Host "   3. Nunca subas archivos .env con claves reales al repositorio" 