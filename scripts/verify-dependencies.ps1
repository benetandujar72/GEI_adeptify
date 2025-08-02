# Script simple para verificar dependencias
Write-Host "=== Verificación de Dependencias GEI_adeptify ===" -ForegroundColor Green

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

# Verificar pip
try {
    $pipVersion = pip --version 2>$null
    if ($pipVersion) {
        Write-Host "✓ pip: $pipVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ pip: No encontrado" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ pip: No encontrado" -ForegroundColor Red
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

# Verificar archivos del proyecto
Write-Host "`n📋 Verificando archivos del proyecto:" -ForegroundColor Cyan

if (Test-Path "package.json") {
    Write-Host "✓ package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ package.json no encontrado" -ForegroundColor Red
}

if (Test-Path "requirements.txt") {
    Write-Host "✓ requirements.txt encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ requirements.txt no encontrado" -ForegroundColor Red
}

if (Test-Path "docker-compose.local.yml") {
    Write-Host "✓ docker-compose.local.yml encontrado" -ForegroundColor Green
} else {
    Write-Host "✗ docker-compose.local.yml no encontrado" -ForegroundColor Red
}

if (Test-Path "node_modules") {
    Write-Host "✓ node_modules encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules no encontrado" -ForegroundColor Yellow
    Write-Host "  Ejecutar: npm install" -ForegroundColor White
}

Write-Host "`n🚀 Próximos pasos:" -ForegroundColor Green
Write-Host "1. Instalar dependencias Node.js: npm install" -ForegroundColor White
Write-Host "2. Instalar dependencias Python: pip install -r requirements.txt" -ForegroundColor White
Write-Host "3. Iniciar bases de datos: docker-compose -f docker-compose.local.yml up -d" -ForegroundColor White 