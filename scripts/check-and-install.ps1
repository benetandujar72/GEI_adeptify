# Script para verificar herramientas instaladas y proporcionar instrucciones
Write-Host "=== Verificación de Herramientas de Desarrollo ===" -ForegroundColor Green
Write-Host "Fecha: $(Get-Date)" -ForegroundColor Gray

$tools = @(
    @{Name="Node.js"; Command="node --version"; InstallCommand="winget install OpenJS.NodeJS"},
    @{Name="npm"; Command="npm --version"; InstallCommand="Incluido con Node.js"},
    @{Name="Python"; Command="python --version"; InstallCommand="winget install Python.Python.3.11"},
    @{Name="pip"; Command="pip --version"; InstallCommand="Incluido con Python"},
    @{Name="Docker"; Command="docker --version"; InstallCommand="winget install Docker.DockerDesktop"},
    @{Name="Git"; Command="git --version"; InstallCommand="winget install Git.Git"},
    @{Name="VS Code"; Command="code --version"; InstallCommand="winget install Microsoft.VisualStudioCode"}
)

$installed = @()
$missing = @()

foreach ($tool in $tools) {
    try {
        $version = Invoke-Expression $tool.Command 2>$null
        if ($version -and $version -notlike "*error*") {
            Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
            $installed += $tool.Name
        } else {
            Write-Host "✗ $($tool.Name): No encontrado" -ForegroundColor Red
            $missing += $tool
        }
    } catch {
        Write-Host "✗ $($tool.Name): No encontrado" -ForegroundColor Red
        $missing += $tool
    }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "✅ Instaladas: $($installed.Count)/$($tools.Count)" -ForegroundColor Green
Write-Host "❌ Faltantes: $($missing.Count)" -ForegroundColor Red

if ($missing.Count -gt 0) {
    Write-Host "`n=== INSTRUCCIONES DE INSTALACIÓN ===" -ForegroundColor Yellow
    
    foreach ($tool in $missing) {
        Write-Host "`n📦 $($tool.Name):" -ForegroundColor Cyan
        Write-Host "   Comando: $($tool.InstallCommand)" -ForegroundColor White
        
        if ($tool.Name -eq "Docker") {
            Write-Host "   Nota: Después de instalar Docker Desktop, reinicia tu PC" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n=== COMANDOS PARA EJECUTAR ===" -ForegroundColor Green
    foreach ($tool in $missing) {
        if ($tool.InstallCommand -notlike "*Incluido*") {
            Write-Host $tool.InstallCommand -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`n🎉 ¡Todas las herramientas están instaladas!" -ForegroundColor Green
    Write-Host "Puedes proceder con la configuración del proyecto." -ForegroundColor White
}

Write-Host "`n=== PRÓXIMOS PASOS ===" -ForegroundColor Cyan
Write-Host "1. Instala las herramientas faltantes usando los comandos anteriores" -ForegroundColor White
Write-Host "2. Reinicia tu terminal después de las instalaciones" -ForegroundColor White
Write-Host "3. Ejecuta: .\scripts\setup-local-env.ps1" -ForegroundColor Yellow
Write-Host "4. Ejecuta: docker-compose -f docker-compose.local.yml up -d" -ForegroundColor Yellow
Write-Host "5. Instala dependencias: npm install (en cada carpeta del proyecto)" -ForegroundColor Yellow 