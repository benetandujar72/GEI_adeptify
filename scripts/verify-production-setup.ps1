# Script de verificación para el setup de producción - GEI Unified Platform
Write-Host "🔍 === VERIFICACIÓN DE SETUP DE PRODUCCIÓN ===" -ForegroundColor Blue
Write-Host "📅 Timestamp: $(Get-Date)" -ForegroundColor Gray
Write-Host "🔧 Versión del script: 1.0" -ForegroundColor Gray
Write-Host ""

# Variables de verificación
$allChecksPassed = $true

# Función para logging
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
    $script:allChecksPassed = $false
}

# Verificar archivos críticos
Write-Info "Verificando archivos críticos..."

$criticalFiles = @(
    "Dockerfile.prod",
    "docker-compose.prod.yml",
    "package.json",
    "server/src/index.ts",
    "scripts/start-production-optimized.sh",
    "render.yaml"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Success "$file existe"
    } else {
        Write-Error "$file NO EXISTE"
    }
}

# Verificar estructura de directorios
Write-Info "Verificando estructura de directorios..."

$criticalDirs = @(
    "server/src",
    "server/routes",
    "server/services",
    "client/src",
    "shared",
    "scripts",
    "drizzle"
)

foreach ($dir in $criticalDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-Success "$dir existe"
    } else {
        Write-Error "$dir NO EXISTE"
    }
}

# Verificar variables de entorno
Write-Info "Verificando variables de entorno..."

if (Test-Path "production.env") {
    Write-Success "production.env existe"
    
    # Verificar variables críticas en production.env
    $criticalVars = @(
        "DATABASE_URL",
        "SESSION_SECRET",
        "JWT_SECRET",
        "GOOGLE_CLIENT_ID",
        "GEMINI_API_KEY"
    )
    
    $envContent = Get-Content "production.env" -Raw
    foreach ($var in $criticalVars) {
        if ($envContent -match "^$var=") {
            Write-Success "$var configurada"
        } else {
            Write-Warning "$var NO CONFIGURADA en production.env"
        }
    }
} else {
    Write-Warning "production.env no existe - configurar variables en el entorno"
}

# Verificar configuración de Docker
Write-Info "Verificando configuración de Docker..."

try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker está instalado"
        Write-Info "Versión: $dockerVersion"
    } else {
        Write-Error "Docker NO está instalado"
    }
} catch {
    Write-Error "Docker NO está instalado"
}

try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Success "Docker Compose está instalado"
        Write-Info "Versión: $composeVersion"
    } else {
        Write-Error "Docker Compose NO está instalado"
    }
} catch {
    Write-Error "Docker Compose NO está instalado"
}

# Verificar configuración de Node.js
Write-Info "Verificando configuración de Node.js..."

try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "Node.js está instalado"
        Write-Info "Versión: $nodeVersion"
        
        # Verificar versión mínima
        $requiredVersion = "18.0.0"
        $currentVersion = $nodeVersion.TrimStart('v')
        if ([System.Version]$currentVersion -ge [System.Version]$requiredVersion) {
            Write-Success "Versión de Node.js compatible"
        } else {
            Write-Warning "Versión de Node.js puede ser muy antigua (requerida: $requiredVersion)"
        }
    } else {
        Write-Error "Node.js NO está instalado"
    }
} catch {
    Write-Error "Node.js NO está instalado"
}

try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Success "npm está instalado"
        Write-Info "Versión: $npmVersion"
    } else {
        Write-Error "npm NO está instalado"
    }
} catch {
    Write-Error "npm NO está instalado"
}

# Verificar scripts de build
Write-Info "Verificando scripts de build..."

if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw
    
    # Verificar scripts críticos
    if ($packageContent -match '"build:server"') {
        Write-Success "Script build:server existe"
    } else {
        Write-Error "Script build:server NO existe"
    }
    
    if ($packageContent -match '"build:client"') {
        Write-Success "Script build:client existe"
    } else {
        Write-Error "Script build:client NO existe"
    }
    
    if ($packageContent -match '"start"') {
        Write-Success "Script start existe"
    } else {
        Write-Warning "Script start NO existe"
    }
}

# Verificar configuración de Render
Write-Info "Verificando configuración de Render..."

if (Test-Path "render.yaml") {
    Write-Success "render.yaml existe"
    
    $renderContent = Get-Content "render.yaml" -Raw
    
    # Verificar configuración crítica en render.yaml
    if ($renderContent -match "start-production-optimized.sh") {
        Write-Success "Script de inicio correcto en render.yaml"
    } else {
        Write-Error "Script de inicio incorrecto en render.yaml"
    }
    
    if ($renderContent -match "healthCheckPath: /health") {
        Write-Success "Health check configurado en render.yaml"
    } else {
        Write-Warning "Health check NO configurado en render.yaml"
    }
} else {
    Write-Error "render.yaml NO existe"
}

# Verificar endpoint de health check
Write-Info "Verificando endpoint de health check..."

if (Test-Path "server/src/index.ts") {
    $indexContent = Get-Content "server/src/index.ts" -Raw
    if ($indexContent -match "app\.get\('/health'") {
        Write-Success "Endpoint /health implementado"
    } else {
        Write-Error "Endpoint /health NO implementado"
    }
}

# Verificar permisos de scripts
Write-Info "Verificando permisos de scripts..."

$scripts = @(
    "scripts/start-production-optimized.sh",
    "scripts/deploy-production.sh"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Success "$script existe"
    } else {
        Write-Warning "$script NO existe"
    }
}

# Resumen final
Write-Host ""
Write-Host "📊 === RESUMEN DE VERIFICACIÓN ===" -ForegroundColor Cyan

if ($allChecksPassed) {
    Write-Success "TODAS LAS VERIFICACIONES PASARON"
    Write-Host ""
    Write-Host "🎉 El proyecto está listo para producción" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Yellow
    Write-Host "1. Configurar variables de entorno en el servidor"
    Write-Host "2. Ejecutar: docker-compose -f docker-compose.prod.yml up -d"
    Write-Host "3. Verificar que todos los servicios estén funcionando"
    Write-Host "4. Probar endpoints principales"
    Write-Host ""
    Write-Host "🔧 COMANDOS ÚTILES:" -ForegroundColor Yellow
    Write-Host "• Desplegar: docker-compose -f docker-compose.prod.yml up -d"
    Write-Host "• Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
    Write-Host "• Estado: docker-compose -f docker-compose.prod.yml ps"
    Write-Host "• Parar: docker-compose -f docker-compose.prod.yml down"
} else {
    Write-Error "ALGUNAS VERIFICACIONES FALLARON"
    Write-Host ""
    Write-Host "🔧 Por favor, corrige los errores antes del despliegue" -ForegroundColor Red
    Write-Host "📋 Revisa los errores marcados con ❌ arriba" -ForegroundColor Red
    exit 1
} 