# Script simple para reiniciar la aplicación
Write-Host "🚀 === REINICIANDO APLICACIÓN ===" -ForegroundColor Yellow

# Verificar si Docker está funcionando
Write-Host "🔍 Verificando Docker..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker disponible: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está disponible. Por favor, inicia Docker Desktop." -ForegroundColor Red
    Write-Host "💡 Alternativa: Usa el script manual de reinicio." -ForegroundColor Yellow
    exit 1
}

# Detener contenedores
Write-Host "📦 Deteniendo contenedores..." -ForegroundColor Blue
docker compose down

# Reconstruir y levantar
Write-Host "🔨 Reconstruyendo aplicación..." -ForegroundColor Blue
docker compose build app

Write-Host "🚀 Levantando servicios..." -ForegroundColor Blue
docker compose up -d

# Esperar y verificar
Write-Host "⏳ Esperando a que la aplicación esté lista..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar estado
Write-Host "✅ Verificando estado..." -ForegroundColor Green
docker compose ps

# Verificar API
Write-Host "🏥 Verificando API..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ API funcionando:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ API no disponible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Credenciales de acceso:" -ForegroundColor Cyan
Write-Host "👤 ADMINISTRADOR: admin@gei.edu / admin123" -ForegroundColor White
Write-Host "👨‍🏫 PROFESOR: teacher@gei.edu / teacher123" -ForegroundColor White
Write-Host "👨‍🎓 ESTUDIANTE: student@gei.edu / student123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Accede a: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🎉 ¡Aplicación reiniciada!" -ForegroundColor Green
