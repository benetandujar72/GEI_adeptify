#!/bin/bash

# Script de Despliegue a Producción - EduAI Platform
# Arquitectura Microservicios con MCP

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
ENVIRONMENT="production"
DOMAIN="gei.adeptify.es"
REGISTRY="ghcr.io/adeptify"

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
    command -v kubectl >/dev/null 2>&1 || error "kubectl no está instalado"
    command -v helm >/dev/null 2>&1 || error "Helm no está instalado"
    
    log "✓ Todas las dependencias están instaladas"
}

# Verificar variables de entorno
check_environment() {
    log "Verificando variables de entorno..."
    
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "ANTHROPIC_API_KEY"
        "GOOGLE_API_KEY"
        "OPENAI_API_KEY"
        "GITHUB_TOKEN"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Variable de entorno $var no está definida"
        fi
    done
    
    log "✓ Todas las variables de entorno están configuradas"
}

# Construir imágenes Docker
build_images() {
    log "Construyendo imágenes Docker..."
    
    # Servicios Core
    log "Construyendo User Service..."
    docker build -t $REGISTRY/user-service:latest ./microservices/user-service
    
    log "Construyendo Student Service..."
    docker build -t $REGISTRY/student-service:latest ./microservices/student-service
    
    log "Construyendo Course Service..."
    docker build -t $REGISTRY/course-service:latest ./microservices/course-service
    
    # Servicios de Negocio
    log "Construyendo Resource Service..."
    docker build -t $REGISTRY/resource-service:latest ./microservices/resource-service
    
    log "Construyendo Communication Service..."
    docker build -t $REGISTRY/communication-service:latest ./microservices/communication-service
    
    log "Construyendo Analytics Service..."
    docker build -t $REGISTRY/analytics-service:latest ./microservices/analytics-service
    
    # Servicios AI
    log "Construyendo LLM Gateway..."
    docker build -t $REGISTRY/llm-gateway:latest ./microservices/llm-gateway
    
    log "Construyendo AI Services..."
    docker build -t $REGISTRY/ai-services:latest ./microservices/ai-services
    
    # MCP Services
    log "Construyendo MCP Orchestrator..."
    docker build -t $REGISTRY/mcp-orchestrator:latest ./microservices/mcp-orchestrator
    
    # Gateway y Legacy
    log "Construyendo API Gateway..."
    docker build -t $REGISTRY/api-gateway:latest ./gateway
    
    log "Construyendo Server (Legacy)..."
    docker build -t $REGISTRY/server:latest ./server
    
    log "Construyendo Client..."
    docker build -t $REGISTRY/client:latest ./client
    
    log "✓ Todas las imágenes han sido construidas"
}

# Subir imágenes al registro
push_images() {
    log "Subiendo imágenes al registro..."
    
    # Login al registro
    echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
    
    # Servicios Core
    docker push $REGISTRY/user-service:latest
    docker push $REGISTRY/student-service:latest
    docker push $REGISTRY/course-service:latest
    
    # Servicios de Negocio
    docker push $REGISTRY/resource-service:latest
    docker push $REGISTRY/communication-service:latest
    docker push $REGISTRY/analytics-service:latest
    
    # Servicios AI
    docker push $REGISTRY/llm-gateway:latest
    docker push $REGISTRY/ai-services:latest
    
    # MCP Services
    docker push $REGISTRY/mcp-orchestrator:latest
    
    # Gateway y Legacy
    docker push $REGISTRY/api-gateway:latest
    docker push $REGISTRY/server:latest
    docker push $REGISTRY/client:latest
    
    log "✓ Todas las imágenes han sido subidas al registro"
}

# Desplegar en Kubernetes
deploy_kubernetes() {
    log "Desplegando en Kubernetes..."
    
    # Crear namespace si no existe
    kubectl create namespace gei-platform --dry-run=client -o yaml | kubectl apply -f -
    
    # Aplicar configuraciones base
    kubectl apply -f k8s/base/ -n gei-platform
    
    # Aplicar configuración de producción
    kubectl apply -k k8s/overlays/production/ -n gei-platform
    
    # Esperar a que todos los pods estén listos
    log "Esperando a que todos los pods estén listos..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=gei-platform -n gei-platform --timeout=300s
    
    log "✓ Despliegue en Kubernetes completado"
}

# Configurar Ingress y SSL
setup_ingress() {
    log "Configurando Ingress y SSL..."
    
    # Aplicar configuración de Ingress
    kubectl apply -f k8s/ingress/production-ingress.yaml -n gei-platform
    
    # Configurar certificados SSL
    kubectl apply -f k8s/cert-manager/production-certificates.yaml -n gei-platform
    
    log "✓ Ingress y SSL configurados"
}

# Verificar salud de los servicios
health_check() {
    log "Verificando salud de los servicios..."
    
    # Esperar un poco para que los servicios se estabilicen
    sleep 30
    
    # Verificar API Gateway
    if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
        log "✓ API Gateway está funcionando"
    else
        error "API Gateway no está respondiendo"
    fi
    
    # Verificar status de microservicios
    if curl -f https://$DOMAIN/status > /dev/null 2>&1; then
        log "✓ Endpoint de status está funcionando"
    else
        warn "Endpoint de status no está respondiendo"
    fi
    
    # Verificar frontend
    if curl -f https://$DOMAIN > /dev/null 2>&1; then
        log "✓ Frontend está funcionando"
    else
        error "Frontend no está respondiendo"
    fi
    
    log "✓ Todos los servicios están funcionando correctamente"
}

# Configurar monitoreo
setup_monitoring() {
    log "Configurando monitoreo..."
    
    # Desplegar Prometheus
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --values monitoring/prometheus/values.yaml
    
    # Desplegar Grafana
    kubectl apply -f monitoring/grafana/ -n monitoring
    
    # Configurar dashboards
    kubectl apply -f monitoring/grafana/dashboards/ -n monitoring
    
    log "✓ Monitoreo configurado"
}

# Configurar backups
setup_backups() {
    log "Configurando backups..."
    
    # Crear CronJob para backups de base de datos
    kubectl apply -f scripts/backup/database/backup-cronjob.yaml -n gei-platform
    
    # Crear CronJob para backups de archivos
    kubectl apply -f scripts/backup/files/backup-cronjob.yaml -n gei-platform
    
    log "✓ Sistema de backups configurado"
}

# Función principal
main() {
    log "🚀 Iniciando despliegue a producción - EduAI Platform"
    log "📅 Fecha: $(date)"
    log "🌍 Dominio: $DOMAIN"
    log "🏗️  Arquitectura: Microservicios con MCP"
    
    # Verificaciones previas
    check_dependencies
    check_environment
    
    # Proceso de despliegue
    build_images
    push_images
    deploy_kubernetes
    setup_ingress
    setup_monitoring
    setup_backups
    
    # Verificación final
    health_check
    
    log "🎉 ¡Despliegue completado exitosamente!"
    log "🌐 Aplicación disponible en: https://$DOMAIN"
    log "📊 Dashboard de monitoreo: https://monitoring.$DOMAIN"
    log "📈 Grafana: https://grafana.$DOMAIN"
}

# Ejecutar función principal
main "$@"