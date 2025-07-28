# Script para iniciar entorno de desarrollo MCP

Write-Host "🚀 Iniciando entorno de desarrollo MCP..." -ForegroundColor Green

# Verificar que Docker esté ejecutándose
try {
    docker info | Out-Null
    Write-Host "✅ Docker está ejecutándose" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker no está ejecutándose" -ForegroundColor Red
    exit 1
}

# Construir imágenes si es necesario
Write-Host "🔨 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml build

# Iniciar servicios
Write-Host "📦 Iniciando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

Write-Host "✅ Entorno de desarrollo iniciado" -ForegroundColor Green
Write-Host "📊 Dashboard: http://localhost:3000 (Grafana)" -ForegroundColor Cyan
Write-Host "🔧 API Gateway: http://localhost:8080 (Traefik)" -ForegroundColor Cyan
Write-Host "📧 Email Testing: http://localhost:8025 (Mailhog)" -ForegroundColor Cyan
