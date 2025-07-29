#!/bin/bash

# Script para probar los servicios core
# EduAI Platform - Microservicios con MCP

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Configuración
SERVICES=(
    "user-service:3001"
    "student-service:3002"
    "course-service:3003"
    "resource-service:3004"
)

# Función para probar un servicio
test_service() {
    local service_name=$1
    local port=$2
    local base_url="http://localhost:${port}"
    
    log "Probando ${service_name} en puerto ${port}..."
    
    # Probar health check
    if curl -f -s "${base_url}/health" > /dev/null 2>&1; then
        log "✓ ${service_name} health check OK"
    else
        error "✗ ${service_name} health check FAILED"
    fi
    
    # Probar root endpoint
    if curl -f -s "${base_url}/" > /dev/null 2>&1; then
        log "✓ ${service_name} root endpoint OK"
    else
        warn "⚠ ${service_name} root endpoint not responding"
    fi
    
    # Probar endpoint específico del servicio
    case $service_name in
        "user-service")
            if curl -f -s "${base_url}/users" > /dev/null 2>&1; then
                log "✓ ${service_name} users endpoint OK"
            else
                warn "⚠ ${service_name} users endpoint not responding"
            fi
            ;;
        "student-service")
            if curl -f -s "${base_url}/students" > /dev/null 2>&1; then
                log "✓ ${service_name} students endpoint OK"
            else
                warn "⚠ ${service_name} students endpoint not responding"
            fi
            ;;
        "course-service")
            if curl -f -s "${base_url}/courses" > /dev/null 2>&1; then
                log "✓ ${service_name} courses endpoint OK"
            else
                warn "⚠ ${service_name} courses endpoint not responding"
            fi
            ;;
    esac
    
    echo ""
}

# Función para probar API Gateway
test_gateway() {
    log "Probando API Gateway..."
    
    local gateway_url="http://localhost:5000"
    
    # Probar health check del gateway
    if curl -f -s "${gateway_url}/health" > /dev/null 2>&1; then
        log "✓ API Gateway health check OK"
    else
        error "✗ API Gateway health check FAILED"
    fi
    
    # Probar status del gateway
    if curl -f -s "${gateway_url}/status" > /dev/null 2>&1; then
        log "✓ API Gateway status endpoint OK"
    else
        warn "⚠ API Gateway status endpoint not responding"
    fi
    
    # Probar routing a microservicios
    if curl -f -s "${gateway_url}/api/v1/users" > /dev/null 2>&1; then
        log "✓ API Gateway -> User Service routing OK"
    else
        warn "⚠ API Gateway -> User Service routing not working"
    fi
    
    if curl -f -s "${gateway_url}/api/v1/students" > /dev/null 2>&1; then
        log "✓ API Gateway -> Student Service routing OK"
    else
        warn "⚠ API Gateway -> Student Service routing not working"
    fi
    
    if curl -f -s "${gateway_url}/api/v1/courses" > /dev/null 2>&1; then
        log "✓ API Gateway -> Course Service routing OK"
    else
        warn "⚠ API Gateway -> Course Service routing not working"
    fi
    
    echo ""
}

# Función para probar base de datos
test_database() {
    log "Probando conexión a base de datos..."
    
    # Verificar que PostgreSQL esté ejecutándose
    if docker ps | grep -q "postgres"; then
        log "✓ PostgreSQL container está ejecutándose"
    else
        warn "⚠ PostgreSQL container no está ejecutándose"
    fi
    
    # Verificar que Redis esté ejecutándose
    if docker ps | grep -q "redis"; then
        log "✓ Redis container está ejecutándose"
    else
        warn "⚠ Redis container no está ejecutándose"
    fi
    
    echo ""
}

# Función para mostrar información detallada de un servicio
show_service_info() {
    local service_name=$1
    local port=$2
    local base_url="http://localhost:${port}"
    
    log "Información detallada de ${service_name}:"
    
    # Health check detallado
    if response=$(curl -s "${base_url}/health" 2>/dev/null); then
        echo "  Health Status: $(echo $response | jq -r '.status' 2>/dev/null || echo 'unknown')"
        echo "  Database: $(echo $response | jq -r '.database' 2>/dev/null || echo 'unknown')"
        echo "  Uptime: $(echo $response | jq -r '.uptime' 2>/dev/null || echo 'unknown')"
        echo "  Environment: $(echo $response | jq -r '.environment' 2>/dev/null || echo 'unknown')"
    else
        echo "  Health Status: UNREACHABLE"
    fi
    
    echo ""
}

# Función principal
main() {
    log "🧪 Iniciando pruebas de servicios core - EduAI Platform"
    log "📅 Fecha: $(date)"
    log "🏗️  Arquitectura: Microservicios con MCP"
    echo ""
    
    # Probar infraestructura
    test_database
    
    # Probar servicios individuales
    log "🔍 Probando servicios individuales..."
    for service in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port <<< "$service"
        test_service "$service_name" "$port"
    done
    
    # Probar API Gateway
    log "🔍 Probando API Gateway..."
    test_gateway
    
    # Mostrar información detallada
    log "📊 Información detallada de servicios:"
    for service in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port <<< "$service"
        show_service_info "$service_name" "$port"
    done
    
    log "🎉 Pruebas completadas!"
    log "💡 Para ver logs detallados: ./scripts/dev-logs.sh"
    log "💡 Para reiniciar servicios: ./scripts/dev-stop.sh && ./scripts/dev-start.sh"
}

# Ejecutar función principal
main "$@"