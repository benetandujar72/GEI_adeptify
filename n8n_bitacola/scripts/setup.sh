#!/bin/bash

# Script d'instal·lació per al Sistema d'Avaluació Automàtica - Adeptify.es
# Autor: Equip de Desenvolupament Adeptify.es

set -e

# Colors per a output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funció per a logging
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

# Verificar prerequisits
check_prerequisites() {
    log "Verificant prerequisits..."

    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker no està instal·lat. Si us plau, instal·la Docker primer."
    fi

    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose no està instal·lat. Si us plau, instal·la Docker Compose primer."
    fi

    # Verificar que Docker està executant-se
    if ! docker info &> /dev/null; then
        error "Docker no està executant-se. Si us plau, inicia Docker primer."
    fi

    log "Tots els prerequisits estan satisfets!"
}

# Crear directoris necessaris
create_directories() {
    log "Creant directoris necessaris..."

    mkdir -p workflows
    mkdir -p config
    mkdir -p scripts
    mkdir -p docs
    mkdir -p backups
    mkdir -p logs
    mkdir -p nginx/ssl
    mkdir -p nginx/sites-enabled
    mkdir -p traefik/letsencrypt

    log "Directoris creats correctament!"
}

# Configurar variables d'entorn
setup_environment() {
    log "Configurant variables d'entorn..."

    if [ ! -f .env ]; then
        cp config/n8n.env .env
        warn "Fitxer .env creat. Si us plau, edita les variables d'entorn segons les teves necessitats."
    else
        log "Fitxer .env ja existeix."
    fi

    # Generar claus de seguretat si no existeixen
    if ! grep -q "your-super-secret-encryption-key-change-this" .env; then
        log "Generant claus de seguretat..."
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        JWT_SECRET=$(openssl rand -hex 32)
        SESSION_SECRET=$(openssl rand -hex 32)

        sed -i "s/your-super-secret-encryption-key-change-this/$ENCRYPTION_KEY/g" .env
        sed -i "s/your-jwt-secret-key/$JWT_SECRET/g" .env
        sed -i "s/your-session-secret/$SESSION_SECRET/g" .env

        log "Claus de seguretat generades correctament!"
    fi
}

# Configurar nginx
setup_nginx() {
    log "Configurant nginx..."

    if [ ! -f nginx/nginx.conf ]; then
        cat > nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
EOF
    fi

    if [ ! -f nginx/sites-enabled/n8n.adeptify.es ]; then
        cat > nginx/sites-enabled/n8n.adeptify.es << 'EOF'
server {
    listen 80;
    server_name n8n.adeptify.es;

    location / {
        proxy_pass http://n8n:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF
    fi

    log "Nginx configurat correctament!"
}

# Iniciar serveis
start_services() {
    log "Iniciant serveis..."

    # Carregar variables d'entorn
    source .env

    # Iniciar serveis amb Docker Compose
    docker-compose up -d

    log "Serveis iniciats correctament!"
    log "n8n està disponible a: https://n8n.adeptify.es"
    log "Credencials per defecte: admin / adeptify2024"
}

# Verificar estat dels serveis
check_services() {
    log "Verificant estat dels serveis..."

    sleep 10

    if docker-compose ps | grep -q "Up"; then
        log "Tots els serveis estan executant-se correctament!"
    else
        error "Alguns serveis no s'han iniciat correctament. Revisa els logs amb 'docker-compose logs'"
    fi
}

# Funció principal
main() {
    log "Iniciant instal·lació del Sistema d'Avaluació Automàtica - Adeptify.es"

    check_prerequisites
    create_directories
    setup_environment
    setup_nginx
    start_services
    check_services

    log "Instal·lació completada amb èxit!"
    log "Pròxims passos:"
    log "1. Edita el fitxer .env amb les teves credencials"
    log "2. Accedeix a https://n8n.adeptify.es"
    log "3. Importa els workflows des de la carpeta workflows/"
    log "4. Configura les credencials d'API per a IA"
}

# Executar funció principal
main "$@"
