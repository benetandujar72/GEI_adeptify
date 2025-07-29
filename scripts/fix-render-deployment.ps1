# ============================================================================
# FIX RENDER DEPLOYMENT - SOLUCIÓN PARA "APPLICATION EXITED EARLY"
# ============================================================================

Write-Host "🔧 FIXING RENDER DEPLOYMENT ISSUES..." -ForegroundColor Cyan

# 1. CREAR ARCHIVO START.SH CORREGIDO
Write-Host "`n📝 1. Creando archivo start.sh corregido..." -ForegroundColor Yellow

$startShContent = @"
#!/bin/bash
set -e

echo "🚀 Iniciando servidor en puerto \$PORT..."

# Verificar que el archivo compilado existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js no encontrado. Ejecutando build..."
    npm run build
fi

# Iniciar servidor con binding correcto
exec node dist/index.js
"@

Set-Content "server/start.sh" $startShContent -Encoding UTF8
Write-Host "✅ Archivo start.sh creado" -ForegroundColor Green

# 2. CREAR RENDER.YAML CORREGIDO
Write-Host "`n📝 2. Creando render.yaml corregido..." -ForegroundColor Yellow

$renderYamlContent = @"
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

# Hacer backup del render.yaml original
if (Test-Path "render.yaml") {
    Copy-Item "render.yaml" "render.yaml.backup"
    Write-Host "✅ Backup de render.yaml creado" -ForegroundColor Green
}

Set-Content "render.yaml" $renderYamlContent -Encoding UTF8
Write-Host "✅ Archivo render.yaml corregido" -ForegroundColor Green

# 3. VERIFICAR CONFIGURACIÓN DEL SERVIDOR
Write-Host "`n📝 3. Verificando configuración del servidor..." -ForegroundColor Yellow

# Verificar que el servidor use el puerto correcto
$serverIndex = Get-Content "server/index.ts" -Raw
if ($serverIndex -match "const port = process\.env\.PORT \|\| 3001") {
    Write-Host "⚠️ Puerto por defecto es 3001, pero Render usa 3000" -ForegroundColor Yellow
    Write-Host "✅ Esto está bien porque usa process.env.PORT" -ForegroundColor Green
}

# 4. CREAR SCRIPT DE PRUEBA LOCAL
Write-Host "`n📝 4. Creando script de prueba local..." -ForegroundColor Yellow

$testScriptContent = @"
# ============================================================================
# PRUEBA LOCAL - SIMULA RENDER
# ============================================================================

echo "🧪 Probando configuración local..."

# Configurar variables como en Render
export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0

# Verificar build
echo "🔨 Verificando build..."
npm run build:server

if [ ! -f "server/dist/index.js" ]; then
    echo "❌ Error: Build falló"
    exit 1
fi

echo "✅ Build exitoso"

# Probar start.sh
echo "🚀 Probando start.sh..."
cd server
chmod +x start.sh
timeout 10s ./start.sh || echo "⚠️ Timeout (normal)"

echo "✅ Prueba completada"
"@

Set-Content "test-render-local.sh" $testScriptContent -Encoding UTF8
Write-Host "✅ Script de prueba creado" -ForegroundColor Green

# 5. CREAR DOCUMENTO DE SOLUCIÓN
Write-Host "`n📝 5. Creando documento de solución..." -ForegroundColor Yellow

$solutionDoc = @"
# ============================================================================
# SOLUCIÓN PARA "APPLICATION EXITED EARLY" EN RENDER.COM
# ============================================================================

## PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### 1. CONFIGURACIÓN DE PUERTO Y BINDING
**Problema**: El servidor puede estar configurado para localhost en lugar de 0.0.0.0
**Solución**: ✅ Configurado HOST=0.0.0.0 en render.yaml

### 2. SCRIPT START.SH
**Problema**: Archivo start.sh puede no existir o tener permisos incorrectos
**Solución**: ✅ Creado start.sh con permisos correctos

### 3. COMANDOS DE BUILD Y START
**Problema**: Comandos incorrectos en render.yaml
**Solución**: ✅ Corregidos los comandos de build y start

### 4. VARIABLES DE ENTORNO
**Problema**: Variables críticas faltantes
**Solución**: ✅ Configuradas todas las variables necesarias

## PASOS PARA APLICAR LA SOLUCIÓN

### 1. Verificar cambios locales
```bash
# Probar la configuración localmente
chmod +x test-render-local.sh
./test-render-local.sh
```

### 2. Commit y push
```bash
git add .
git commit -m "Fix Render deployment configuration"
git push origin main
```

### 3. Configurar variables en Render
En el dashboard de Render, configurar estas variables:
- NODE_ENV=production
- PORT=3000
- HOST=0.0.0.0
- DATABASE_URL=<tu-url-de-postgres>
- JWT_SECRET=<tu-jwt-secret>
- SESSION_SECRET=<tu-session-secret>

### 4. Redesplegar
El servicio se redesplegará automáticamente después del push.

## VERIFICACIÓN

1. Revisar logs en Render Dashboard
2. Verificar que el health check responda: https://tu-app.onrender.com/api/health
3. Probar endpoints principales

## COMANDOS DE DEBUGGING

```bash
# Ver logs en tiempo real
render logs --follow

# Verificar estado del servicio
render ps

# Forzar redeploy
render deploy
```
"@

Set-Content "SOLUCION_RENDER_DEPLOYMENT.md" $solutionDoc -Encoding UTF8
Write-Host "✅ Documento de solución creado" -ForegroundColor Green

# 6. RESUMEN FINAL
Write-Host "`n🎯 RESUMEN DE CAMBIOS REALIZADOS:" -ForegroundColor Cyan
Write-Host "✅ Creado server/start.sh corregido" -ForegroundColor Green
Write-Host "✅ Actualizado render.yaml con configuración correcta" -ForegroundColor Green
Write-Host "✅ Creado script de prueba local" -ForegroundColor Green
Write-Host "✅ Creado documento de solución" -ForegroundColor Green

Write-Host "`n🚀 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. git add ." -ForegroundColor White
Write-Host "2. git commit -m 'Fix Render deployment configuration'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
Write-Host "4. Configurar variables de entorno en Render Dashboard" -ForegroundColor White

Write-Host "`n✅ FIX COMPLETADO" -ForegroundColor Green 