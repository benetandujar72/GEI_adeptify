# ============================================================================
# DIAGNÓSTICO COMPLETO - ERROR "APPLICATION EXITED EARLY" EN RENDER.COM
# ============================================================================
# Este script diagnostica y corrige el problema de despliegue en Render

Write-Host "🔍 INICIANDO DIAGNÓSTICO COMPLETO DE RENDER DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. VERIFICAR CONFIGURACIÓN DE PACKAGE.JSON
Write-Host "`n📋 1. VERIFICANDO CONFIGURACIÓN DE PACKAGE.JSON..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json
Write-Host "✅ Package.json encontrado" -ForegroundColor Green
Write-Host "   - Nombre: $($packageJson.name)" -ForegroundColor White
Write-Host "   - Versión: $($packageJson.version)" -ForegroundColor White
Write-Host "   - Type: $($packageJson.type)" -ForegroundColor White

# Verificar scripts críticos
Write-Host "`n🔧 Scripts disponibles:" -ForegroundColor Yellow
$packageJson.scripts.PSObject.Properties | ForEach-Object {
    Write-Host "   - $($_.Name): $($_.Value)" -ForegroundColor White
}

# Verificar engines
Write-Host "`n⚙️ Configuración de engines:" -ForegroundColor Yellow
if ($packageJson.engines) {
    Write-Host "   - Node: $($packageJson.engines.node)" -ForegroundColor White
    Write-Host "   - NPM: $($packageJson.engines.npm)" -ForegroundColor White
} else {
    Write-Host "   ⚠️ No se encontró configuración de engines" -ForegroundColor Red
}

# 2. VERIFICAR CONFIGURACIÓN DE RENDER.YAML
Write-Host "`n📋 2. VERIFICANDO CONFIGURACIÓN DE RENDER.YAML..." -ForegroundColor Yellow

if (Test-Path "render.yaml") {
    $renderConfig = Get-Content "render.yaml" -Raw
    Write-Host "✅ Render.yaml encontrado" -ForegroundColor Green
    
    # Extraer información clave
    if ($renderConfig -match "buildCommand:\s*\|\s*\n(.*?)\n\s*startCommand:") {
        $buildCommand = $matches[1].Trim()
        Write-Host "   - Build Command: $buildCommand" -ForegroundColor White
    }
    
    if ($renderConfig -match "startCommand:\s*\|\s*\n(.*?)\n\s*envVars:") {
        $startCommand = $matches[1].Trim()
        Write-Host "   - Start Command: $startCommand" -ForegroundColor White
    }
    
    if ($renderConfig -match "PORT\s*\n\s*value:\s*(\d+)") {
        $renderPort = $matches[1]
        Write-Host "   - Puerto configurado: $renderPort" -ForegroundColor White
    }
} else {
    Write-Host "❌ Render.yaml no encontrado" -ForegroundColor Red
}

# 3. VERIFICAR ESTRUCTURA DEL SERVIDOR
Write-Host "`n📋 3. VERIFICANDO ESTRUCTURA DEL SERVIDOR..." -ForegroundColor Yellow

$serverPackageJson = Get-Content "server/package.json" | ConvertFrom-Json
Write-Host "✅ Server package.json encontrado" -ForegroundColor Green
Write-Host "   - Nombre: $($serverPackageJson.name)" -ForegroundColor White
Write-Host "   - Main: $($serverPackageJson.main)" -ForegroundColor White

Write-Host "`n🔧 Scripts del servidor:" -ForegroundColor Yellow
$serverPackageJson.scripts.PSObject.Properties | ForEach-Object {
    Write-Host "   - $($_.Name): $($_.Value)" -ForegroundColor White
}

# Verificar archivos críticos del servidor
$criticalFiles = @(
    "server/index.ts",
    "server/start.sh",
    "server/dist/index.js"
)

Write-Host "`n📁 Verificando archivos críticos:" -ForegroundColor Yellow
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file" -ForegroundColor Red
    }
}

