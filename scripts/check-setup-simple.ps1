Write-Host "🔍 Verificando configuración básica..." -ForegroundColor Blue

# Verificar archivos críticos
$files = @("Dockerfile.prod", "docker-compose.prod.yml", "package.json", "render.yaml")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $file NO EXISTE" -ForegroundColor Red
    }
}

# Verificar Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker NO está instalado" -ForegroundColor Red
}

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js NO está instalado" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Para ejecutar el proyecto:" -ForegroundColor Yellow
Write-Host "1. docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Cyan
Write-Host "2. curl http://localhost:3000/health" -ForegroundColor Cyan 