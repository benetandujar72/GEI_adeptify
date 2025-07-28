# Script para detener entorno de desarrollo MCP

Write-Host "🛑 Deteniendo entorno de desarrollo MCP..." -ForegroundColor Yellow

# Detener servicios
docker-compose -f docker-compose.dev.yml down

Write-Host "✅ Entorno de desarrollo detenido" -ForegroundColor Green
