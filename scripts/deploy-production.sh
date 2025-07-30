#!/bin/bash

# Script de despliegue optimizado para producción - GEI Unified Platform
echo "🚀 === DESPLIEGUE EN PRODUCCIÓN - GEI UNIFIED PLATFORM ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 1.0"

# Configuración
DOCKER_IMAGE_NAME="gei-adeptify"
DOCKER_TAG="latest"
CONTAINER_NAME="gei-adeptify-app"
NETWORK_NAME="adeptify-network"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para verificar comandos
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 no está instalado"
        exit 1
    fi
}

# Verificar dependencias
log_info "Verificando dependencias..."
check_command "docker"
check_command "docker-compose"
log_success "Dependencias verificadas"

# Verificar archivos de configuración
log_info "Verificando archivos de configuración..."
if [ ! -f "Dockerfile.prod" ]; then
    log_error "Dockerfile.prod no encontrado"
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml no encontrado"
    exit 1
fi

if [ ! -f "production.env" ]; then
    log_warning "production.env no encontrado - usando variables por defecto"
fi

log_success "Archivos de configuración verificados"

# Parar contenedores existentes
log_info "Parando contenedores existentes..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
log_success "Contenedores parados"

# Limpiar imágenes antiguas
log_info "Limpiando imágenes antiguas..."
docker image prune -f
log_success "Imágenes limpiadas"

# Construir nueva imagen
log_info "Construyendo imagen Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache
if [ $? -ne 0 ]; then
    log_error "Error en la construcción de la imagen"
    exit 1
fi
log_success "Imagen construida exitosamente"

# Verificar que la imagen se construyó correctamente
log_info "Verificando imagen construida..."
if ! docker images | grep -q "$DOCKER_IMAGE_NAME"; then
    log_error "La imagen no se construyó correctamente"
    exit 1
fi
log_success "Imagen verificada"

# Crear red si no existe
log_info "Verificando red Docker..."
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    log_info "Creando red $NETWORK_NAME..."
    docker network create $NETWORK_NAME
    log_success "Red creada"
else
    log_success "Red ya existe"
fi

# Iniciar servicios
log_info "Iniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d
if [ $? -ne 0 ]; then
    log_error "Error al iniciar servicios"
    exit 1
fi
log_success "Servicios iniciados"

# Esperar a que los servicios estén listos
log_info "Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los contenedores
log_info "Verificando estado de los contenedores..."
docker-compose -f docker-compose.prod.yml ps

# Verificar health checks
log_info "Verificando health checks..."
for service in app postgres redis; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
        log_success "Servicio $service está funcionando"
    else
        log_error "Servicio $service no está funcionando"
    fi
done

# Verificar endpoints
log_info "Verificando endpoints..."
sleep 10

# Health check del endpoint principal
if command -v curl &> /dev/null; then
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Health check endpoint responde correctamente"
    else
        log_warning "Health check endpoint no responde"
    fi
else
    log_warning "curl no disponible - no se puede verificar endpoints"
fi

# Mostrar logs de la aplicación
log_info "Mostrando logs de la aplicación..."
docker-compose -f docker-compose.prod.yml logs --tail=20 app

# Información final
log_success "Despliegue completado exitosamente"
echo ""
echo "📊 === INFORMACIÓN DEL DESPLIEGUE ==="
echo "🌐 URL de la aplicación: http://localhost:3000"
echo "🔍 Health check: http://localhost:3000/health"
echo "📊 Estado de servicios: docker-compose -f docker-compose.prod.yml ps"
echo "📋 Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "🛑 Parar servicios: docker-compose -f docker-compose.prod.yml down"
echo ""

# Verificar uso de recursos
log_info "Información de recursos:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

log_success "Despliegue finalizado" 