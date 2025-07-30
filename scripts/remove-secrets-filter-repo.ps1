# Script para eliminar secretos usando git filter-repo
# Esta es la herramienta más moderna y recomendada

Write-Host "🔒 Eliminando secretos del historial usando git filter-repo..." -ForegroundColor Green

# 1. Instalar git filter-repo si no está disponible
Write-Host "📥 Verificando git filter-repo..." -ForegroundColor Yellow
try {
    git filter-repo --version | Out-Null
    Write-Host "✅ git filter-repo ya está instalado" -ForegroundColor Green
} catch {
    Write-Host "📥 Instalando git filter-repo..." -ForegroundColor Yellow
    pip install git-filter-repo
}

# 2. Crear backup
Write-Host "💾 Creando backup del repositorio..." -ForegroundColor Yellow
$backupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path ".git" -Destination $backupDir -Recurse -Force
Write-Host "✅ Backup creado en: $backupDir" -ForegroundColor Green

# 3. Crear archivo de patrones de reemplazo
Write-Host "📝 Creando patrones de reemplazo..." -ForegroundColor Yellow
$replaceFile = "replace-patterns.txt"
@"
sk-[a-zA-Z0-9]{48}==>your-openai-api-key-here
pk_[a-zA-Z0-9]{24}==>your-stripe-publishable-key-here
AIza[a-zA-Z0-9_-]{35}==>your-google-api-key-here
ghp_[a-zA-Z0-9]{36}==>your-github-token-here
gho_[a-zA-Z0-9]{36}==>your-github-token-here
ghu_[a-zA-Z0-9]{36}==>your-github-token-here
ghs_[a-zA-Z0-9]{36}==>your-github-token-here
ghr_[a-zA-Z0-9]{36}==>your-github-token-here
"@ | Out-File -FilePath $replaceFile -Encoding UTF8

# 4. Ejecutar git filter-repo
Write-Host "🧹 Ejecutando git filter-repo..." -ForegroundColor Yellow
git filter-repo --replace-text $replaceFile --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ git filter-repo ejecutado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error ejecutando git filter-repo" -ForegroundColor Red
    exit 1
}

# 5. Forzar push
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

# 6. Limpiar
Remove-Item $replaceFile -ErrorAction SilentlyContinue

Write-Host "🎉 Proceso completado!" -ForegroundColor Green 