#!/usr/bin/env bash

# Script para iniciar el desarrollo con la nueva arquitectura MCP
# EduAI Platform - Microservices + MCP

set -e

echo "Iniciando desarrollo con arquitectura MCP..."
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor, instala Docker primero."
    exit 1
fi

# Verificar que Docker Compose esté instalado
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor, instala Docker Compose primero."
    exit 1
fi

# Verificar que Node.js esté instalado (también compatible con nvm)
if ! command -v node &> /dev/null; then
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        print_status "Cargando Node.js via NVM..."
        source "$HOME/.nvm/nvm.sh"
    fi
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado ni disponible con NVM. Por favor, instala Node.js."
    exit 1
fi

print_status "Verificando dependencias..."

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Se recomienda Node.js 18 o superior. Versión actual: $(node -v)"
fi

print_success "Dependencias verificadas"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    print_status "Creando archivo .env..."
    cat > .env << EOF
# Configuración de desarrollo
NODE_ENV=development

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/eduai_dev

# JWT
JWT_SECRET=your-secret-key-dev

# CORS
CORS_ORIGIN=http://localhost:3000

# MCP
MCP_ORCHESTRATOR_URL=http://localhost:8201

# Frontend
VITE_API_URL=http://localhost:80
VITE_MCP_URL=http://localhost:8201
EOF
    print_success "Archivo .env creado"
fi

# Crear archivo .env en client si no existe
if [ ! -d client ]; then
    print_warning "La carpeta 'client' no existe. Omitiendo creación de client/.env."
elif [ ! -f client/.env ]; then
    print_status "Creando archivo .env en client..."
    cat > client/.env << EOF
# Frontend Environment Variables
VITE_API_URL=http://localhost:80
VITE_MCP_URL=http://localhost:8201
VITE_APP_NAME=EduAI Platform
VITE_APP_VERSION=1.0.0
EOF
    print_success "Archivo .env en client creado"
fi

# Instalar dependencias del proyecto principal
print_status "Instalando dependencias del proyecto principal..."
npm install

# Instalar dependencias del frontend
if [ -d client ] && [ -f client/package.json ]; then
    print_status "Instalando dependencias del frontend..."
    cd client && npm install && cd ..
else
    print_warning "No se ha encontrado 'client/package.json'. Omitiendo instalación de dependencias del frontend."
fi

# Instalar dependencias de los microservicios
print_status "Instalando dependencias de los microservicios..."

# User Service
if [ -d "microservices/user-service" ]; then
    print_status "Instalando dependencias del User Service..."
    cd microservices/user-service && npm install && cd ../..
fi

# MCP Orchestrator
if [ -d "microservices/mcp-orchestrator" ]; then
    print_status "Instalando dependencias del MCP Orchestrator..."
    cd microservices/mcp-orchestrator && npm install && cd ../..
fi

print_success "Dependencias instaladas"

# Construir imágenes Docker
print_status "Construyendo imágenes Docker..."
docker-compose -f docker-compose.dev.yml build

print_success "Imágenes Docker construidas"

# Iniciar servicios
print_status "Iniciando servicios..."
docker-compose -f docker-compose.dev.yml up -d

print_success "Servicios iniciados"

# Esperar a que los servicios estén listos
print_status "Esperando a que los servicios estén listos..."

# Función para verificar si un servicio está listo
check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi

        print_status "Esperando $service... (intento $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    return 1
}

# Verificar servicios
if check_service "PostgreSQL" "http://localhost:5432"; then
    print_success "PostgreSQL está listo"
else
    print_error "PostgreSQL no está respondiendo"
fi

if check_service "Redis" "http://localhost:6379"; then
    print_success "Redis está listo"
else
    print_error "Redis no está respondiendo"
fi

if check_service "User Service" "http://localhost:8001/health"; then
    print_success "User Service está listo"
else
    print_error "User Service no está respondiendo"
fi

if check_service "MCP Orchestrator" "http://localhost:8201/health"; then
    print_success "MCP Orchestrator está listo"
else
    print_error "MCP Orchestrator no está respondiendo"
fi

if check_service "Frontend" "http://localhost:3000"; then
    print_success "Frontend está listo"
else
    print_error "Frontend no está respondiendo"
fi

print_success "¡Desarrollo iniciado exitosamente!"

if [ ! -d client ]; then
    print_warning "Recuerda crear la carpeta 'client' si necesitas el frontend en este entorno."
fi

echo ""
echo "URLs de acceso:"
echo "==================="
echo -e "${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}API Gateway:${NC} http://localhost:80"
echo -e "${GREEN}Traefik Dashboard:${NC} http://localhost:8080"
echo ""
echo -e "${GREEN}Microservicios:${NC}"
echo -e "  User Service: http://localhost:8001"
echo -e "  MCP Orchestrator: http://localhost:8201"
echo ""
echo -e "${GREEN}Health Checks:${NC}"
echo -e "  User Service: http://localhost:8001/health"
echo -e "  MCP Orchestrator: http://localhost:8201/health"
echo ""
echo -e "${GREEN}MCP Endpoints:${NC}"
echo -e "  Execute: http://localhost:8201/mcp/execute"
echo -e "  Servers: http://localhost:8201/mcp/servers"
echo -e "  Metrics: http://localhost:8201/mcp/metrics"
echo -e "  Capabilities: http://localhost:8201/mcp/capabilities"
echo ""
echo -e "${GREEN}Base de datos:${NC}"
echo -e "  PostgreSQL: localhost:5432"
echo -e "  Redis: localhost:6379"
echo ""

print_status "Para detener los servicios, ejecuta: docker-compose -f docker-compose.dev.yml down"
print_status "Para ver logs: docker-compose -f docker-compose.dev.yml logs -f"

echo ""
print_success "¡Desarrollo con arquitectura MCP iniciado! 🎉"
