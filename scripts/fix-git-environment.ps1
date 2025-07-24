# Script para solucionar el problema de Git con environment.json
Write-Host "🔧 Solucionando problema de Git con environment.json..." -ForegroundColor Green

# Verificar si estamos en un repositorio Git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No se encontró un repositorio Git en el directorio actual" -ForegroundColor Red
    exit 1
}

# Verificar el estado actual
Write-Host "📊 Estado actual del repositorio:" -ForegroundColor Yellow
git status --porcelain

# Remover el archivo environment.json del seguimiento de Git si existe
if (Test-Path ".cursor/environment.json") {
    Write-Host "🗑️  Removiendo .cursor/environment.json del seguimiento de Git..." -ForegroundColor Yellow
    git rm --cached .cursor/environment.json 2>$null
}

# Remover toda la carpeta .cursor del seguimiento si existe
if (Test-Path ".cursor") {
    Write-Host "🗑️  Removiendo .cursor/ del seguimiento de Git..." -ForegroundColor Yellow
    git rm -r --cached .cursor 2>$null
}

# Verificar si hay cambios pendientes
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Hay cambios pendientes. Creando commit..." -ForegroundColor Yellow
    git add .
    git commit -m "fix: Remove .cursor/ from tracking and add to .gitignore"
}

# Verificar la configuración del remoto
Write-Host "🌐 Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

# Intentar hacer pull del remoto
Write-Host "⬇️  Intentando hacer pull del remoto..." -ForegroundColor Yellow
git pull origin main

Write-Host "✅ Problema solucionado!" -ForegroundColor Green
Write-Host "💡 El archivo .cursor/environment.json ya no será rastreado por Git" -ForegroundColor Cyan
Write-Host "💡 Los archivos de configuración local de Cursor están ahora en .gitignore" -ForegroundColor Cyan 