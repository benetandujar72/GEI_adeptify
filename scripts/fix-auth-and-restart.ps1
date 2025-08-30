# Script para reiniciar la aplicación después de arreglar la autenticación
Write-Host "🔧 === ARREGLANDO AUTENTICACIÓN Y REINICIANDO ===" -ForegroundColor Yellow

# Detener contenedores
Write-Host "📦 Deteniendo contenedores..." -ForegroundColor Blue
docker compose down

# Reconstruir la aplicación con las nuevas dependencias
Write-Host "🔨 Reconstruyendo aplicación con nuevas dependencias..." -ForegroundColor Blue
docker compose build app

# Levantar todos los servicios
Write-Host "🚀 Levantando servicios..." -ForegroundColor Blue
docker compose up -d

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar estado
Write-Host "✅ Verificando estado..." -ForegroundColor Green
docker compose ps

# Verificar salud de la API
Write-Host "🏥 Verificando salud de la API..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ API funcionando:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ API no disponible: $($_.Exception.Message)" -ForegroundColor Red
}

# Mostrar credenciales
Write-Host "📋 Credenciales de acceso:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "👤 ADMINISTRADOR:" -ForegroundColor White
Write-Host "   Email: admin@gei.edu" -ForegroundColor White
Write-Host "   Contraseña: admin123" -ForegroundColor White
Write-Host ""
Write-Host "👨‍🏫 PROFESOR:" -ForegroundColor White
Write-Host "   Email: teacher@gei.edu" -ForegroundColor White
Write-Host "   Contraseña: teacher123" -ForegroundColor White
Write-Host ""
Write-Host "👨‍🎓 ESTUDIANTE:" -ForegroundColor White
Write-Host "   Email: student@gei.edu" -ForegroundColor White
Write-Host "   Contraseña: student123" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Write-Host "🌐 Accede a: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔐 Usa las credenciales del administrador para acceder" -ForegroundColor Yellow

Write-Host "🎉 ¡Aplicación reiniciada con autenticación corregida!" -ForegroundColor Green
