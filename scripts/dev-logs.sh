#!/bin/bash

# Script para ver logs de servicios en desarrollo
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

# Configuración
SERVICES=(
    "user-service"
    "student-service"
    "course-service"
    "api-gateway"
    "server"
    "client"
)

# Función para mostrar logs de un servicio
show_service_logs() {
    local service_name=$1
    local pid_file=".pids/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "📋 Logs de ${service_name} (PID: $pid):"
            echo "----------------------------------------"
            # En desarrollo, los logs van a la consola, así que no podemos capturarlos directamente
            # Pero podemos mostrar información del proceso
            ps -p "$pid" -o pid,ppid,cmd,etime 2>/dev/null || echo "Proceso no encontrado"
        else
            warn "⚠ ${service_name} no está ejecutándose (PID: $pid)"
        fi
    else
        warn "⚠ No se encontró PID para ${service_name}"
    fi
    echo ""
}

# Función para mostrar logs de Docker
show_docker_logs() {
    log "🐳 Logs de contenedores Docker:"
    echo "----------------------------------------"
    
    # PostgreSQL logs
    if docker ps | grep -q "postgres"; then
        log "📊 PostgreSQL logs:"
        docker logs --tail=10 gei-postgres-dev 2>/dev/null || echo "No se pudieron obtener logs de PostgreSQL"
        echo ""
    fi
    
    # Redis logs
    if docker ps | grep -q "redis"; then
        log "🔴 Redis logs:"
        docker logs --tail=10 gei-redis-dev 2>/dev/null || echo "No se pudieron obtener logs de Redis"
        echo ""
    fi
}

# Función para mostrar logs de archivos
show_file_logs() {
    log "📄 Logs de archivos:"
    echo "----------------------------------------"
    
    # Gateway logs
    if [ -f "logs/gateway-combined.log" ]; then
        log "🔗 Gateway logs (últimas 10 líneas):"
        tail -10 logs/gateway-combined.log 2>/dev/null || echo "No se pudieron leer logs del gateway"
        echo ""
    fi
    
    # Error logs
    if [ -f "logs/gateway-error.log" ]; then
        log "❌ Gateway error logs (últimas 10 líneas):"
        tail -10 logs/gateway-error.log 2>/dev/null || echo "No se pudieron leer logs de errores del gateway"
        echo ""
    fi
}

# Función para mostrar estado de servicios
show_service_status() {
    log "📊 Estado de servicios:"
    echo "----------------------------------------"
    
    for service in "${SERVICES[@]}"; do
        local pid_file=".pids/${service}.pid"
        
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                echo "✅ ${service}: Ejecutándose (PID: $pid)"
            else
                echo "❌ ${service}: No ejecutándose (PID: $pid - muerto)"
            fi
        else
            echo "⚠️  ${service}: PID no encontrado"
        fi
    done
    echo ""
}

# Función para mostrar información del sistema
show_system_info() {
    log "💻 Información del sistema:"
    echo "----------------------------------------"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
    echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
    echo "Uptime: $(uptime -p)"
    echo ""
}

# Función para mostrar puertos en uso
show_ports() {
    log "🔌 Puertos en uso:"
    echo "----------------------------------------"
    
    local ports=("3000" "3001" "3002" "3003" "5000" "5173" "5432" "6379")
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            local service_name=""
            case $port in
                "3000") service_name="Server (Legacy)" ;;
                "3001") service_name="User Service" ;;
                "3002") service_name="Student Service" ;;
                "3003") service_name="Course Service" ;;
                "5000") service_name="API Gateway" ;;
                "5173") service_name="Client (Frontend)" ;;
                "5432") service_name="PostgreSQL" ;;
                "6379") service_name="Redis" ;;
            esac
            echo "✅ Puerto $port: $service_name"
        else
            echo "❌ Puerto $port: No en uso"
        fi
    done
    echo ""
}

# Función para mostrar logs en tiempo real
show_realtime_logs() {
    log "🔄 Logs en tiempo real (Ctrl+C para salir):"
    echo "----------------------------------------"
    
    # Crear un archivo temporal para combinar logs
    local temp_log_file="/tmp/eduai_combined_logs.log"
    
    # Función para limpiar al salir
    cleanup() {
        rm -f "$temp_log_file"
        exit 0
    }
    
    trap cleanup SIGINT SIGTERM
    
    # Iniciar tail en archivos de log si existen
    if [ -f "logs/gateway-combined.log" ]; then
        tail -f logs/gateway-combined.log > "$temp_log_file" &
    fi
    
    # Mostrar logs combinados
    if [ -f "$temp_log_file" ]; then
        tail -f "$temp_log_file"
    else
        echo "No hay archivos de log disponibles para mostrar en tiempo real"
    fi
}

# Función principal
main() {
    local command=${1:-"status"}
    
    case $command in
        "status")
            log "📊 Estado de servicios - EduAI Platform"
            echo ""
            show_service_status
            show_ports
            show_system_info
            ;;
        "services")
            log "📋 Logs de servicios individuales"
            echo ""
            for service in "${SERVICES[@]}"; do
                show_service_logs "$service"
            done
            ;;
        "docker")
            log "🐳 Logs de contenedores Docker"
            echo ""
            show_docker_logs
            ;;
        "files")
            log "📄 Logs de archivos"
            echo ""
            show_file_logs
            ;;
        "realtime"|"live")
            show_realtime_logs
            ;;
        "all")
            log "📊 Información completa - EduAI Platform"
            echo ""
            show_service_status
            show_ports
            show_system_info
            echo ""
            show_docker_logs
            show_file_logs
            ;;
        *)
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos disponibles:"
            echo "  status    - Mostrar estado de servicios y puertos"
            echo "  services  - Mostrar logs de servicios individuales"
            echo "  docker    - Mostrar logs de contenedores Docker"
            echo "  files     - Mostrar logs de archivos"
            echo "  realtime  - Mostrar logs en tiempo real"
            echo "  all       - Mostrar toda la información"
            echo ""
            echo "Ejemplos:"
            echo "  $0 status"
            echo "  $0 realtime"
            echo "  $0 all"
            ;;
    esac
}

# Ejecutar función principal
main "$@"