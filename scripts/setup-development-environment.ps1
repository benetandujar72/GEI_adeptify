# Script principal para configurar el entorno de desarrollo completo
# Ejecutar como administrador en PowerShell

param(
    [switch]$SkipDependencies,
    [switch]$SkipDatabases,
    [switch]$SkipPython,
    [switch]$SkipNode,
    [switch]$Force
)

Write-Host "=== Configuración del Entorno de Desarrollo GEI_adeptify ===" -ForegroundColor Green
Write-Host "Fecha: $(Get-Date)" -ForegroundColor Gray

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como administrador" -ForegroundColor Red
    Write-Host "Por favor, ejecuta PowerShell como administrador y vuelve a intentarlo" -ForegroundColor Yellow
    exit 1
}

# Función para confirmar acción
function Confirm-Action {
    param([string]$Message)
    if (-not $Force) {
        $response = Read-Host "$Message (s/N)"
        return $response -eq "s" -or $response -eq "S"
    }
    return $true
}

# Función para verificar si un comando existe
function Test-Command {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

# Paso 1: Instalar dependencias del sistema
if (-not $SkipDependencies) {
    Write-Host "`n=== PASO 1: Instalando dependencias del sistema ===" -ForegroundColor Cyan
    
    if (Confirm-Action "¿Instalar Node.js, Python, Docker y bases de datos?") {
        & "$PSScriptRoot\install-dependencies.ps1"
    }
} else {
    Write-Host "Saltando instalación de dependencias del sistema..." -ForegroundColor Yellow
}

# Paso 2: Configurar bases de datos
if (-not $SkipDatabases) {
    Write-Host "`n=== PASO 2: Configurando bases de datos ===" -ForegroundColor Cyan
    
    if (Confirm-Action "¿Configurar bases de datos con Docker Compose?") {
        Write-Host "Iniciando servicios de bases de datos..." -ForegroundColor Yellow
        docker-compose -f docker-compose.local.yml up -d
        
        Write-Host "Esperando que los servicios estén listos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Verificar que los servicios estén funcionando
        $services = @("gei_postgres", "gei_mongodb", "gei_redis")
        foreach ($service in $services) {
            $status = docker ps --filter "name=$service" --format "table {{.Status}}"
            if ($status -like "*Up*") {
                Write-Host "✓ $service está funcionando" -ForegroundColor Green
            } else {
                Write-Host "✗ $service no está funcionando" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "Saltando configuración de bases de datos..." -ForegroundColor Yellow
}

# Paso 3: Configurar variables de entorno
Write-Host "`n=== PASO 3: Configurando variables de entorno ===" -ForegroundColor Cyan

if (Confirm-Action "¿Configurar variables de entorno locales?") {
    & "$PSScriptRoot\setup-local-env.ps1"
}

# Paso 4: Instalar dependencias de Python
if (-not $SkipPython) {
    Write-Host "`n=== PASO 4: Instalando dependencias de Python ===" -ForegroundColor Cyan
    
    if (Test-Command "python") {
        if (Confirm-Action "¿Instalar dependencias de Python?") {
            & "$PSScriptRoot\install-python-deps.ps1"
        }
    } else {
        Write-Host "Python no está instalado. Instálalo primero ejecutando el script de dependencias." -ForegroundColor Red
    }
} else {
    Write-Host "Saltando instalación de dependencias de Python..." -ForegroundColor Yellow
}

# Paso 5: Instalar dependencias de Node.js
if (-not $SkipNode) {
    Write-Host "`n=== PASO 5: Instalando dependencias de Node.js ===" -ForegroundColor Cyan
    
    if (Test-Command "npm") {
        if (Confirm-Action "¿Instalar dependencias de Node.js?") {
            Write-Host "Instalando dependencias del cliente..." -ForegroundColor Yellow
            Set-Location "client"
            npm install
            Set-Location ".."
            
            Write-Host "Instalando dependencias del servidor..." -ForegroundColor Yellow
            Set-Location "server"
            npm install
            Set-Location ".."
            
            Write-Host "Instalando dependencias del gateway..." -ForegroundColor Yellow
            Set-Location "gateway"
            npm install
            Set-Location ".."
            
            Write-Host "Instalando dependencias de microservicios..." -ForegroundColor Yellow
            Get-ChildItem "microservices" -Directory | ForEach-Object {
                if (Test-Path "$($_.FullName)/package.json") {
                    Write-Host "Instalando en $($_.Name)..." -ForegroundColor Gray
                    Set-Location $_.FullName
                    npm install
                    Set-Location "../../"
                }
            }
        }
    } else {
        Write-Host "npm no está instalado. Instálalo primero ejecutando el script de dependencias." -ForegroundColor Red
    }
} else {
    Write-Host "Saltando instalación de dependencias de Node.js..." -ForegroundColor Yellow
}

# Paso 6: Verificar instalación
Write-Host "`n=== PASO 6: Verificando instalación ===" -ForegroundColor Cyan

$checks = @(
    @{Name="Node.js"; Command="node --version"},
    @{Name="npm"; Command="npm --version"},
    @{Name="Python"; Command="python --version"},
    @{Name="Docker"; Command="docker --version"},
    @{Name="Docker Compose"; Command="docker-compose --version"},
    @{Name="PostgreSQL"; Command="docker ps --filter name=gei_postgres --format '{{.Status}}'"},
    @{Name="MongoDB"; Command="docker ps --filter name=gei_mongodb --format '{{.Status}}'"},
    @{Name="Redis"; Command="docker ps --filter name=gei_redis --format '{{.Status}}'"}
)

$allPassed = $true
foreach ($check in $checks) {
    try {
        $result = Invoke-Expression $check.Command 2>$null
        if ($result -and $result -notlike "*error*") {
            Write-Host "✓ $($check.Name): OK" -ForegroundColor Green
        } else {
            Write-Host "✗ $($check.Name): No disponible" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "✗ $($check.Name): Error" -ForegroundColor Red
        $allPassed = $false
    }
}

# Resumen final
Write-Host "`n=== RESUMEN DE INSTALACIÓN ===" -ForegroundColor Green

if ($allPassed) {
    Write-Host "✅ Todas las dependencias están instaladas correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunas dependencias no están disponibles" -ForegroundColor Yellow
}

Write-Host "`n=== URLs IMPORTANTES ===" -ForegroundColor Cyan
Write-Host "📊 pgAdmin (PostgreSQL): http://localhost:5050" -ForegroundColor White
Write-Host "   Usuario: admin@adeptify.es / Contraseña: admin123" -ForegroundColor Gray
Write-Host "📈 MongoDB Express: http://localhost:8081" -ForegroundColor White
Write-Host "   Usuario: admin / Contraseña: admin123" -ForegroundColor Gray
Write-Host "🌐 Aplicación: http://localhost:3000" -ForegroundColor White
Write-Host "🔌 API: http://localhost:3001" -ForegroundColor White

Write-Host "`n=== PRÓXIMOS PASOS ===" -ForegroundColor Cyan
Write-Host "1. Edita los archivos .env con tus claves reales" -ForegroundColor White
Write-Host "2. Inicia el servidor: npm run dev (desde la carpeta server)" -ForegroundColor White
Write-Host "3. Inicia el cliente: npm start (desde la carpeta client)" -ForegroundColor White
Write-Host "4. Para activar el entorno virtual de Python: .\venv\Scripts\Activate.ps1" -ForegroundColor White

Write-Host "`n=== COMANDOS ÚTILES ===" -ForegroundColor Cyan
Write-Host "🔄 Reiniciar servicios: docker-compose -f docker-compose.local.yml restart" -ForegroundColor White
Write-Host "⏹️  Detener servicios: docker-compose -f docker-compose.local.yml down" -ForegroundColor White
Write-Host "📋 Ver logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor White
Write-Host "🧹 Limpiar Docker: docker system prune -a" -ForegroundColor White

Write-Host "`n🎉 ¡Entorno de desarrollo configurado!" -ForegroundColor Green
Write-Host "Fecha de finalización: $(Get-Date)" -ForegroundColor Gray 