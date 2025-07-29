#!/bin/bash

# Script para iniciar el entorno de desarrollo local
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

# Verificar dependencias
check_dependencies() {
    log "Verificando dependencias..."
    
    command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose no está instalado"
    command -v node >/dev/null 2>&1 || error "Node.js no está instalado"
    command -v npm >/dev/null 2>&1 || error "npm no está instalado"
    
    log "✓ Todas las dependencias están instaladas"
}

# Crear archivo .env si no existe
create_env_file() {
    if [ ! -f ".env" ]; then
        log "Creando archivo .env para desarrollo..."
        cat > .env << EOF
# Configuración de Desarrollo - EduAI Platform
NODE_ENV=development

# Base de Datos
DATABASE_URL=postgresql://gei_user:gei_password@localhost:5432/gei_platform
POSTGRES_DB=gei_platform
POSTGRES_USER=gei_user
POSTGRES_PASSWORD=gei_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev_jwt_secret_key_2024_change_in_production

# API Keys (opcionales para desarrollo)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# URLs de Microservicios
USER_SERVICE_URL=http://localhost:3001
STUDENT_SERVICE_URL=http://localhost:3002
COURSE_SERVICE_URL=http://localhost:3003
RESOURCE_SERVICE_URL=http://localhost:3004
COMMUNICATION_SERVICE_URL=http://localhost:3005
ANALYTICS_SERVICE_URL=http://localhost:3006
LLM_GATEWAY_URL=http://localhost:3007
AI_SERVICES_URL=http://localhost:3008
MCP_ORCHESTRATOR_URL=http://localhost:3009

# Gateway
GATEWAY_PORT=5000
API_SERVER_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Logging
LOG_LEVEL=debug
EOF
        log "✓ Archivo .env creado"
    else
        log "✓ Archivo .env ya existe"
    fi
}

# Instalar dependencias de los microservicios
install_dependencies() {
    log "Instalando dependencias de microservicios..."
    
    # Servicios Core
    cd microservices/user-service && npm install && cd ../..
    cd microservices/student-service && npm install && cd ../..
    cd microservices/course-service && npm install && cd ../..
    
    # Servicios de Negocio
    cd microservices/resource-service && npm install && cd ../..
    cd microservices/communication-service && npm install && cd ../..
    cd microservices/analytics-service && npm install && cd ../..
    
    # Servicios AI
    cd microservices/llm-gateway && npm install && cd ../..
    cd microservices/ai-services && npm install && cd ../..
    
    # MCP Services
    cd microservices/mcp-orchestrator && npm install && cd ../..
    
    # Gateway y Legacy
    cd gateway && npm install && cd ..
    cd server && npm install && cd ..
    cd client && npm install && cd ..
    
    log "✓ Todas las dependencias han sido instaladas"
}

# Iniciar servicios de infraestructura
start_infrastructure() {
    log "Iniciando servicios de infraestructura..."
    
    # Detener servicios existentes
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    
    # Iniciar solo infraestructura
    docker-compose -f docker-compose.dev.yml up -d postgres redis
    
    # Esperar a que los servicios estén listos
    log "Esperando a que PostgreSQL y Redis estén listos..."
    sleep 10
    
    # Verificar conexión a PostgreSQL
    until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U gei_user -d gei_platform > /dev/null 2>&1; do
        log "Esperando a que PostgreSQL esté listo..."
        sleep 2
    done
    
    # Verificar conexión a Redis
    until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
        log "Esperando a que Redis esté listo..."
        sleep 2
    done
    
    log "✓ Servicios de infraestructura iniciados"
}

