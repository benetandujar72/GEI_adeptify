#!/bin/bash

# Script para probar los servicios core de la plataforma EduAI
# Incluye: User Service, Student Service, Course Service, Resource Service, Communication Service, Analytics Service y API Gateway

set -e

# Colores para la salida de la consola
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de servicios y puertos
SERVICES=(
    "user-service:3001"
    "student-service:3002"
    "course-service:3003"
    "resource-service:3004"
    "communication-service:3005"
    "analytics-service:3006"
    "gateway:5000"
)

# Función para imprimir con colores
print_status() {
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

# Función para hacer una petición HTTP y verificar la respuesta
test_endpoint() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    local expected_status=${4:-200}

    print_status "Testing $service_name on port $port - $endpoint"

    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        print_success "$service_name is responding on $endpoint"
        return 0
    else
        print_error "$service_name is not responding on $endpoint"
        return 1
    fi
}

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Función para verificar contenedores Docker
check_docker_containers() {
    print_status "Checking Docker containers..."

    # Verificar PostgreSQL
    if docker ps --format "table {{.Names}}" | grep -q "postgres"; then
        print_success "PostgreSQL container is running"
    else
        print_warning "PostgreSQL container is not running"
    fi

    # Verificar Redis
    if docker ps --format "table {{.Names}}" | grep -q "redis"; then
        print_success "Redis container is running"
    else
        print_warning "Redis container is not running"
    fi
}

# Función principal de testing
main() {
    echo "🚀 Starting EduAI Platform Core Services Test"
    echo "=============================================="

    # Verificar contenedores Docker
    check_docker_containers
    echo ""

    # Test de cada servicio
    local all_tests_passed=true

    for service in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port <<< "$service"

        echo "Testing $service_name..."

        # Verificar si el puerto está en uso
        if check_port $port; then
            print_success "$service_name is running on port $port"

            # Test de health check
            if test_endpoint "$service_name" "$port" "/health"; then
                print_success "$service_name health check passed"
            else
                print_error "$service_name health check failed"
                all_tests_passed=false
            fi

            # Test de root endpoint
            if test_endpoint "$service_name" "$port" "/"; then
                print_success "$service_name root endpoint is accessible"
            else
                print_warning "$service_name root endpoint is not accessible"
            fi

        else
            print_error "$service_name is not running on port $port"
            all_tests_passed=false
        fi

        echo ""
    done

    # Test específico del API Gateway
    echo "Testing API Gateway specific endpoints..."

    # Test de status del gateway
    if test_endpoint "Gateway" "5000" "/status"; then
        print_success "Gateway status endpoint is working"
    else
        print_warning "Gateway status endpoint is not working"
    fi

    # Test de routing a través del gateway
    print_status "Testing gateway routing to services..."

    # Test routing a User Service
    if curl -s -f "http://localhost:5000/api/v1/users" > /dev/null 2>&1; then
        print_success "Gateway routing to User Service is working"
    else
        print_warning "Gateway routing to User Service is not working"
    fi

    # Test routing a Student Service
    if curl -s -f "http://localhost:5000/api/v1/students" > /dev/null 2>&1; then
        print_success "Gateway routing to Student Service is working"
    else
        print_warning "Gateway routing to Student Service is not working"
    fi

    # Test routing a Course Service
    if curl -s -f "http://localhost:5000/api/v1/courses" > /dev/null 2>&1; then
        print_success "Gateway routing to Course Service is working"
    else
        print_warning "Gateway routing to Course Service is not working"
    fi

    # Test routing a Resource Service
    if curl -s -f "http://localhost:5000/api/v1/resources" > /dev/null 2>&1; then
        print_success "Gateway routing to Resource Service is working"
    else
        print_warning "Gateway routing to Resource Service is not working"
    fi

    # Test routing a Communication Service
    if curl -s -f "http://localhost:5000/api/v1/communications" > /dev/null 2>&1; then
        print_success "Gateway routing to Communication Service is working"
    else
        print_warning "Gateway routing to Communication Service is not working"
    fi

    # Test routing a Analytics Service
    if curl -s -f "http://localhost:5000/api/v1/analytics" > /dev/null 2>&1; then
        print_success "Gateway routing to Analytics Service is working"
    else
        print_warning "Gateway routing to Analytics Service is not working"
    fi

    echo ""
    echo "=============================================="

    if [ "$all_tests_passed" = true ]; then
        print_success "All core services are running and responding correctly!"
        echo "🎉 EduAI Platform is ready for development!"
        exit 0
    else
        print_error "Some services are not running or not responding correctly."
        echo "Please check the services and try again."
        exit 1
    fi
}

# Ejecutar el script principal
main "$@"