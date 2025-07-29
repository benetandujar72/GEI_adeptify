#!/bin/bash

# Script para detener el entorno de desarrollo completo
# EduAI Platform - Microservicios con MCP

set -e

# Colores para la salida de la consola
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Función para detener un servicio
stop_service() {
    local service=$1
    local pid_file="microservices/$service/logs/$service.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_info "Deteniendo $service (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Verificar si el proceso se detuvo
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "$service no se detuvo suavemente, forzando..."
                kill -9 $pid
            fi
            
            print_success "$service detenido"
        else
            print_info "$service ya no está ejecutándose"
        fi
        
        # Eliminar archivo PID
        rm -f "$pid_file"
    else
        print_info "No se encontró archivo PID para $service"
    fi
}

# Función para detener el API Gateway
stop_gateway() {
    local pid_file="gateway/logs/gateway.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_info "Deteniendo API Gateway (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Verificar si el proceso se detuvo
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "API Gateway no se detuvo suavemente, forzando..."
                kill -9 $pid
            fi
            
            print_success "API Gateway detenido"
        else
            print_info "API Gateway ya no está ejecutándose"
        fi
        
        # Eliminar archivo PID
        rm -f "$pid_file"
    else
        print_info "No se encontró archivo PID para API Gateway"
    fi
}

# Función para detener contenedores Docker
stop_docker_containers() {
    print_info "Deteniendo contenedores Docker..."
    
    # Detener PostgreSQL
    if docker ps --format "table {{.Names}}" | grep -q "postgres"; then
        print_info "Deteniendo PostgreSQL..."
        docker stop postgres
        docker rm postgres
        print_success "PostgreSQL detenido"
    else
        print_info "PostgreSQL no está ejecutándose"
    fi
    
    # Detener Redis
    if docker ps --format "table {{.Names}}" | grep -q "redis"; then
        print_info "Deteniendo Redis..."
        docker stop redis
        docker rm redis
        print_success "Redis detenido"
    else
        print_info "Redis no está ejecutándose"
    fi
}

# Función para limpiar procesos huérfanos
cleanup_orphaned_processes() {
    print_info "Limpiando procesos huérfanos..."
    
    # Buscar y detener procesos Node.js relacionados con los servicios
    local services=(
        "user-service"
        "student-service"
        "course-service"
        "resource-service"
        "communication-service"
        "analytics-service"
    )
    
    for service in "${services[@]}"; do
        # Buscar procesos por nombre de directorio
        pkill -f "microservices/$service" 2>/dev/null || true
    done
    
    # Buscar procesos del gateway
    pkill -f "gateway" 2>/dev/null || true
    
    print_success "Procesos huérfanos limpiados"
}

# Función para verificar puertos libres
check_ports_free() {
    print_info "Verificando que los puertos estén libres..."
    
    local ports=(3001 3002 3003 3004 3005 3006 5000 5432 6379)
    local all_free=true
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Puerto $port aún está en uso"
            all_free=false
        fi
    done
    
    if [ "$all_free" = true ]; then
        print_success "Todos los puertos están libres"
    else
        print_warning "Algunos puertos aún están en uso"
    fi
}

# Función principal
main() {
    print_header "🛑 Deteniendo Entorno de Desarrollo - EduAI Platform"
    
    # Detener servicios en orden inverso
    print_header "Deteniendo Microservicios"
    
    # Detener API Gateway primero
    stop_gateway
    
    # Detener servicios de negocio
    stop_service "analytics-service"
    stop_service "communication-service"
    stop_service "resource-service"
    
    # Detener servicios core
    stop_service "course-service"
    stop_service "student-service"
    stop_service "user-service"
    
    # Limpiar procesos huérfanos
    cleanup_orphaned_processes
    
    # Detener contenedores Docker
    print_header "Deteniendo Servicios de Base de Datos"
    stop_docker_containers
    
    # Verificar puertos libres
    check_ports_free
    
    # Mostrar resumen
    print_header "✅ Entorno de Desarrollo Detenido"
    
    echo ""
    print_success "Todos los servicios han sido detenidos:"
    echo ""
    echo "  📊 User Service:        ❌ Detenido"
    echo "  👨‍🎓 Student Service:     ❌ Detenido"
    echo "  📚 Course Service:      ❌ Detenido"
    echo "  🏗️  Resource Service:    ❌ Detenido"
    echo "  💬 Communication Service: ❌ Detenido"
    echo "  📈 Analytics Service:   ❌ Detenido"
    echo "  🌐 API Gateway:         ❌ Detenido"
    echo ""
    echo "  🗄️  PostgreSQL:          ❌ Detenido"
    echo "  🔴 Redis:               ❌ Detenido"
    echo ""
    print_info "Para iniciar de nuevo: ./scripts/dev-start.sh"
    echo ""
    print_success "¡Entorno de desarrollo detenido correctamente! 🎉"
}

# Manejar señales de interrupción
trap 'print_warning "Interrumpiendo parada..."; exit 1' INT TERM

# Ejecutar función principal
main "$@"