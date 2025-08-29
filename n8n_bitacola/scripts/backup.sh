#!/bin/bash

# Script de backup per al Sistema d'Avaluació Automàtica - Adeptify.es
# Autor: Equip de Desenvolupament Adeptify.es

set -e

# Colors per a output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuració
BACKUP_DIR="./backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="n8n_backup_${TIMESTAMP}"

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

# Verificar que el directori de backup existeix
check_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creant directori de backup: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Backup de la base de dades PostgreSQL
backup_database() {
    log "Iniciant backup de la base de dades..."

    # Carregar variables d'entorn
    if [ -f .env ]; then
        source .env
    else
        error "Fitxer .env no trobat. Si us plau, executa setup.sh primer."
    fi

    # Backup de PostgreSQL
    docker-compose exec -T postgres pg_dump -U n8n -d n8n > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"

    if [ $? -eq 0 ]; then
        log "Backup de la base de dades completat: ${BACKUP_NAME}_database.sql"
    else
        error "Error en el backup de la base de dades"
    fi
}

# Backup dels workflows
backup_workflows() {
    log "Iniciant backup dels workflows..."

    if [ -d "workflows" ]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_workflows.tar.gz" workflows/
        log "Backup dels workflows completat: ${BACKUP_NAME}_workflows.tar.gz"
    else
        warn "Directori workflows no trobat, saltant backup de workflows"
    fi
}

# Backup de la configuració
backup_config() {
    log "Iniciant backup de la configuració..."

    if [ -d "config" ]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" config/
        log "Backup de la configuració completat: ${BACKUP_NAME}_config.tar.gz"
    else
        warn "Directori config no trobat, saltant backup de configuració"
    fi
}

# Backup dels logs
backup_logs() {
    log "Iniciant backup dels logs..."

    if [ -d "logs" ]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_logs.tar.gz" logs/
        log "Backup dels logs completat: ${BACKUP_NAME}_logs.tar.gz"
    else
        warn "Directori logs no trobat, saltant backup de logs"
    fi
}

# Crear fitxer de metadades del backup
create_backup_metadata() {
    log "Creant metadades del backup..."

    cat > "$BACKUP_DIR/${BACKUP_NAME}_metadata.json" << EOF
{
    "backup_name": "${BACKUP_NAME}",
    "timestamp": "$(date -Iseconds)",
    "version": "1.0",
    "components": {
        "database": true,
        "workflows": true,
        "config": true,
        "logs": true
    },
    "system_info": {
        "hostname": "$(hostname)",
        "docker_version": "$(docker --version)",
        "docker_compose_version": "$(docker-compose --version)"
    },
    "n8n_info": {
        "version": "$(docker-compose exec -T n8n n8n --version 2>/dev/null || echo 'unknown')"
    }
}
EOF

    log "Metadades del backup creades: ${BACKUP_NAME}_metadata.json"
}

# Netejar backups antics
cleanup_old_backups() {
    log "Netejant backups antics (més de $RETENTION_DAYS dies)..."

    find "$BACKUP_DIR" -name "n8n_backup_*" -type f -mtime +$RETENTION_DAYS -delete

    log "Neteja de backups antics completada"
}

# Verificar integritat del backup
verify_backup() {
    log "Verificant integritat del backup..."

    # Verificar que els fitxers existeixen
    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_database.sql" ]; then
        log "✓ Backup de la base de dades verificat"
    else
        error "✗ Backup de la base de dades no trobat"
    fi

    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_workflows.tar.gz" ]; then
        log "✓ Backup dels workflows verificat"
    fi

    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" ]; then
        log "✓ Backup de la configuració verificat"
    fi

    if [ -f "$BACKUP_DIR/${BACKUP_NAME}_metadata.json" ]; then
        log "✓ Metadades del backup verificades"
    fi
}

# Mostrar resum del backup
show_backup_summary() {
    log "Resum del backup completat:"
    echo "=================================="
    echo "Backup Name: $BACKUP_NAME"
    echo "Timestamp: $(date)"
    echo "Location: $BACKUP_DIR"
    echo ""
    echo "Fitxers creats:"
    ls -la "$BACKUP_DIR/${BACKUP_NAME}"*
    echo ""
    echo "Mida total:"
    du -sh "$BACKUP_DIR/${BACKUP_NAME}"*
    echo "=================================="
}

# Funció principal
main() {
    log "Iniciant procés de backup del Sistema d'Avaluació Automàtica - Adeptify.es"

    check_backup_directory
    backup_database
    backup_workflows
    backup_config
    backup_logs
    create_backup_metadata
    cleanup_old_backups
    verify_backup
    show_backup_summary

    log "Backup completat amb èxit!"
}

# Executar funció principal
main "$@"
