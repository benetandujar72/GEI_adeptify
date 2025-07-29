#!/bin/bash

# Script de Despliegue Remoto del User Service
# Uso: ./deploy-remote.sh

set -e

echo "🚀 Desplegando User Service en servidor remoto..."

# Variables
REMOTE_HOST="gei.adeptify.es"
REMOTE_USER="root"
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

# Verificar conexión SSH
log_info "Verificando conexión SSH..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $REMOTE_USER@$REMOTE_HOST exit 2>/dev/null; then
    log_error "No se puede conectar al servidor remoto. Verifica las credenciales SSH."
    exit 1
fi

# Crear directorio de trabajo en el servidor
log_info "Creando directorio de trabajo en el servidor..."
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p /opt/adeptify/user-service"

# Copiar archivos al servidor
log_info "Copiando archivos al servidor..."
scp -r microservices/user-service/* $REMOTE_USER@$REMOTE_HOST:/opt/adeptify/user-service/
scp docker-compose.prod.yml $REMOTE_USER@$REMOTE_HOST:/opt/adeptify/
scp deploy-production.sh $REMOTE_USER@$REMOTE_HOST:/opt/adeptify/

# Ejecutar despliegue en el servidor
log_info "Ejecutando despliegue en el servidor..."
ssh $REMOTE_USER@$REMOTE_HOST "cd /opt/adeptify && chmod +x deploy-production.sh && ./deploy-production.sh"

# Verificar despliegue
log_info "Verificando despliegue..."
sleep 10

# Probar endpoints
log_info "Probando endpoints..."
if curl -f https://$REMOTE_HOST/api/v1/users/health > /dev/null 2>&1; then
    log_info "✅ User Service desplegado exitosamente en producción"
else
    log_warn "⚠️ User Service puede no estar completamente funcional"
fi

log_info "🎉 Despliegue remoto completado!"
log_info "🔗 User Service: https://$REMOTE_HOST/api/v1/users"
log_info "📊 Health Check: https://$REMOTE_HOST/api/v1/users/health"