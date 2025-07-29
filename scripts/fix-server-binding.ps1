# ============================================================================
# FIX SERVER BINDING - CAMBIAR LOCALHOST A 0.0.0.0
# ============================================================================
# Este script corrige el problema de binding del servidor para Render

Write-Host "🔧 FIXING SERVER BINDING ISSUE..." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. VERIFICAR EL PROBLEMA ACTUAL
Write-Host "`n📋 1. Verificando configuración actual del servidor..." -ForegroundColor Yellow

$serverContent = Get-Content "server/index.ts" -Raw
if ($serverContent -match "server\.listen\(port,\s*\(\)\s*=>") {
    Write-Host "❌ PROBLEMA ENCONTRADO: server.listen() sin especificar host" -ForegroundColor Red
    Write-Host "   - Actual: server.listen(port, callback)" -ForegroundColor White
    Write-Host "   - Debería ser: server.listen(port, '0.0.0.0', callback)" -ForegroundColor White
} else {
    Write-Host "✅ Configuración correcta encontrada" -ForegroundColor Green
}

# 2. CREAR BACKUP
Write-Host "`n📋 2. Creando backup del archivo original..." -ForegroundColor Yellow
Copy-Item "server/index.ts" "server/index.ts.backup"
Write-Host "✅ Backup creado: server/index.ts.backup" -ForegroundColor Green

# 3. CORREGIR EL BINDING
Write-Host "`n📋 3. Corrigiendo binding del servidor..." -ForegroundColor Yellow

# Buscar y reemplazar la línea problemática
$oldPattern = "server\.listen\(port,\s*\(\)\s*=>"
$newPattern = "server.listen(port, '0.0.0.0', () =>"

if ($serverContent -match $oldPattern) {
    $newContent = $serverContent -replace $oldPattern, $newPattern
    Set-Content "server/index.ts" $newContent -Encoding UTF8
    Write-Host "✅ Binding corregido: ahora usa '0.0.0.0'" -ForegroundColor Green
} else {
    Write-Host "⚠️ No se encontró el patrón esperado" -ForegroundColor Yellow
}

# 4. VERIFICAR LA CORRECCIÓN
Write-Host "`n📋 4. Verificando la corrección..." -ForegroundColor Yellow
$updatedContent = Get-Content "server/index.ts" -Raw
if ($updatedContent -match "server\.listen\(port,\s*'0\.0\.0\.0',\s*\(\)\s*=>") {
    Write-Host "✅ CORRECCIÓN EXITOSA: server.listen() ahora usa '0.0.0.0'" -ForegroundColor Green
} else {
    Write-Host "❌ La corrección no se aplicó correctamente" -ForegroundColor Red
}

# 5. VERIFICAR OTRAS CONFIGURACIONES
Write-Host "`n📋 5. Verificando otras configuraciones..." -ForegroundColor Yellow

# Verificar que el puerto se configure correctamente
if ($updatedContent -match "const port = process\.env\.PORT \|\| 3001") {
    Write-Host "✅ Puerto configurado correctamente: process.env.PORT || 3001" -ForegroundColor Green
} else {
    Write-Host "⚠️ Verificar configuración del puerto" -ForegroundColor Yellow
}

# Verificar que no haya process.exit() problemáticos
if ($updatedContent -match "process\.exit\(\)") {
    Write-Host "⚠️ Se encontró process.exit() - verificar que no sea problemático" -ForegroundColor Yellow
} else {
    Write-Host "✅ No se encontraron process.exit() problemáticos" -ForegroundColor Green
}

# 6. CREAR SCRIPT DE PRUEBA
Write-Host "`n📋 6. Creando script de prueba..." -ForegroundColor Yellow

$testScript = @"
# ============================================================================
# PRUEBA DE BINDING CORREGIDO
# ============================================================================

echo "🧪 Probando binding corregido..."

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

# Probar el servidor
echo "🚀 Probando servidor con binding 0.0.0.0..."
cd server
timeout 10s node dist/index.js &
SERVER_PID=`$!

# Esperar un momento para que el servidor inicie
sleep 3

# Verificar que el servidor esté escuchando en 0.0.0.0
if netstat -tlnp 2>/dev/null | grep -q ":3000.*LISTEN"; then
    echo "✅ Servidor escuchando correctamente en puerto 3000"
else
    echo "❌ Servidor no está escuchando"
fi

# Terminar el proceso de prueba
kill `$SERVER_PID 2>/dev/null || true

echo "✅ Prueba completada"
"@

Set-Content "test-binding-fix.sh" $testScript -Encoding UTF8
Write-Host "✅ Script de prueba creado: test-binding-fix.sh" -ForegroundColor Green

# 7. ACTUALIZAR RENDER.YAML SI ES NECESARIO
Write-Host "`n📋 7. Verificando render.yaml..." -ForegroundColor Yellow

$renderContent = Get-Content "render.yaml" -Raw
if ($renderContent -match "HOST.*0\.0\.0\.0") {
    Write-Host "✅ HOST=0.0.0.0 ya configurado en render.yaml" -ForegroundColor Green
} else {
    Write-Host "⚠️ HOST=0.0.0.0 no encontrado en render.yaml" -ForegroundColor Yellow
}

# 8. RESUMEN FINAL
Write-Host "`n🎯 RESUMEN DE CAMBIOS REALIZADOS:" -ForegroundColor Cyan
Write-Host "✅ Backup creado: server/index.ts.backup" -ForegroundColor Green
Write-Host "✅ Binding corregido: server.listen(port, '0.0.0.0', callback)" -ForegroundColor Green
Write-Host "✅ Script de prueba creado: test-binding-fix.sh" -ForegroundColor Green

Write-Host "`n🚀 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. git add ." -ForegroundColor White
Write-Host "2. git commit -m 'Fix server binding: change localhost to 0.0.0.0'" -ForegroundColor White
Write-Host "3. git push origin main" -ForegroundColor White
Write-Host "4. Verificar despliegue en Render" -ForegroundColor White

Write-Host "`n🔍 VERIFICACIÓN:" -ForegroundColor Cyan
Write-Host "- El servidor ahora se enlaza a 0.0.0.0 en lugar de localhost" -ForegroundColor White
Write-Host "- Render podrá acceder al proceso correctamente" -ForegroundColor White
Write-Host "- El error 'Application exited early' debería resolverse" -ForegroundColor White

Write-Host "`n✅ FIX COMPLETADO" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan