# Script simple para instalar dependencias básicas
Write-Host "=== Instalación de Dependencias Básicas ===" -ForegroundColor Green

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

# Instalar Git
Write-Host "Instalando Git..." -ForegroundColor Yellow
choco install git -y
refreshenv

# Instalar VS Code
Write-Host "Instalando VS Code..." -ForegroundColor Yellow
choco install vscode -y
refreshenv

Write-Host "Instalación completada. Por favor reinicia tu terminal." -ForegroundColor Green 