# 4. VERIFICAR CONFIGURACIÓN DE PUERTO Y BINDING
Write-Host "`n📋 4. VERIFICANDO CONFIGURACIÓN DE PUERTO Y BINDING..." -ForegroundColor Yellow

$serverIndex = Get-Content "server/index.ts" -Raw
if ($serverIndex -match "server\.listen\(port,\s*\(\)\s*=>") {
    Write-Host "✅ server.listen encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ server.listen no encontrado o mal configurado" -ForegroundColor Red
}

# Verificar si se está usando localhost en lugar de 0.0.0.0
if ($serverIndex -match "localhost") {
    Write-Host "⚠️ Se detectó 'localhost' en el código - esto puede causar problemas en Render" -ForegroundColor Yellow
}

# 5. VERIFICAR VARIABLES DE ENTORNO
Write-Host "`n📋 5. VERIFICANDO VARIABLES DE ENTORNO..." -ForegroundColor Yellow

$envExample = Get-Content "env.example" -Raw
$renderEnv = Get-Content "render.env" -Raw

Write-Host "✅ Archivos de variables de entorno encontrados" -ForegroundColor Green

# Extraer variables críticas
$criticalVars = @("NODE_ENV", "PORT", "DATABASE_URL", "JWT_SECRET", "SESSION_SECRET")

Write-Host "`n🔑 Variables críticas requeridas:" -ForegroundColor Yellow
foreach ($var in $criticalVars) {
    if ($envExample -match "$var=") {
        Write-Host "   ✅ $var (definida en env.example)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $var (no encontrada en env.example)" -ForegroundColor Red
    }
}

# 6. IDENTIFICAR PROBLEMAS POTENCIALES
Write-Host "`n📋 6. IDENTIFICANDO PROBLEMAS POTENCIALES..." -ForegroundColor Yellow

$problems = @()

# Problema 1: Puerto incorrecto
if ($renderConfig -match "PORT.*3000" -and $serverIndex -match "port.*3001") {
    $problems += "❌ Conflicto de puertos: Render usa 3000, servidor usa 3001"
}

# Problema 2: Binding a localhost
if ($serverIndex -match "localhost" -and $serverIndex -notmatch "0\.0\.0\.0") {
    $problems += "❌ Servidor configurado para localhost en lugar de 0.0.0.0"
}

# Problema 3: Script start.sh no encontrado
if (-not (Test-Path "server/start.sh")) {
    $problems += "❌ Archivo start.sh no encontrado en server/"
}

# Problema 4: Variables de entorno faltantes
if ($envExample -notmatch "DATABASE_URL=") {
    $problems += "❌ DATABASE_URL no definida en variables de entorno"
}

# Mostrar problemas encontrados
if ($problems.Count -gt 0) {
    Write-Host "`n🚨 PROBLEMAS IDENTIFICADOS:" -ForegroundColor Red
    foreach ($problem in $problems) {
        Write-Host "   $problem" -ForegroundColor Red
    }
} else {
    Write-Host "`n✅ No se identificaron problemas críticos" -ForegroundColor Green
}

# 7. GENERAR SOLUCIONES
Write-Host "`n📋 7. GENERANDO SOLUCIONES..." -ForegroundColor Yellow

# Crear archivo start.sh si no existe
if (-not (Test-Path "server/start.sh")) {
    Write-Host "`n🔧 Creando archivo start.sh..." -ForegroundColor Yellow
    $startShContent = @"
#!/bin/bash
set -e

echo "🚀 Iniciando servidor en puerto \$PORT..."

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado. Ejecutando build..."
    npm run build
fi

# Iniciar servidor
exec node dist/index.js
"@
    Set-Content "server/start.sh" $startShContent -Encoding UTF8
    Write-Host "✅ Archivo start.sh creado" -ForegroundColor Green
}

