#!/bin/bash

# Script para detener el entorno de desarrollo local
# EduAI Platform - Microservicios con MCP

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Detener procesos por PID
stop_process() {
    local service_name=$1
    local pid_file=".pids/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "Deteniendo $service_name (PID: $pid)..."
            kill "$pid"
            rm "$pid_file"
        else
            warn "$service_name ya no está ejecutándose"
            rm "$pid_file"
        fi
    else
        warn "No se encontró PID para $service_name"
    fi
}

# Detener todos los microservicios
stop_microservices() {
    log "Deteniendo microservicios..."
    
    stop_process "user-service"
    stop_process "student-service"
    stop_process "course-service"
    stop_process "resource-service"
    stop_process "communication-service"
    stop_process "analytics-service"
    stop_process "llm-gateway"
    stop_process "ai-services"
    stop_process "mcp-orchestrator"
    
    log "✓ Microservicios detenidos"
}

# Detener servicios principales
stop_main_services() {
    log "Deteniendo servicios principales..."
    
    stop_process "gateway"
    stop_process "server"
    stop_process "client"
    
    log "✓ Servicios principales detenidos"
}

# Detener infraestructura
stop_infrastructure() {
    log "Deteniendo servicios de infraestructura..."
    
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml down --remove-orphans
        log "✓ Servicios de infraestructura detenidos"
    else
        warn "No se encontró docker-compose.dev.yml"
    fi
}

# Limpiar archivos temporales
cleanup() {
    log "Limpiando archivos temporales..."
    
    # Eliminar directorio de PIDs
    if [ -d ".pids" ]; then
        rm -rf .pids
        log "✓ Directorio .pids eliminado"
    fi
    
    # Limpiar logs temporales
    if [ -d "logs" ]; then
        find logs -name "*.log" -type f -delete
        log "✓ Logs temporales eliminados"
    fi
    
    log "✓ Limpieza completada"
}

# Función principal
main() {
    log "🛑 Deteniendo entorno de desarrollo - EduAI Platform"
    
    # Detener servicios en orden
    stop_microservices
    stop_main_services
    stop_infrastructure
    cleanup
    
    log "🎉 ¡Entorno de desarrollo detenido exitosamente!"
    log "💡 Para reiniciar: ./scripts/dev-start.sh"
}

# Ejecutar función principal
main "$@"