# Script de instalación de dependencias para GEI_adeptify
# Ejecutar como administrador en PowerShell

Write-Host "=== Instalación de Dependencias para GEI_adeptify ===" -ForegroundColor Green

# Verificar si Chocolatey está instalado
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
} else {
    Write-Host "Chocolatey ya está instalado" -ForegroundColor Green
}

# Instalar Node.js
Write-Host "Instalando Node.js..." -ForegroundColor Yellow
choco install nodejs -y
refreshenv

# Instalar Python
Write-Host "Instalando Python..." -ForegroundColor Yellow
choco install python -y
refreshenv

# Instalar Docker Desktop
Write-Host "Instalando Docker Desktop..." -ForegroundColor Yellow
choco install docker-desktop -y
refreshenv

# Instalar PostgreSQL
Write-Host "Instalando PostgreSQL..." -ForegroundColor Yellow
choco install postgresql -y
refreshenv

# Instalar MongoDB
Write-Host "Instalando MongoDB..." -ForegroundColor Yellow
choco install mongodb -y
refreshenv

# Instalar SQLite
Write-Host "Instalando SQLite..." -ForegroundColor Yellow
choco install sqlite -y
refreshenv

# Instalar herramientas adicionales útiles
Write-Host "Instalando herramientas adicionales..." -ForegroundColor Yellow
choco install git -y
choco install vscode -y
choco install postman -y
choco install redis-64 -y
refreshenv

# Verificar instalaciones
Write-Host "`n=== Verificando instalaciones ===" -ForegroundColor Green

$tools = @(
    @{Name="Node.js"; Command="node --version"},
    @{Name="npm"; Command="npm --version"},
    @{Name="Python"; Command="python --version"},
    @{Name="pip"; Command="pip --version"},
    @{Name="Docker"; Command="docker --version"},
    @{Name="Git"; Command="git --version"}
)

foreach ($tool in $tools) {
    try {
        $version = & cmd /c $tool.Command 2>$null
        if ($version) {
            Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
        } else {
            Write-Host "✗ $($tool.Name): No encontrado" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $($tool.Name): Error al verificar" -ForegroundColor Red
    }
}

# Configurar servicios
Write-Host "`n=== Configurando servicios ===" -ForegroundColor Green

# Iniciar Docker Desktop
Write-Host "Iniciando Docker Desktop..." -ForegroundColor Yellow
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Configurar PostgreSQL
Write-Host "Configurando PostgreSQL..." -ForegroundColor Yellow
$pgData = "C:\Program Files\PostgreSQL\data"
if (!(Test-Path $pgData)) {
    New-Item -ItemType Directory -Path $pgData -Force
}

# Configurar MongoDB
Write-Host "Configurando MongoDB..." -ForegroundColor Yellow
$mongoData = "C:\data\db"
if (!(Test-Path $mongoData)) {
    New-Item -ItemType Directory -Path $mongoData -Force
}

Write-Host "`n=== Instalación completada ===" -ForegroundColor Green
Write-Host "Por favor, reinicia tu terminal para que todos los cambios surtan efecto." -ForegroundColor Yellow
Write-Host "`nPróximos pasos:" -ForegroundColor Cyan
Write-Host "1. Reinicia Docker Desktop" -ForegroundColor White
Write-Host "2. Ejecuta: docker-compose up -d" -ForegroundColor White
Write-Host "3. Instala las dependencias del proyecto: npm install" -ForegroundColor White
Write-Host "4. Configura las variables de entorno" -ForegroundColor White 