# Iniciar microservicios en modo desarrollo
start_microservices() {
    log "Iniciando microservicios en modo desarrollo..."
    
    # User Service
    log "Iniciando User Service..."
    cd microservices/user-service
    npm run dev &
    USER_SERVICE_PID=$!
    cd ../..
    
    # Student Service
    log "Iniciando Student Service..."
    cd microservices/student-service
    npm run dev &
    STUDENT_SERVICE_PID=$!
    cd ../..
    
    # Course Service
    log "Iniciando Course Service..."
    cd microservices/course-service
    npm run dev &
    COURSE_SERVICE_PID=$!
    cd ../..
    
    # Resource Service
    log "Iniciando Resource Service..."
    cd microservices/resource-service
    npm run dev &
    RESOURCE_SERVICE_PID=$!
    cd ../..
    
    # Communication Service
    log "Iniciando Communication Service..."
    cd microservices/communication-service
    npm run dev &
    COMMUNICATION_SERVICE_PID=$!
    cd ../..
    
    # Analytics Service
    log "Iniciando Analytics Service..."
    cd microservices/analytics-service
    npm run dev &
    ANALYTICS_SERVICE_PID=$!
    cd ../..
    
    # LLM Gateway
    log "Iniciando LLM Gateway..."
    cd microservices/llm-gateway
    npm run dev &
    LLM_GATEWAY_PID=$!
    cd ../..
    
    # AI Services
    log "Iniciando AI Services..."
    cd microservices/ai-services
    npm run dev &
    AI_SERVICES_PID=$!
    cd ../..
    
    # MCP Orchestrator
    log "Iniciando MCP Orchestrator..."
    cd microservices/mcp-orchestrator
    npm run dev &
    MCP_ORCHESTRATOR_PID=$!
    cd ../..
    
    # Guardar PIDs para poder detenerlos después
    echo $USER_SERVICE_PID > .pids/user-service.pid
    echo $STUDENT_SERVICE_PID > .pids/student-service.pid
    echo $COURSE_SERVICE_PID > .pids/course-service.pid
    echo $RESOURCE_SERVICE_PID > .pids/resource-service.pid
    echo $COMMUNICATION_SERVICE_PID > .pids/communication-service.pid
    echo $ANALYTICS_SERVICE_PID > .pids/analytics-service.pid
    echo $LLM_GATEWAY_PID > .pids/llm-gateway.pid
    echo $AI_SERVICES_PID > .pids/ai-services.pid
    echo $MCP_ORCHESTRATOR_PID > .pids/mcp-orchestrator.pid
    
    log "✓ Microservicios iniciados"
}

# Iniciar API Gateway
start_gateway() {
    log "Iniciando API Gateway..."
    
    cd gateway
    npm run dev &
    GATEWAY_PID=$!
    cd ..
    
    echo $GATEWAY_PID > .pids/gateway.pid
    
    log "✓ API Gateway iniciado"
}

# Iniciar servidor legacy
start_legacy_server() {
    log "Iniciando servidor legacy..."
    
    cd server
    npm run dev &
    SERVER_PID=$!
    cd ..
    
    echo $SERVER_PID > .pids/server.pid
    
    log "✓ Servidor legacy iniciado"
}

# Iniciar frontend
start_frontend() {
    log "Iniciando frontend..."
    
    cd client
    npm run dev &
    CLIENT_PID=$!
    cd ..
    
    echo $CLIENT_PID > .pids/client.pid
    
    log "✓ Frontend iniciado"
}

# Verificar salud de los servicios
health_check() {
    log "Verificando salud de los servicios..."
    
    # Esperar un poco para que los servicios se estabilicen
    sleep 15
    
    # Verificar API Gateway
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        log "✓ API Gateway está funcionando"
    else
        warn "API Gateway no está respondiendo"
    fi
    
    # Verificar User Service
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "✓ User Service está funcionando"
    else
        warn "User Service no está respondiendo"
    fi
    
    # Verificar servidor legacy
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "✓ Servidor legacy está funcionando"
    else
        warn "Servidor legacy no está respondiendo"
    fi
    
    # Verificar frontend
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        log "✓ Frontend está funcionando"
    else
        warn "Frontend no está respondiendo"
    fi
    
    log "✓ Verificación de salud completada"
}

# Crear directorio para PIDs
create_pid_directory() {
    mkdir -p .pids
}

# Función principal
main() {
    log "🚀 Iniciando entorno de desarrollo - EduAI Platform"
    log "📅 Fecha: $(date)"
    log "🏗️  Arquitectura: Microservicios con MCP"
    
    # Verificaciones previas
    check_dependencies
    create_env_file
    create_pid_directory
    
    # Instalar dependencias
    install_dependencies
    
    # Iniciar servicios
    start_infrastructure
    start_microservices
    start_gateway
    start_legacy_server
    start_frontend
    
    # Verificación final
    health_check
    
    log "🎉 ¡Entorno de desarrollo iniciado exitosamente!"
    log "🌐 Frontend: http://localhost:5173"
    log "🔗 API Gateway: http://localhost:5000"
    log "📊 Servidor Legacy: http://localhost:3000"
    log "👤 User Service: http://localhost:3001"
    log "📚 Student Service: http://localhost:3002"
    log "📖 Course Service: http://localhost:3003"
    log "🔧 Resource Service: http://localhost:3004"
    log "💬 Communication Service: http://localhost:3005"
    log "📈 Analytics Service: http://localhost:3006"
    log "🤖 LLM Gateway: http://localhost:3007"
    log "🧠 AI Services: http://localhost:3008"
    log "🎯 MCP Orchestrator: http://localhost:3009"
    log ""
    log "Para detener todos los servicios: ./scripts/dev-stop.sh"
    log "Para ver logs: ./scripts/dev-logs.sh"
}

# Ejecutar función principal
main "$@"