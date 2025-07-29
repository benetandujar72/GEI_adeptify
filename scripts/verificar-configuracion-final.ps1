# ============================================================================
# VERIFICACIÓN FINAL - CONFIGURACIÓN PARA RENDER
# ============================================================================

Write-Host "🔍 VERIFICACIÓN FINAL DE CONFIGURACIÓN PARA RENDER" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. VERIFICAR CONFIGURACIÓN DEL SERVIDOR
Write-Host "`n📋 1. Verificando configuración del servidor..." -ForegroundColor Yellow

$serverContent = Get-Content "server/index.ts" -Raw

# Verificar puerto
if ($serverContent -match "const port = process\.env\.PORT \|\| 3001") {
    Write-Host "✅ Puerto configurado correctamente: process.env.PORT || 3001" -ForegroundColor Green
} else {
    Write-Host "❌ Configuración de puerto incorrecta" -ForegroundColor Red
}

# Verificar binding
if ($serverContent -match "server\.listen\(port,\s*'0\.0\.0\.0',\s*\(\)\s*=>") {
    Write-Host "✅ Binding configurado correctamente: server.listen(port, '0.0.0.0', callback)" -ForegroundColor Green
} else {
    Write-Host "❌ Binding incorrecto - debe ser '0.0.0.0'" -ForegroundColor Red
}

# 2. VERIFICAR RENDER.YAML
Write-Host "`n📋 2. Verificando render.yaml..." -ForegroundColor Yellow

$renderContent = Get-Content "render.yaml" -Raw

# Verificar build command
if ($renderContent -match "buildCommand:\s*\|\s*\n\s*npm ci\s*\n\s*npm run build:server") {
    Write-Host "✅ Build command correcto: npm ci && npm run build:server" -ForegroundColor Green
} else {
    Write-Host "❌ Build command incorrecto" -ForegroundColor Red
}

# Verificar start command
if ($renderContent -match "startCommand:\s*\|\s*\n\s*cd server\s*\n\s*chmod \+x start\.sh\s*\n\s*\./start\.sh") {
    Write-Host "✅ Start command correcto: cd server && chmod +x start.sh && ./start.sh" -ForegroundColor Green
} else {
    Write-Host "❌ Start command incorrecto" -ForegroundColor Red
}

# Verificar variables de entorno
$requiredVars = @("NODE_ENV", "PORT", "HOST", "DATABASE_URL", "JWT_SECRET", "SESSION_SECRET")
foreach ($var in $requiredVars) {
    if ($renderContent -match "key:\s*$var") {
        Write-Host "✅ Variable $var configurada" -ForegroundColor Green
    } else {
        Write-Host "❌ Variable $var faltante" -ForegroundColor Red
    }
}

# Verificar health check
if ($renderContent -match "healthCheckPath:\s*/api/health") {
    Write-Host "✅ Health check path correcto: /api/health" -ForegroundColor Green
} else {
    Write-Host "❌ Health check path incorrecto" -ForegroundColor Red
}

# 3. VERIFICAR SCRIPT DE INICIO
Write-Host "`n📋 3. Verificando script de inicio..." -ForegroundColor Yellow

if (Test-Path "server/start.sh") {
    $startShContent = Get-Content "server/start.sh" -Raw
    if ($startShContent -match "exec node dist/index.js") {
        Write-Host "✅ Script start.sh correcto" -ForegroundColor Green
    } else {
        Write-Host "❌ Script start.sh incorrecto" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Archivo start.sh no encontrado" -ForegroundColor Red
}

# 4. VERIFICAR PACKAGE.JSON
Write-Host "`n📋 4. Verificando package.json..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json

if ($packageJson.scripts.build_server) {
    Write-Host "✅ Script build:server encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Script build:server no encontrado" -ForegroundColor Red
}

if ($packageJson.engines.node) {
    Write-Host "✅ Node.js engine configurado: $($packageJson.engines.node)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js engine no configurado" -ForegroundColor Red
}

# 5. VERIFICAR ESTRUCTURA DE ARCHIVOS
Write-Host "`n📋 5. Verificando estructura de archivos..." -ForegroundColor Yellow

$criticalFiles = @(
    "server/index.ts",
    "server/package.json",
    "server/start.sh",
    "render.yaml",
    "package.json"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $file no existe" -ForegroundColor Red
    }
}

# 6. RESUMEN FINAL
Write-Host "`n🎯 RESUMEN DE VERIFICACIÓN:" -ForegroundColor Cyan

$issues = @()

if (-not ($serverContent -match "server\.listen\(port,\s*'0\.0\.0\.0',\s*\(\)\s*=>")) {
    $issues += "❌ Binding del servidor incorrecto"
}

if (-not ($renderContent -match "buildCommand:\s*\|\s*\n\s*npm ci\s*\n\s*npm run build:server")) {
    $issues += "❌ Build command incorrecto"
}

if (-not (Test-Path "server/start.sh")) {
    $issues += "❌ Script start.sh faltante"
}

if ($issues.Count -eq 0) {
    Write-Host "✅ TODA LA CONFIGURACIÓN ESTÁ CORRECTA PARA RENDER" -ForegroundColor Green
    Write-Host "🚀 Listo para hacer commit y push" -ForegroundColor Green
} else {
    Write-Host "❌ PROBLEMAS ENCONTRADOS:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "   $issue" -ForegroundColor Red
    }
}

Write-Host "`n🔧 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. git add ." -ForegroundColor White
Write-Host "2. git commit -m 'Fix server binding and complete Render configuration'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
Write-Host "4. Verificar despliegue en Render Dashboard" -ForegroundColor White

Write-Host "`n✅ VERIFICACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan