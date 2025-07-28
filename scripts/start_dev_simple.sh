#!/usr/bin/env bash

# Script simplificado para iniciar el desarrollo sin Docker
# EduAI Platform - Desarrollo Local

set -e

echo "Iniciando desarrollo local sin Docker..."
echo "========================================"

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

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor, instala Node.js."
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

# Construir los microservicios
print_status "Construyendo microservicios..."

# User Service
if [ -d "microservices/user-service" ]; then
    print_status "Construyendo User Service..."
    cd microservices/user-service && npm run build && cd ../..
fi

# MCP Orchestrator
if [ -d "microservices/mcp-orchestrator" ]; then
    print_status "Construyendo MCP Orchestrator..."
    cd microservices/mcp-orchestrator && npm run build && cd ../..
fi

print_success "Microservicios construidos"

print_success "¡Configuración de desarrollo completada!"

echo ""
echo "Próximos pasos:"
echo "==============="
echo -e "${GREEN}1.${NC} Iniciar PostgreSQL y Redis localmente o usar Docker"
echo -e "${GREEN}2.${NC} Ejecutar User Service: cd microservices/user-service && npm run dev"
echo -e "${GREEN}3.${NC} Ejecutar MCP Orchestrator: cd microservices/mcp-orchestrator && npm run dev"
echo -e "${GREEN}4.${NC} Ejecutar Frontend: cd client && npm run dev"
echo ""
echo -e "${GREEN}URLs de acceso:${NC}"
echo -e "  User Service: http://localhost:8001"
echo -e "  MCP Orchestrator: http://localhost:8201"
echo -e "  Frontend: http://localhost:3000"
echo ""
print_success "¡Desarrollo local configurado! 🎉" 