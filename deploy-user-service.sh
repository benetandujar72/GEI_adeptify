#!/bin/bash

# Script de Despliegue del User Service en Producción
# Uso: ./deploy-user-service.sh

set -e

echo "🚀 Desplegando User Service en producción..."

# Variables
DOMAIN="gei.adeptify.es"
SERVICE_NAME="user-service"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "No se encontró docker-compose.prod.yml. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Docker está ejecutándose
if ! docker info > /dev/null 2>&1; then
    log_error "Docker no está ejecutándose. Inicia Docker y vuelve a intentar."
    exit 1
fi

# Construir solo el User Service
log_info "Construyendo User Service..."
docker-compose -f docker-compose.prod.yml build user-service

# Parar solo el User Service si está ejecutándose
log_info "Deteniendo User Service existente..."
docker-compose -f docker-compose.prod.yml stop user-service || true
docker-compose -f docker-compose.prod.yml rm -f user-service || true

# Levantar solo el User Service
log_info "Levantando User Service..."
docker-compose -f docker-compose.prod.yml up -d user-service

# Esperar a que el servicio esté listo
log_info "Esperando a que el User Service esté listo..."
sleep 15

# Verificar estado del servicio
log_info "Verificando estado del User Service..."
docker-compose -f docker-compose.prod.yml ps user-service

# Verificar health check
log_info "Verificando health check..."
for i in {1..10}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ User Service health check exitoso"
        break
    else
        log_warn "⏳ Intento $i/10: User Service aún no está listo..."
        sleep 5
    fi
done

# Probar endpoints específicos
log_info "Probando endpoints del User Service..."

# Health check básico
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log_info "✅ Health check básico funcionando"
else
    log_error "❌ Health check básico falló"
fi

# Health check detallado
if curl -f http://localhost:3001/health/detailed > /dev/null 2>&1; then
    log_info "✅ Health check detallado funcionando"
else
    log_warn "⚠️ Health check detallado falló (puede ser normal si no hay DB/Redis)"
fi

# Readiness check
if curl -f http://localhost:3001/health/ready > /dev/null 2>&1; then
    log_info "✅ Readiness check funcionando"
else
    log_warn "⚠️ Readiness check falló (puede ser normal si no hay DB)"
fi

# Mostrar logs del User Service
log_info "Mostrando logs del User Service..."
docker-compose -f docker-compose.prod.yml logs --tail=20 user-service

log_info "🎉 User Service desplegado exitosamente!"
log_info "🔗 User Service: http://localhost:3001"
log_info "📊 Health Check: http://localhost:3001/health"
log_info "📝 Logs: docker-compose -f docker-compose.prod.yml logs -f user-service"