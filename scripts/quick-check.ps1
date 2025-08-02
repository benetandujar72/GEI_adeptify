Write-Host "=== Verificación Rápida de Herramientas ===" -ForegroundColor Green

# Verificar Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Node.js: No encontrado" -ForegroundColor Red
        Write-Host "  Instalar: winget install OpenJS.NodeJS" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Node.js: No encontrado" -ForegroundColor Red
    Write-Host "  Instalar: winget install OpenJS.NodeJS" -ForegroundColor Yellow
}

# Verificar npm
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ npm: No encontrado" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ npm: No encontrado" -ForegroundColor Red
}

# Verificar Python
try {
    $pythonVersion = python --version 2>$null
    if ($pythonVersion) {
        Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Python: No encontrado" -ForegroundColor Red
        Write-Host "  Instalar: winget install Python.Python.3.11" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Python: No encontrado" -ForegroundColor Red
    Write-Host "  Instalar: winget install Python.Python.3.11" -ForegroundColor Yellow
}

# Verificar Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✓ Docker: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker: No encontrado" -ForegroundColor Red
        Write-Host "  Instalar: winget install Docker.DockerDesktop" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Docker: No encontrado" -ForegroundColor Red
    Write-Host "  Instalar: winget install Docker.DockerDesktop" -ForegroundColor Yellow
}

# Verificar Git
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host "✓ Git: $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Git: No encontrado" -ForegroundColor Red
        Write-Host "  Instalar: winget install Git.Git" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Git: No encontrado" -ForegroundColor Red
    Write-Host "  Instalar: winget install Git.Git" -ForegroundColor Yellow
}

Write-Host "`n=== PRÓXIMOS PASOS ===" -ForegroundColor Cyan
Write-Host "1. Instala las herramientas faltantes usando winget" -ForegroundColor White
Write-Host "2. Reinicia tu terminal" -ForegroundColor White
Write-Host "3. Ejecuta: .\scripts\setup-local-env.ps1" -ForegroundColor Yellow
Write-Host "4. Ejecuta: docker-compose -f docker-compose.local.yml up -d" -ForegroundColor Yellow 