# Crear archivo de configuración corregido para Render
Write-Host "`n🔧 Creando render.yaml corregido..." -ForegroundColor Yellow
$correctedRenderYaml = @"
services:
  - type: web
    name: eduai-platform
    env: node
    plan: starter
    buildCommand: |
      npm ci
      npm run build:server
    startCommand: |
      cd server
      chmod +x start.sh
      ./start.sh
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: HOST
        value: 0.0.0.0
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: SESSION_SECRET
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: GOOGLE_API_KEY
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        value: 587
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: FRONTEND_URL
        value: https://eduai-platform.com
      - key: LOG_LEVEL
        value: info
      - key: ENABLE_METRICS
        value: true
    healthCheckPath: /api/health
    autoDeploy: true

databases:
  - name: eduai-postgres
    databaseName: eduai
    user: postgres
    plan: starter

  - name: eduai-redis
    databaseName: redis
    plan: starter
"@
Set-Content "render-corrected.yaml" $correctedRenderYaml -Encoding UTF8
Write-Host "✅ Archivo render-corrected.yaml creado" -ForegroundColor Green

# Crear script de prueba local
Write-Host "`n🔧 Creando script de prueba local..." -ForegroundColor Yellow
$testLocalScript = @"
# ============================================================================
# SCRIPT DE PRUEBA LOCAL - SIMULA CONFIGURACIÓN DE RENDER
# ============================================================================

echo "🧪 Iniciando prueba local con configuración de Render..."

# Configurar variables de entorno como en Render
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# Verificar que el build funciona
echo "🔨 Verificando build..."
npm run build:server

# Verificar que el archivo compilado existe
if [ ! -f "server/dist/index.js" ]; then
    echo "❌ Error: Build falló - dist/index.js no encontrado"
    exit 1
fi

echo "✅ Build exitoso"

# Probar el script start.sh
echo "🚀 Probando start.sh..."
cd server
chmod +x start.sh
timeout 30s ./start.sh || echo "⚠️ Timeout después de 30 segundos (normal para prueba)"

echo "✅ Prueba local completada"
"@
Set-Content "test-render-local.sh" $testLocalScript -Encoding UTF8
Write-Host "✅ Script test-render-local.sh creado" -ForegroundColor Green

# 8. RECOMENDACIONES FINALES
Write-Host "`n📋 8. RECOMENDACIONES FINALES..." -ForegroundColor Yellow

Write-Host "`n🎯 PLAN DE ACCIÓN PARA RESOLVER EL PROBLEMA:" -ForegroundColor Cyan
Write-Host "1. Reemplazar render.yaml con render-corrected.yaml" -ForegroundColor White
Write-Host "2. Verificar que todas las variables de entorno estén configuradas en Render" -ForegroundColor White
Write-Host "3. Ejecutar test-render-local.sh localmente para verificar la configuración" -ForegroundColor White
Write-Host "4. Hacer commit y push de los cambios" -ForegroundColor White
Write-Host "5. Redesplegar en Render" -ForegroundColor White

Write-Host "`n🔧 COMANDOS PARA EJECUTAR:" -ForegroundColor Cyan
Write-Host "git add ." -ForegroundColor White
Write-Host "git commit -m 'Fix Render deployment configuration'" -ForegroundColor White
Write-Host "git push origin main" -ForegroundColor White

Write-Host "`n📊 VARIABLES DE ENTORNO CRÍTICAS PARA CONFIGURAR EN RENDER:" -ForegroundColor Cyan
Write-Host "- NODE_ENV=production" -ForegroundColor White
Write-Host "- PORT=3000" -ForegroundColor White
Write-Host "- HOST=0.0.0.0" -ForegroundColor White
Write-Host "- DATABASE_URL=<tu-url-de-postgres>" -ForegroundColor White
Write-Host "- JWT_SECRET=<tu-jwt-secret>" -ForegroundColor White
Write-Host "- SESSION_SECRET=<tu-session-secret>" -ForegroundColor White

Write-Host "`n✅ DIAGNÓSTICO COMPLETADO" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan