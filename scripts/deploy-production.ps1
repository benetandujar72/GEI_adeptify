# Script de Despliegue en Producción

Write-Host "🚀 Iniciando despliegue en producción..." -ForegroundColor Green

# 1. Verificar variables de entorno
Write-Host "
🔧 Verificando variables de entorno..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production no encontrado" -ForegroundColor Red
    exit 1
}

# 2. Construir imágenes Docker
Write-Host "
🐳 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build

# 3. Ejecutar migraciones
Write-Host "
🗄️  Ejecutando migraciones..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml run --rm postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f /docker-entrypoint-initdb.d/01-init-schemas.sql

# 4. Desplegar servicios
Write-Host "
🚀 Desplegando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# 5. Verificar salud de servicios
Write-Host "
🔍 Verificando salud de servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

$services = @(
    "mcp-orchestrator-prod:3008",
    "user-service-prod:3001",
    "student-service-prod:3002",
    "course-service-prod:3003",
    "resource-service-prod:3009",
    "communication-service-prod:3010",
    "analytics-service-prod:3011",
    "llm-gateway-prod:3004",
    "content-generation-prod:3005",
    "chatbot-prod:3006",
    "predictive-analytics-prod:3007",
    "personalization-engine-prod:3012",
    "ml-pipeline-prod:3013",
    "frontend-prod:80"
)

foreach ($service in $services) {
    $host, $port = $service.Split(":")
    try {
        $response = Invoke-WebRequest -Uri "http://$host:$port/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $host:$port - OK" -ForegroundColor Green
        } else {
            Write-Host "❌ $host:$port - ERROR" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $host:$port - ERROR" -ForegroundColor Red
    }
}

Write-Host "
🎉 Despliegue completado!" -ForegroundColor Green
Write-Host "📊 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   - Frontend: https://$env:DOMAIN" -ForegroundColor White
Write-Host "   - API: https://api.$env:DOMAIN" -ForegroundColor White
Write-Host "   - Dashboard: https://dashboard.$env:DOMAIN" -ForegroundColor White
Write-Host "   - Monitoring: https://monitoring.$env:DOMAIN" -ForegroundColor White
