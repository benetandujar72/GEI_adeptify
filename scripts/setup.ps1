# GEI Unified Platform - Script de Instalación Rápida para Windows
# Este script configura automáticamente el entorno de desarrollo

param(
    [switch]$SkipDocker,
    [switch]$SkipBuild
)

# Configuración de colores para PowerShell
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# Función para imprimir mensajes
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Host "🚀 GEI Unified Platform - Instalación Automática" -ForegroundColor $White
Write-Host "==================================================" -ForegroundColor $White
Write-Host ""

# Verificar si Node.js está instalado
function Test-NodeJS {
    Write-Status "Verificando Node.js..."
    
    try {
        $nodeVersion = node --version
        $nodeMajor = $nodeVersion.Split('.')[0].Replace('v', '')
        
        if ([int]$nodeMajor -lt 18) {
            Write-Error "Node.js versión 18+ es requerida. Versión actual: $nodeVersion"
            exit 1
        }
        
        Write-Success "Node.js $nodeVersion detectado"
    }
    catch {
        Write-Error "Node.js no está instalado. Por favor, instala Node.js 18+"
        exit 1
    }
}

# Verificar si Docker está instalado
function Test-Docker {
    Write-Status "Verificando Docker..."
    
    try {
        $dockerVersion = docker --version
        docker info | Out-Null
        Write-Success "Docker $dockerVersion detectado"
        return $true
    }
    catch {
        Write-Warning "Docker no está disponible. Algunas funcionalidades pueden no estar disponibles"
        return $false
    }
}

# Instalar dependencias
function Install-Dependencies {
    Write-Status "Instalando dependencias..."
    
    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }
    
    Write-Success "Dependencias instaladas correctamente"
}

# Configurar variables de entorno
function Setup-Environment {
    Write-Status "Configurando variables de entorno..."
    
    if (-not (Test-Path ".env")) {
        if (Test-Path "env.example") {
            Copy-Item "env.example" ".env"
            Write-Success "Archivo .env creado desde env.example"
        } else {
            Write-Warning "No se encontró env.example. Crea manualmente el archivo .env"
        }
    } else {
        Write-Warning "El archivo .env ya existe. Verifica la configuración"
    }
}

# Inicializar base de datos
function Initialize-Database {
    Write-Status "Inicializando base de datos..."
    
    if (-not $SkipDocker -and (Test-Docker)) {
        Write-Status "Iniciando servicios con Docker..."
        docker-compose up -d postgres redis
        
        # Esperar a que PostgreSQL esté listo
        Write-Status "Esperando a que PostgreSQL esté listo..."
        Start-Sleep -Seconds 10
        
        # Ejecutar migraciones
        Write-Status "Ejecutando migraciones..."
        npm run db:push
        
        Write-Success "Base de datos inicializada correctamente"
    } else {
        Write-Warning "Docker no está disponible o se omitió. Configura manualmente la base de datos"
    }
}

# Construir la aplicación
function Build-Application {
    if (-not $SkipBuild) {
        Write-Status "Construyendo la aplicación..."
        npm run build
        Write-Success "Aplicación construida correctamente"
    } else {
        Write-Warning "Construcción omitida"
    }
}

# Verificar la instalación
function Test-Installation {
    Write-Status "Verificando la instalación..."
    
    # Verificar archivos críticos
    $criticalFiles = @("package.json", "tsconfig.json", "tailwind.config.ts", "vite.config.ts")
    foreach ($file in $criticalFiles) {
        if (-not (Test-Path $file)) {
            Write-Error "Archivo crítico faltante: $file"
            exit 1
        }
    }
    
    # Verificar directorios críticos
    $criticalDirs = @("client/src", "server", "shared", "scripts")
    foreach ($dir in $criticalDirs) {
        if (-not (Test-Path $dir)) {
            Write-Error "Directorio crítico faltante: $dir"
            exit 1
        }
    }
    
    Write-Success "Instalación verificada correctamente"
}

# Mostrar información final
function Show-FinalInfo {
    Write-Host ""
    Write-Host "🎉 ¡Instalación completada exitosamente!" -ForegroundColor $Green
    Write-Host "==================================================" -ForegroundColor $White
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor $White
    Write-Host "1. Configura las variables de entorno en .env" -ForegroundColor $White
    Write-Host "2. Ejecuta: npm run dev" -ForegroundColor $White
    Write-Host "3. Abre: http://localhost:3001" -ForegroundColor $White
    Write-Host ""
    Write-Host "🐳 Con Docker:" -ForegroundColor $White
    Write-Host "1. docker-compose up -d" -ForegroundColor $White
    Write-Host "2. Abre: http://localhost:3000" -ForegroundColor $White
    Write-Host ""
    Write-Host "📚 Documentación:" -ForegroundColor $White
    Write-Host "- README.md para más información" -ForegroundColor $White
    Write-Host "- env.example para configuración de variables" -ForegroundColor $White
    Write-Host ""
    Write-Host "🚀 ¡Disfruta de GEI Unified Platform!" -ForegroundColor $Green
}

# Función principal
function Main {
    Write-Host "Iniciando instalación automática..." -ForegroundColor $White
    Write-Host ""
    
    Test-NodeJS
    Install-Dependencies
    Setup-Environment
    Initialize-Database
    Build-Application
    Test-Installation
    Show-FinalInfo
}

# Ejecutar función principal
Main 