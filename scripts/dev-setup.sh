#!/bin/bash

# ===== SCRIPT DE CONFIGURACIÓN DE DESARROLLO MCP =====
# Este script configura el entorno de desarrollo para la migración MCP

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Verificar que Docker esté instalado
check_docker() {
    print_message "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Por favor instale Docker primero."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker no está ejecutándose. Por favor inicie Docker."
        exit 1
    fi
    
    print_message "Docker está disponible y ejecutándose."
}

# Verificar que Docker Compose esté instalado
check_docker_compose() {
    print_message "Verificando Docker Compose..."
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado. Por favor instale Docker Compose."
        exit 1
    fi
    
    print_message "Docker Compose está disponible."
}

# Crear directorios necesarios
create_directories() {
    print_message "Creando directorios necesarios..."
    
    # Directorios para Traefik
    mkdir -p gateway/dynamic
    mkdir -p gateway/acme
    mkdir -p gateway/logs
    
    # Directorios para base de datos
    mkdir -p database/init
    mkdir -p database/backups
    
    # Directorios para monitoreo
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/grafana/dashboards
    
    # Directorios para logs
    mkdir -p logs
    
    print_message "Directorios creados exitosamente."
}

# Crear archivo de configuración de Prometheus
create_prometheus_config() {
    print_message "Creando configuración de Prometheus..."
    
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'mcp-orchestrator'
    static_configs:
      - targets: ['mcp-orchestrator:3008']
    metrics_path: '/metrics'

  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3001']
    metrics_path: '/metrics'

  - job_name: 'student-service'
    static_configs:
      - targets: ['student-service:3002']
    metrics_path: '/metrics'

  - job_name: 'course-service'
    static_configs:
      - targets: ['course-service:3003']
    metrics_path: '/metrics'

  - job_name: 'llm-gateway'
    static_configs:
      - targets: ['llm-gateway:3004']
    metrics_path: '/metrics'

  - job_name: 'content-generation'
    static_configs:
      - targets: ['content-generation:3005']
    metrics_path: '/metrics'

  - job_name: 'chatbot'
    static_configs:
      - targets: ['chatbot:3006']
    metrics_path: '/metrics'

  - job_name: 'predictive-analytics'
    static_configs:
      - targets: ['predictive-analytics:3007']
    metrics_path: '/metrics'
EOF

    print_message "Configuración de Prometheus creada."
}

# Crear archivo de configuración de Grafana
create_grafana_config() {
    print_message "Creando configuración de Grafana..."
    
    # Data source configuration
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    print_message "Configuración de Grafana creada."
}

# Crear archivo .env si no existe
create_env_file() {
    if [ ! -f .env ]; then
        print_message "Creando archivo .env..."
        
        cat > .env << EOF
# ===== CONFIGURACIÓN DE DESARROLLO MCP =====

# Variables de entorno para desarrollo
NODE_ENV=development

# API Keys (configurar según necesidad)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Configuración de base de datos
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/eduai_platform

# Configuración de Redis
REDIS_URL=redis://:redis123@localhost:6379

# Configuración de JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Configuración de CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Configuración de logging
LOG_LEVEL=debug

# URLs de servicios
MCP_ORCHESTRATOR_URL=http://localhost:3008
USER_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
LLM_GATEWAY_URL=http://localhost:3004

# Configuración de email (Mailhog para desarrollo)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EOF

        print_warning "Archivo .env creado. Por favor configure las API keys según sea necesario."
    else
        print_message "Archivo .env ya existe."
    fi
}

# Instalar dependencias de los microservicios
install_dependencies() {
    print_message "Instalando dependencias de los microservicios..."
    
    # Array de servicios
    services=(
        "microservices/mcp-orchestrator"
        "microservices/user-service"
        "microservices/student-service"
        "microservices/course-service"
        "microservices/llm-gateway"
        "microservices/ai-services/content-generation"
        "microservices/ai-services/chatbot"
        "microservices/ai-services/predictive-analytics"
    )
    
    for service in "${services[@]}"; do
        if [ -d "$service" ] && [ -f "$service/package.json" ]; then
            print_message "Instalando dependencias en $service..."
            cd "$service"
            npm install
            cd - > /dev/null
        else
            print_warning "Directorio $service no encontrado o no tiene package.json"
        fi
    done
    
    print_message "Dependencias instaladas."
}

# Construir imágenes Docker
build_images() {
    print_message "Construyendo imágenes Docker..."
    
    docker-compose -f docker-compose.dev.yml build
    
    print_message "Imágenes Docker construidas."
}

# Iniciar servicios
start_services() {
    print_message "Iniciando servicios..."
    
    docker-compose -f docker-compose.dev.yml up -d
    
    print_message "Servicios iniciados."
}

# Mostrar información de acceso
show_access_info() {
    print_header "INFORMACIÓN DE ACCESO"
    
    echo -e "${GREEN}Servicios disponibles:${NC}"
    echo -e "  • Traefik Dashboard: ${BLUE}http://traefik.localhost:8080${NC} (admin/admin123)"
    echo -e "  • MCP Orchestrator: ${BLUE}http://mcp.localhost${NC}"
    echo -e "  • User Service: ${BLUE}http://api.localhost/api/v1/users${NC}"
    echo -e "  • Student Service: ${BLUE}http://api.localhost/api/v1/students${NC}"
    echo -e "  • Course Service: ${BLUE}http://api.localhost/api/v1/courses${NC}"
    echo -e "  • LLM Gateway: ${BLUE}http://api.localhost/api/ai/llm${NC}"
    echo -e "  • Content Generation: ${BLUE}http://api.localhost/api/ai/content${NC}"
    echo -e "  • Chatbot: ${BLUE}http://api.localhost/api/ai/chatbot${NC}"
    echo -e "  • Predictive Analytics: ${BLUE}http://api.localhost/api/ai/analytics${NC}"
    echo ""
    echo -e "${GREEN}Monitoreo:${NC}"
    echo -e "  • Grafana: ${BLUE}http://localhost:3000${NC} (admin/admin123)"
    echo -e "  • Prometheus: ${BLUE}http://localhost:9090${NC}"
    echo -e "  • Mailhog: ${BLUE}http://localhost:8025${NC}"
    echo -e "  • Kibana: ${BLUE}http://localhost:5601${NC}"
    echo ""
    echo -e "${GREEN}Base de datos:${NC}"
    echo -e "  • PostgreSQL: ${BLUE}localhost:5432${NC} (postgres/postgres123)"
    echo -e "  • Redis: ${BLUE}localhost:6379${NC} (password: redis123)"
    echo ""
    echo -e "${YELLOW}Nota:${NC} Agregue las siguientes entradas a su archivo /etc/hosts:"
    echo -e "  127.0.0.1 traefik.localhost"
    echo -e "  127.0.0.1 mcp.localhost"
    echo -e "  127.0.0.1 api.localhost"
}

# Función principal
main() {
    print_header "CONFIGURACIÓN DE DESARROLLO MCP"
    
    check_docker
    check_docker_compose
    create_directories
    create_prometheus_config
    create_grafana_config
    create_env_file
    install_dependencies
    build_images
    start_services
    
    print_header "CONFIGURACIÓN COMPLETADA"
    show_access_info
    
    print_message "¡Entorno de desarrollo MCP configurado exitosamente!"
    print_warning "Recuerde configurar las API keys en el archivo .env antes de usar los servicios AI."
}

# Ejecutar función principal
main "$@" 