# Script para reiniciar la aplicación GEI
Write-Host "🔄 Reiniciando aplicación GEI..." -ForegroundColor Yellow

# Detener contenedores
Write-Host "📦 Deteniendo contenedores..." -ForegroundColor Blue
docker compose down

# Reconstruir la aplicación
Write-Host "🔨 Reconstruyendo aplicación..." -ForegroundColor Blue
docker compose build app

# Levantar todos los servicios
Write-Host "🚀 Levantando servicios..." -ForegroundColor Blue
docker compose up -d

# Verificar estado
Write-Host "✅ Verificando estado..." -ForegroundColor Green
docker compose ps

# Mostrar logs
Write-Host "📋 Mostrando logs de la aplicación..." -ForegroundColor Green
docker compose logs app

Write-Host "🎉 ¡Aplicación reiniciada!" -ForegroundColor Green
Write-Host "🌐 Accede a: http://localhost:3000" -ForegroundColor Cyan
