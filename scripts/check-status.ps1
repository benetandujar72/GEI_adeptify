# Script para verificar el estado de la aplicación GEI
Write-Host "🔍 Verificando estado de la aplicación GEI..." -ForegroundColor Yellow

# Verificar contenedores
Write-Host "📦 Estado de contenedores:" -ForegroundColor Blue
docker compose ps

# Verificar logs
Write-Host "📋 Logs de la aplicación:" -ForegroundColor Blue
docker compose logs app

# Verificar salud de la API
Write-Host "🏥 Verificando salud de la API..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ API funcionando:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ API no disponible: $($_.Exception.Message)" -ForegroundColor Red
}

# Verificar frontend
Write-Host "🌐 Verificando frontend..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/" -Method Get -TimeoutSec 5
    Write-Host "✅ Frontend funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend no disponible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎯 Verificación completada!" -ForegroundColor Green
