# Script mejorado para verificar e instalar dependencias
# Ejecutar como administrador en PowerShell

param(
    [switch]$InstallMissing,
    [switch]$SkipDocker,
    [switch]$SkipPython
)

Write-Host "=== Verificación y Instalación de Dependencias GEI_adeptify ===" -ForegroundColor Green
Write-Host "Fecha: $(Get-Date)" -ForegroundColor Gray

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  ADVERTENCIA: No se ejecuta como administrador" -ForegroundColor Yellow
    Write-Host "Algunas instalaciones pueden requerir permisos de administrador" -ForegroundColor Yellow
}

# Función para verificar si un comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Función para obtener versión de un comando
function Get-CommandVersion($command) {
    try {
        $result = & cmd /c $command 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $result.Trim()
        }
        return $null
    } catch {
        return $null
    }
}

# Verificar herramientas principales
Write-Host "`n🔧 Verificando herramientas principales..." -ForegroundColor Cyan

$mainTools = @(
    @{Name="Node.js"; Command="node --version"; Required=$true; InstallCmd="winget install OpenJS.NodeJS"},
    @{Name="npm"; Command="npm --version"; Required=$true; InstallCmd="Incluido con Node.js"},
    @{Name="Python"; Command="python --version"; Required=$true; InstallCmd="winget install Python.Python.3.11"},
    @{Name="pip"; Command="pip --version"; Required=$true; InstallCmd="Incluido con Python"},
    @{Name="Git"; Command="git --version"; Required=$true; InstallCmd="winget install Git.Git"}
)

if (-not $SkipDocker) {
    $mainTools += @{Name="Docker"; Command="docker --version"; Required=$true; InstallCmd="winget install Docker.DockerDesktop"}
}

$missingTools = @()

foreach ($tool in $mainTools) {
    $version = Get-CommandVersion $tool.Command
    if ($version) {
        Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
    } else {
        Write-Host "✗ $($tool.Name): No encontrado" -ForegroundColor Red
        if ($tool.Required) {
            $missingTools += $tool
        }
    }
}

# Instalar herramientas faltantes si se solicita
if ($InstallMissing -and $missingTools.Count -gt 0) {
    Write-Host "`n📦 Instalando herramientas faltantes..." -ForegroundColor Yellow
    
    foreach ($tool in $missingTools) {
        Write-Host "Instalando $($tool.Name)..." -ForegroundColor Yellow
        if ($tool.InstallCmd -ne "Incluido con Node.js" -and $tool.InstallCmd -ne "Incluido con Python") {
            try {
                & cmd /c $tool.InstallCmd
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ $($tool.Name) instalado correctamente" -ForegroundColor Green
                } else {
                    Write-Host "✗ Error instalando $($tool.Name)" -ForegroundColor Red
                }
            } catch {
                Write-Host "✗ Error instalando $($tool.Name): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "`n🔄 Por favor, reinicia tu terminal para que los cambios surtan efecto" -ForegroundColor Yellow
}

# Verificar dependencias del proyecto
Write-Host "`n📋 Verificando dependencias del proyecto..." -ForegroundColor Cyan

# Verificar si existe package.json
if (Test-Path "package.json") {
    Write-Host "✓ package.json encontrado" -ForegroundColor Green
    
    # Verificar si node_modules existe
    if (Test-Path "node_modules") {
        Write-Host "✓ node_modules encontrado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  node_modules no encontrado" -ForegroundColor Yellow
        Write-Host "  Ejecutar: npm install" -ForegroundColor White
    }
} else {
    Write-Host "✗ package.json no encontrado" -ForegroundColor Red
}

# Verificar requirements.txt
if (Test-Path "requirements.txt") {
    Write-Host "✓ requirements.txt encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  requirements.txt no encontrado" -ForegroundColor Yellow
}

# Verificar docker-compose
if (Test-Path "docker-compose.local.yml") {
    Write-Host "✓ docker-compose.local.yml encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  docker-compose.local.yml no encontrado" -ForegroundColor Yellow
}

# Verificar bases de datos
Write-Host "`n🗄️  Verificando bases de datos..." -ForegroundColor Cyan

$dbServices = @(
    @{Name="PostgreSQL"; Port=5432; URL="localhost:5432"},
    @{Name="MongoDB"; Port=27017; URL="localhost:27017"},
    @{Name="Redis"; Port=6379; URL="localhost:6379"}
)

foreach ($db in $dbServices) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $db.Port -InformationLevel Quiet
        if ($connection.TcpTestSucceeded) {
            Write-Host "✓ $($db.Name): Puerto $($db.Port) disponible" -ForegroundColor Green
        } else {
            Write-Host "✗ $($db.Name): Puerto $($db.Port) no disponible" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $($db.Name): Error verificando puerto $($db.Port)" -ForegroundColor Red
    }
}

# Resumen final
Write-Host "`n📊 Resumen de verificación:" -ForegroundColor Cyan
Write-Host "Herramientas principales: $($mainTools.Count - $missingTools.Count)/$($mainTools.Count)" -ForegroundColor White
Write-Host "Bases de datos: Verificar con docker-compose" -ForegroundColor White

Write-Host "`n🚀 Próximos pasos recomendados:" -ForegroundColor Green
Write-Host "1. Si faltan herramientas: Ejecutar con -InstallMissing" -ForegroundColor White
Write-Host "2. Instalar dependencias Node.js: npm install" -ForegroundColor White
Write-Host "3. Instalar dependencias Python: pip install -r requirements.txt" -ForegroundColor White
Write-Host "4. Iniciar bases de datos: docker-compose -f docker-compose.local.yml up -d" -ForegroundColor White
Write-Host "5. Configurar variables de entorno" -ForegroundColor White 