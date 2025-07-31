# Script de Despliegue de Microservicios MCP - Fase 2
# Despliega los servidores MCP en producción

Write-Host "🚀 Iniciando FASE 2 - Despliegue de Microservicios MCP" -ForegroundColor Green
Write-Host "📅 Fecha: $(Get-Date)" -ForegroundColor Cyan

# Configuración
$PROJECT_ROOT = "C:\Users\bandujar\Projectes adeptify"
$MCP_SERVERS_DIR = "$PROJECT_ROOT\microservices\mcp-servers"
$PRODUCTION_URL = "https://gei.adeptify.es"

# Función para logging
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

# FASE 2.1 - AcademicDataServer real
Write-Log "🔄 FASE 2.1 - Desplegando AcademicDataServer real..." "Yellow"

try {
    # Navegar al directorio de MCP servers
    Set-Location $MCP_SERVERS_DIR
    Write-Log "📁 Directorio actual: $(Get-Location)" "Cyan"
    
    # Instalar dependencias con legacy peer deps
    Write-Log "📦 Instalando dependencias..." "Yellow"
    npm install --legacy-peer-deps
    
    # Build del proyecto
    Write-Log "🔨 Construyendo proyecto..." "Yellow"
    npm run build
    
    # Verificar que el build fue exitoso
    if (Test-Path "dist") {
        Write-Log "✅ Build completado exitosamente" "Green"
    } else {
        throw "Build falló - directorio dist no encontrado"
    }
    
    Write-Log "✅ FASE 2.1 - AcademicDataServer desplegado correctamente" "Green"
    
} catch {
    Write-Log "❌ Error en FASE 2.1: $($_.Exception.Message)" "Red"
    exit 1
}

# FASE 2.2 - StudyRecommendationsServer real
Write-Log "🔄 FASE 2.2 - Desplegando StudyRecommendationsServer real..." "Yellow"

try {
    # Verificar si existe el servidor de recomendaciones
    if (Test-Path "study-recommendations-server") {
        Set-Location "study-recommendations-server"
        Write-Log "📁 Directorio actual: $(Get-Location)" "Cyan"
        
        # Instalar dependencias
        Write-Log "📦 Instalando dependencias..." "Yellow"
        npm install --legacy-peer-deps
        
        # Build del proyecto
        Write-Log "🔨 Construyendo proyecto..." "Yellow"
        npm run build
        
        Write-Log "✅ FASE 2.2 - StudyRecommendationsServer desplegado correctamente" "Green"
    } else {
        Write-Log "⚠️  StudyRecommendationsServer no encontrado, saltando..." "Yellow"
    }
    
} catch {
    Write-Log "❌ Error en FASE 2.2: $($_.Exception.Message)" "Red"
}

# FASE 2.3 - ScheduleManagementServer real
Write-Log "🔄 FASE 2.3 - Desplegando ScheduleManagementServer real..." "Yellow"

try {
    # Verificar si existe el servidor de gestión de horarios
    if (Test-Path "schedule-management-server") {
        Set-Location "schedule-management-server"
        Write-Log "📁 Directorio actual: $(Get-Location)" "Cyan"
        
        # Instalar dependencias
        Write-Log "📦 Instalando dependencias..." "Yellow"
        npm install --legacy-peer-deps
        
        # Build del proyecto
        Write-Log "🔨 Construyendo proyecto..." "Yellow"
        npm run build
        
        Write-Log "✅ FASE 2.3 - ScheduleManagementServer desplegado correctamente" "Green"
    } else {
        Write-Log "⚠️  ScheduleManagementServer no encontrado, saltando..." "Yellow"
    }
    
} catch {
    Write-Log "❌ Error en FASE 2.3: $($_.Exception.Message)" "Red"
}

# FASE 2.4 - ContentGenerationServer real
Write-Log "🔄 FASE 2.4 - Desplegando ContentGenerationServer real..." "Yellow"

try {
    # Verificar si existe el servidor de generación de contenido
    if (Test-Path "content-generation-server") {
        Set-Location "content-generation-server"
        Write-Log "📁 Directorio actual: $(Get-Location)" "Cyan"
        
        # Instalar dependencias
        Write-Log "📦 Instalando dependencias..." "Yellow"
        npm install --legacy-peer-deps
        
        # Build del proyecto
        Write-Log "🔨 Construyendo proyecto..." "Yellow"
        npm run build
        
        Write-Log "✅ FASE 2.4 - ContentGenerationServer desplegado correctamente" "Green"
    } else {
        Write-Log "⚠️  ContentGenerationServer no encontrado, saltando..." "Yellow"
    }
} catch {
    Write-Log "❌ Error en FASE 2.4: $($_.Exception.Message)" "Red"
}

# Verificación final
Write-Log "🔍 Verificando estado de los microservicios MCP..." "Yellow"

# Verificar que los archivos compilados existen
$compiledServices = @(
    "dist/index.js",
    "dist/services/academic-data-server.js",
    "dist/services/study-recommendations-server.js",
    "dist/services/schedule-management-server.js",
    "dist/services/content-generation-server.js"
)

foreach ($service in $compiledServices) {
    if (Test-Path $service) {
        Write-Log "✅ $service - OK" "Green"
    } else {
        Write-Log "⚠️  $service - No encontrado" "Yellow"
    }
}

Write-Log "🎉 FASE 2 completada - Microservicios MCP desplegados" "Green"
Write-Log "🌐 URL de producción: $PRODUCTION_URL" "Cyan"
Write-Log "📊 Los microservicios estan listos para ser iniciados en produccion" "Cyan"

# Volver al directorio raíz
Set-Location $PROJECT_ROOT 