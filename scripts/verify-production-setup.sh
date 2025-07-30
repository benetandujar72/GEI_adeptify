#!/bin/bash

# Script de verificación para el setup de producción - GEI Unified Platform
echo "🔍 === VERIFICACIÓN DE SETUP DE PRODUCCIÓN ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 1.0"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables de verificación
all_checks_passed=true

# Verificar archivos críticos
log_info "Verificando archivos críticos..."

critical_files=(
    "Dockerfile.prod"
    "docker-compose.prod.yml"
    "package.json"
    "server/src/index.ts"
    "scripts/start-production-optimized.sh"
    "render.yaml"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "$file existe"
    else
        log_error "$file NO EXISTE"
        all_checks_passed=false
    fi
done

# Verificar estructura de directorios
log_info "Verificando estructura de directorios..."

critical_dirs=(
    "server/src"
    "server/routes"
    "server/services"
    "client/src"
    "shared"
    "scripts"
    "drizzle"
)

for dir in "${critical_dirs[@]}"; do
    if [ -d "$dir" ]; then
        log_success "$dir existe"
    else
        log_error "$dir NO EXISTE"
        all_checks_passed=false
    fi
done

# Verificar variables de entorno
log_info "Verificando variables de entorno..."

if [ -f "production.env" ]; then
    log_success "production.env existe"
    
    # Verificar variables críticas en production.env
    critical_vars=(
        "DATABASE_URL"
        "SESSION_SECRET"
        "JWT_SECRET"
        "GOOGLE_CLIENT_ID"
        "GEMINI_API_KEY"
    )
    
    env_content=$(cat production.env)
    for var in "${critical_vars[@]}"; do
        if echo "$env_content" | grep -q "^$var="; then
            log_success "$var configurada"
        else
            log_warning "$var NO CONFIGURADA en production.env"
        fi
    done
else
    log_warning "production.env no existe - configurar variables en el entorno"
fi

# Verificar configuración de Docker
log_info "Verificando configuración de Docker..."

if command -v docker &> /dev/null; then
    log_success "Docker está instalado"
    docker_version=$(docker --version)
    log_info "Versión: $docker_version"
else
    log_error "Docker NO está instalado"
    all_checks_passed=false
fi

if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose está instalado"
    compose_version=$(docker-compose --version)
    log_info "Versión: $compose_version"
else
    log_error "Docker Compose NO está instalado"
    all_checks_passed=false
fi

# Verificar configuración de Node.js
log_info "Verificando configuración de Node.js..."

if command -v node &> /dev/null; then
    log_success "Node.js está instalado"
    node_version=$(node --version)
    log_info "Versión: $node_version"
    
    # Verificar versión mínima
    required_version="18.0.0"
    current_version=$(node --version | sed 's/v//')
    if [ "$(printf '%s\n' "$required_version" "$current_version" | sort -V | head -n1)" = "$required_version" ]; then
        log_success "Versión de Node.js compatible"
    else
        log_warning "Versión de Node.js puede ser muy antigua (requerida: $required_version)"
    fi
else
    log_error "Node.js NO está instalado"
    all_checks_passed=false
fi

if command -v npm &> /dev/null; then
    log_success "npm está instalado"
    npm_version=$(npm --version)
    log_info "Versión: $npm_version"
else
    log_error "npm NO está instalado"
    all_checks_passed=false
fi

# Verificar scripts de build
log_info "Verificando scripts de build..."

if [ -f "package.json" ]; then
    # Verificar scripts críticos
    if grep -q '"build:server"' package.json; then
        log_success "Script build:server existe"
    else
        log_error "Script build:server NO existe"
        all_checks_passed=false
    fi
    
    if grep -q '"build:client"' package.json; then
        log_success "Script build:client existe"
    else
        log_error "Script build:client NO existe"
        all_checks_passed=false
    fi
    
    if grep -q '"start"' package.json; then
        log_success "Script start existe"
    else
        log_warning "Script start NO existe"
    fi
fi

# Verificar configuración de Render
log_info "Verificando configuración de Render..."

if [ -f "render.yaml" ]; then
    log_success "render.yaml existe"
    
    # Verificar configuración crítica en render.yaml
    if grep -q "start-production-optimized.sh" render.yaml; then
        log_success "Script de inicio correcto en render.yaml"
    else
        log_error "Script de inicio incorrecto en render.yaml"
        all_checks_passed=false
    fi
    
    if grep -q "healthCheckPath: /health" render.yaml; then
        log_success "Health check configurado en render.yaml"
    else
        log_warning "Health check NO configurado en render.yaml"
    fi
else
    log_error "render.yaml NO existe"
    all_checks_passed=false
fi

# Verificar endpoint de health check
log_info "Verificando endpoint de health check..."

if [ -f "server/src/index.ts" ]; then
    if grep -q "app.get('/health'" server/src/index.ts; then
        log_success "Endpoint /health implementado"
    else
        log_error "Endpoint /health NO implementado"
        all_checks_passed=false
    fi
fi

# Verificar permisos de scripts
log_info "Verificando permisos de scripts..."

scripts=(
    "scripts/start-production-optimized.sh"
    "scripts/deploy-production.sh"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            log_success "$script es ejecutable"
        else
            log_warning "$script NO es ejecutable"
            chmod +x "$script"
            log_info "Permisos corregidos para $script"
        fi
    fi
done

# Resumen final
echo ""
echo "📊 === RESUMEN DE VERIFICACIÓN ==="

if [ "$all_checks_passed" = true ]; then
    log_success "TODAS LAS VERIFICACIONES PASARON"
    echo ""
    echo "🎉 El proyecto está listo para producción"
    echo ""
    echo "📋 PRÓXIMOS PASOS:"
    echo "1. Configurar variables de entorno en el servidor"
    echo "2. Ejecutar: ./scripts/deploy-production.sh"
    echo "3. Verificar que todos los servicios estén funcionando"
    echo "4. Probar endpoints principales"
    echo ""
    echo "🔧 COMANDOS ÚTILES:"
    echo "• Desplegar: ./scripts/deploy-production.sh"
    echo "• Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "• Estado: docker-compose -f docker-compose.prod.yml ps"
    echo "• Parar: docker-compose -f docker-compose.prod.yml down"
else
    log_error "ALGUNAS VERIFICACIONES FALLARON"
    echo ""
    echo "🔧 Por favor, corrige los errores antes del despliegue"
    echo "📋 Revisa los errores marcados con ❌ arriba"
    exit 1
fi 