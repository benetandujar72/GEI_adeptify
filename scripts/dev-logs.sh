#!/bin/bash

# Script para ver logs y estado de los servicios de desarrollo
# EduAI Platform - Microservicios con MCP

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración de servicios
SERVICES=(
    "user-service"
    "student-service"
    "course-service"
    "resource-service"
    "communication-service"
    "gateway"
)

# Mapeo de puertos
declare -A ports
ports["user-service"]=3001
ports["student-service"]=3002
ports["course-service"]=3003
ports["resource-service"]=3004
ports["communication-service"]=3005
ports["gateway"]=5000

# Función para imprimir con colores
print_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para mostrar el estado de los servicios
show_service_status() {
    print_header "Service Status"
    
    for service in "${SERVICES[@]}"; do
        port=${ports[$service]}
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "$service is running on port $port"
        else
            print_error "$service is not running on port $port"
        fi
    done
    
    echo ""
}

# Función para mostrar logs de un servicio específico
show_service_logs() {
    local service=$1
    local lines=${2:-50}
    
    print_header "Logs for $service (last $lines lines)"
    
    case $service in
        "user-service")
            if [ -f "microservices/user-service/logs/user-service-combined.log" ]; then
                tail -n $lines microservices/user-service/logs/user-service-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        "student-service")
            if [ -f "microservices/student-service/logs/student-service-combined.log" ]; then
                tail -n $lines microservices/student-service/logs/student-service-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        "course-service")
            if [ -f "microservices/course-service/logs/course-service-combined.log" ]; then
                tail -n $lines microservices/course-service/logs/course-service-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        "resource-service")
            if [ -f "microservices/resource-service/logs/resource-service-combined.log" ]; then
                tail -n $lines microservices/resource-service/logs/resource-service-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        "communication-service")
            if [ -f "microservices/communication-service/logs/communication-service-combined.log" ]; then
                tail -n $lines microservices/communication-service/logs/communication-service-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        "gateway")
            if [ -f "gateway/logs/gateway-combined.log" ]; then
                tail -n $lines gateway/logs/gateway-combined.log
            else
                print_warning "No log file found for $service"
            fi
            ;;
        *)
            print_error "Unknown service: $service"
            ;;
    esac
    
    echo ""
}

# Función para mostrar logs de Docker
show_docker_logs() {
    print_header "Docker Container Logs"
    
    # PostgreSQL logs
    if docker ps --format "table {{.Names}}" | grep -q "postgres"; then
        print_info "PostgreSQL container logs:"
        docker logs --tail 20 postgres 2>/dev/null || print_warning "Could not get PostgreSQL logs"
        echo ""
    else
        print_warning "PostgreSQL container is not running"
    fi
    
    # Redis logs
    if docker ps --format "table {{.Names}}" | grep -q "redis"; then
        print_info "Redis container logs:"
        docker logs --tail 20 redis 2>/dev/null || print_warning "Could not get Redis logs"
        echo ""
    else
        print_warning "Redis container is not running"
    fi
}

# Función para mostrar logs de archivos
show_file_logs() {
    local lines=${1:-50}
    
    print_header "File-based Logs (last $lines lines)"
    
    # Buscar archivos de log en el proyecto
    find . -name "*.log" -type f 2>/dev/null | while read -r logfile; do
        if [ -s "$logfile" ]; then
            print_info "Log file: $logfile"
            tail -n $lines "$logfile"
            echo ""
        fi
    done
}

# Función para mostrar información del sistema
show_system_info() {
    print_header "System Information"
    
    print_info "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
    
    print_info "Memory Usage:"
    free -h | grep -E "Mem|Swap"
    
    print_info "Disk Usage:"
    df -h | grep -E "Filesystem|/$"
    
    print_info "Network Connections:"
    netstat -tuln | grep -E ":(3001|3002|3003|3004|3005|5000|5432|6379)" || print_warning "No relevant network connections found"
    
    echo ""
}

# Función para mostrar puertos en uso
show_ports() {
    print_header "Ports in Use"
    
    local ports=(3001 3002 3003 3004 3005 5000 5432 6379)
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local service_name=""
            case $port in
                3001) service_name="User Service" ;;
                3002) service_name="Student Service" ;;
                3003) service_name="Course Service" ;;
                3004) service_name="Resource Service" ;;
                3005) service_name="Communication Service" ;;
                5000) service_name="API Gateway" ;;
                5432) service_name="PostgreSQL" ;;
                6379) service_name="Redis" ;;
            esac
            print_success "Port $port is in use by $service_name"
        else
            print_warning "Port $port is not in use"
        fi
    done
    
    echo ""
}

# Función para mostrar logs en tiempo real
show_realtime_logs() {
    print_header "Real-time Logs (Press Ctrl+C to stop)"
    
    # Combinar logs de todos los servicios
    (
        tail -f microservices/user-service/logs/user-service-combined.log 2>/dev/null &
        tail -f microservices/student-service/logs/student-service-combined.log 2>/dev/null &
        tail -f microservices/course-service/logs/course-service-combined.log 2>/dev/null &
        tail -f microservices/resource-service/logs/resource-service-combined.log 2>/dev/null &
        tail -f microservices/communication-service/logs/communication-service-combined.log 2>/dev/null &
        tail -f gateway/logs/gateway-combined.log 2>/dev/null &
        wait
    ) | while read -r line; do
        echo "$(date '+%H:%M:%S') $line"
    done
}

# Función para mostrar el menú de ayuda
show_help() {
    print_header "EduAI Platform - Development Logs"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  status              Show service status"
    echo "  logs [SERVICE]      Show logs for specific service"
    echo "  docker              Show Docker container logs"
    echo "  files [LINES]       Show file-based logs (default: 50 lines)"
    echo "  system              Show system information"
    echo "  ports               Show ports in use"
    echo "  realtime            Show real-time logs"
    echo "  all                 Show all information"
    echo "  help                Show this help message"
    echo ""
    echo "Services:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs user-service"
    echo "  $0 logs gateway 100"
    echo "  $0 realtime"
    echo ""
}

# Función principal
main() {
    case "${1:-help}" in
        "status")
            show_service_status
            ;;
        "logs")
            if [ -n "$2" ]; then
                show_service_logs "$2" "$3"
            else
                print_error "Please specify a service name"
                echo "Available services: ${SERVICES[*]}"
            fi
            ;;
        "docker")
            show_docker_logs
            ;;
        "files")
            show_file_logs "$2"
            ;;
        "system")
            show_system_info
            ;;
        "ports")
            show_ports
            ;;
        "realtime")
            show_realtime_logs
            ;;
        "all")
            show_service_status
            show_system_info
            show_ports
            show_docker_logs
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"