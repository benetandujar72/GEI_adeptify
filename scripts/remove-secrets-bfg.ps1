# Script para eliminar secretos del historial de Git usando BFG Repo-Cleaner
# Este script elimina completamente las claves API del historial

Write-Host "🔒 Eliminando secretos del historial de Git..." -ForegroundColor Green

# 1. Descargar BFG Repo-Cleaner
Write-Host "📥 Descargando BFG Repo-Cleaner..." -ForegroundColor Yellow
$bfgUrl = "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
$bfgPath = "bfg.jar"

if (!(Test-Path $bfgPath)) {
    Invoke-WebRequest -Uri $bfgUrl -OutFile $bfgPath
    Write-Host "✅ BFG descargado correctamente" -ForegroundColor Green
} else {
    Write-Host "✅ BFG ya existe" -ForegroundColor Green
}

# 2. Crear archivo de texto con patrones de secretos
Write-Host "📝 Creando archivo de patrones de secretos..." -ForegroundColor Yellow
$secretsFile = "secrets-to-remove.txt"
@"
sk-[a-zA-Z0-9]{48}
pk_[a-zA-Z0-9]{24}
AIza[a-zA-Z0-9_-]{35}
ghp_[a-zA-Z0-9]{36}
gho_[a-zA-Z0-9]{36}
ghu_[a-zA-Z0-9]{36}
ghs_[a-zA-Z0-9]{36}
ghr_[a-zA-Z0-9]{36}
"@ | Out-File -FilePath $secretsFile -Encoding UTF8

# 3. Crear backup del repositorio
Write-Host "💾 Creando backup del repositorio..." -ForegroundColor Yellow
$backupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path ".git" -Destination $backupDir -Recurse -Force
Write-Host "✅ Backup creado en: $backupDir" -ForegroundColor Green

# 4. Ejecutar BFG para eliminar secretos
Write-Host "🧹 Ejecutando BFG para eliminar secretos..." -ForegroundColor Yellow
java -jar $bfgPath --replace-text $secretsFile .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ BFG ejecutado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error ejecutando BFG" -ForegroundColor Red
    exit 1
}

# 5. Limpiar y reescribir el historial
Write-Host "🧹 Limpiando y reescribiendo historial..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Forzar push al repositorio
Write-Host "📤 Forzando push al repositorio..." -ForegroundColor Yellow
Write-Host "⚠️  ADVERTENCIA: Esto reescribirá el historial del repositorio" -ForegroundColor Red
Write-Host "   Todos los colaboradores necesitarán clonar el repositorio de nuevo" -ForegroundColor Red

$confirm = Read-Host "¿Estás seguro de que quieres continuar? (y/N)"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    git push origin main --force
    Write-Host "✅ Push forzado completado" -ForegroundColor Green
} else {
    Write-Host "❌ Operación cancelada" -ForegroundColor Yellow
}

# 7. Limpiar archivos temporales
Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item $secretsFile -ErrorAction SilentlyContinue
Remove-Item $bfgPath -ErrorAction SilentlyContinue

Write-Host "🎉 Proceso completado!" -ForegroundColor Green
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Notifica a todos los colaboradores que clonen el repositorio de nuevo"
Write-Host "   2. Configura las variables de entorno en el servidor de producción"
Write-Host "   3. Usa .env.example como plantilla para desarrollo local" 