Write-Host "=== Verificación de Dependencias ===" -ForegroundColor Green

# Verificar Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js: No encontrado" -ForegroundColor Red
}

# Verificar npm
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm: No encontrado" -ForegroundColor Red
}

# Verificar Python
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python: No encontrado" -ForegroundColor Red
}

# Verificar Docker
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "✓ Docker: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Docker: No encontrado" -ForegroundColor Red
}

# Verificar Git
$gitVersion = git --version 2>$null
if ($gitVersion) {
    Write-Host "✓ Git: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Git: No encontrado" -ForegroundColor Red
}

Write-Host "`n=== Archivos del Proyecto ===" -ForegroundColor Cyan

if (Test-Path "package.json") {
    Write-Host "✓ package.json" -ForegroundColor Green
} else {
    Write-Host "✗ package.json" -ForegroundColor Red
}

if (Test-Path "requirements.txt") {
    Write-Host "✓ requirements.txt" -ForegroundColor Green
} else {
    Write-Host "✗ requirements.txt" -ForegroundColor Red
}

if (Test-Path "docker-compose.local.yml") {
    Write-Host "✓ docker-compose.local.yml" -ForegroundColor Green
} else {
    Write-Host "✗ docker-compose.local.yml" -ForegroundColor Red
} 