#!/bin/bash

# Script para ver logs y estado de los servicios de desarrollo
# EduAI Platform - Microservicios con MCP

# Colores para la salida de la consola
GREEN='\033[0;32m'
RED='\033[0;31m'
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
    "analytics-service"
    "gateway"
)

# Mapeo de puertos
declare -A ports
ports["user-service"]=3001
ports["student-service"]=3002
ports["course-service"]=3003
ports["resource-service"]=3004
ports["communication-service"]=3005
ports["analytics-service"]=3006
ports["gateway"]=5000

# Función para imprimir con colores
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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

# Función para mostrar estado de servicios
show_service_status() {
    print_header "Estado de Servicios"
    
    for service in "${SERVICES[@]}"; do
        port=${ports[$service]}
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "$service (puerto $port): RUNNING"
        else
            print_error "$service (puerto $port): STOPPED"
        fi
    done
}

# Función para mostrar logs de un servicio específico
show_service_logs() {
    local service=$1
    local lines=${2:-50}
    
    print_header "Logs de $service (últimas $lines líneas)"
    
    local log_file="microservices/$service/logs/${service}-combined.log"
    
    if [ -f "$log_file" ]; then
        tail -n $lines "$log_file"
    else
        print_warning "Archivo de log no encontrado: $log_file"
        print_info "Intentando mostrar logs del proceso..."
        
        local port=${ports[$service]}
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_info "Servicio $service está ejecutándose en puerto $port"
        else
            print_error "Servicio $service no está ejecutándose"
        fi
    fi
}

# Función para mostrar logs de Docker
show_docker_logs() {
    print_header "Logs de Contenedores Docker"
    
    # PostgreSQL
    if docker ps --format "table {{.Names}}" | grep -q "postgres"; then
        print_info "Logs de PostgreSQL:"
        docker logs --tail 20 postgres 2>/dev/null || print_warning "No se pueden obtener logs de PostgreSQL"
        echo ""
    else
        print_warning "Contenedor PostgreSQL no está ejecutándose"
    fi
    
    # Redis
    if docker ps --format "table {{.Names}}" | grep -q "redis"; then
        print_info "Logs de Redis:"
        docker logs --tail 20 redis 2>/dev/null || print_warning "No se pueden obtener logs de Redis"
        echo ""
    else
        print_warning "Contenedor Redis no está ejecutándose"
    fi
}

# Función para mostrar logs de archivos
show_file_logs() {
    local service=$1
    local log_type=${2:-"combined"}
    local lines=${3:-50}
    
    print_header "Logs de archivo: $service ($log_type)"
    
    local log_file="microservices/$service/logs/${service}-${log_type}.log"
    
    if [ -f "$log_file" ]; then
        tail -n $lines "$log_file"
    else
        print_warning "Archivo de log no encontrado: $log_file"
    fi
}

# Función para mostrar información del sistema
show_system_info() {
    print_header "Información del Sistema"
    
    print_info "Uso de CPU:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
    
    print_info "Uso de Memoria:"
    free -h | grep "Mem:" | awk '{print "Total: " $2 " Used: " $3 " Free: " $4}'
    
    print_info "Uso de Disco:"
    df -h / | tail -1 | awk '{print "Total: " $2 " Used: " $3 " Free: " $4 " Use%: " $5}'
    
    print_info "Puertos en uso:"
    netstat -tuln | grep LISTEN | head -10
}

# Función para mostrar puertos en uso
show_ports() {
    print_header "Puertos en Uso"
    
    for service in "${SERVICES[@]}"; do
        port=${ports[$service]}
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | grep LISTEN | awk '{print $1}')
            print_success "Puerto $port ($service): $process"
        else
            print_error "Puerto $port ($service): NO EN USO"
        fi
    done
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
        tail -f microservices/analytics-service/logs/analytics-service-combined.log 2>/dev/null &
        tail -f gateway/logs/gateway-combined.log 2>/dev/null &
        wait
    ) | while read -r line; do
        echo "$(date '+%H:%M:%S') $line"
    done
}

# Función para mostrar ayuda
show_help() {
    print_header "Ayuda - Script de Logs de Desarrollo"
    
    echo "Uso: $0 [COMANDO] [SERVICIO] [OPCIONES]"
    echo ""
    echo "Comandos disponibles:"
    echo "  status                    - Mostrar estado de todos los servicios"
    echo "  logs [servicio] [líneas]  - Mostrar logs de un servicio específico"
    echo "  docker                    - Mostrar logs de contenedores Docker"
    echo "  file [servicio] [tipo]    - Mostrar logs de archivo específico"
    echo "  system                    - Mostrar información del sistema"
    echo "  ports                     - Mostrar puertos en uso"
    echo "  realtime                  - Mostrar logs en tiempo real"
    echo "  help                      - Mostrar esta ayuda"
    echo ""
    echo "Servicios disponibles:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service (puerto ${ports[$service]})"
    done
    echo ""
    echo "Tipos de logs disponibles:"
    echo "  - combined (por defecto)"
    echo "  - error"
    echo "  - access"
    echo ""
    echo "Ejemplos:"
    echo "  $0 status"
    echo "  $0 logs user-service 100"
    echo "  $0 file user-service error"
    echo "  $0 realtime"
}

# Función principal
main() {
    case "${1:-help}" in
        "status")
            show_service_status
            ;;
        "logs")
            if [ -z "$2" ]; then
                print_error "Debe especificar un servicio"
                show_help
                exit 1
            fi
            show_service_logs "$2" "$3"
            ;;
        "docker")
            show_docker_logs
            ;;
        "file")
            if [ -z "$2" ]; then
                print_error "Debe especificar un servicio"
                show_help
                exit 1
            fi
            show_file_logs "$2" "$3" "$4"
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
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"