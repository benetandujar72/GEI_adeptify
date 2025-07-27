# Script para actualizar GitHub con las últimas revisiones
Write-Host "=== Actualizando GitHub con las últimas revisiones ===" -ForegroundColor Green

# Verificar el estado actual
Write-Host "1. Verificando estado del repositorio..." -ForegroundColor Yellow
git status

# Agregar todos los cambios
Write-Host "2. Agregando cambios..." -ForegroundColor Yellow
git add .

# Hacer commit con mensaje descriptivo
Write-Host "3. Haciendo commit..." -ForegroundColor Yellow
$commitMessage = "Update deployment scripts: fixes and improvements to fix-deployment-issues.js, fix-deployment.ps1, simple-deployment-fix.cjs, start-production-improved.js, and verify-database-connection.js"

git commit -m $commitMessage

# Hacer push a GitHub
Write-Host "4. Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ GitHub actualizado exitosamente!" -ForegroundColor Green
Write-Host "Cambios incluidos:" -ForegroundColor Cyan
Write-Host "- Corrección del hook useApi" -ForegroundColor White
Write-Host "- Instalación de dependencias FullCalendar" -ForegroundColor White
Write-Host "- Mejoras en el manejo de API" -ForegroundColor White 