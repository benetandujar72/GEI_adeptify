#!/bin/bash

# ===== SCRIPT DE CONFIGURACIÓN DE CRON PARA BACKUPS =====
# Fecha: 2025-01-29
# Descripción: Configurar cron jobs para backups automáticos

set -e

# ===== CONFIGURACIÓN =====

# Rutas
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuración de cron
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * *}"  # Diario a las 2 AM
CRON_USER="${CRON_USER:-$USER}"

# Configuración de logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql-backup-cron.log}"

# ===== FUNCIONES =====

log() {
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Verificar que el script de backup existe
check_backup_script() {
    if [[ ! -f "$BACKUP_SCRIPT" ]]; then
        log "ERROR: Script de backup no encontrado: $BACKUP_SCRIPT"
        exit 1
    fi
    
    if [[ ! -x "$BACKUP_SCRIPT" ]]; then
        log "INFO: Haciendo ejecutable el script de backup..."
        chmod +x "$BACKUP_SCRIPT"
    fi
    
    log "INFO: Script de backup verificado: $BACKUP_SCRIPT"
}

# Crear directorio de logs si no existe
setup_logging() {
    local log_dir=$(dirname "$LOG_FILE")
    
    if [[ ! -d "$log_dir" ]]; then
        log "INFO: Creando directorio de logs: $log_dir"
        sudo mkdir -p "$log_dir"
        sudo chown "$CRON_USER:$CRON_USER" "$log_dir"
    fi
    
    # Crear archivo de log si no existe
    if [[ ! -f "$LOG_FILE" ]]; then
        touch "$LOG_FILE"
        chown "$CRON_USER:$CRON_USER" "$LOG_FILE"
    fi
    
    log "INFO: Logging configurado: $LOG_FILE"
}

# Configurar variables de entorno para cron
setup_environment() {
    local env_file="$PROJECT_ROOT/.env"
    local cron_env_file="/tmp/cron_env_$$"
    
    log "INFO: Configurando variables de entorno para cron..."
    
    # Crear archivo temporal con variables de entorno
    cat > "$cron_env_file" << EOF
# Variables de entorno para cron jobs
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-adeptify}
DB_USER=${DB_USER:-adeptify}
DB_PASSWORD=${DB_PASSWORD:-adeptify123}

# Configuración de backup
BACKUP_TYPE=${BACKUP_TYPE:-full}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_STORAGE_PATH=${BACKUP_STORAGE_PATH:-/var/backups/postgresql}
BACKUP_COMPRESSION=${BACKUP_COMPRESSION:-gzip}

# Configuración de notificaciones
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-admin@adeptify.es}
NOTIFICATION_ENABLED=${NOTIFICATION_ENABLED:-true}

# Configuración de logging
LOG_FILE=${LOG_FILE:-/var/log/postgresql-backup.log}
LOG_LEVEL=${LOG_LEVEL:-INFO}

# Variables del sistema
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=$HOME
EOF

    # Si existe un archivo .env, agregar sus variables
    if [[ -f "$env_file" ]]; then
        log "INFO: Agregando variables desde .env"
        cat "$env_file" >> "$cron_env_file"
    fi
    
    log "INFO: Variables de entorno preparadas: $cron_env_file"
    echo "$cron_env_file"
}

# Crear entrada de cron
create_cron_job() {
    local env_file="$1"
    local cron_entry="$CRON_SCHEDULE source $env_file && $BACKUP_SCRIPT >> $LOG_FILE 2>&1"
    
    log "INFO: Creando entrada de cron..."
    log "INFO: Schedule: $CRON_SCHEDULE"
    log "INFO: Comando: $BACKUP_SCRIPT"
    
    # Verificar si ya existe la entrada
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        log "WARN: Ya existe una entrada de cron para el backup"
        log "INFO: Eliminando entrada existente..."
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
    fi
    
    # Agregar nueva entrada
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    log "INFO: Entrada de cron creada exitosamente"
}

# Verificar configuración de cron
verify_cron_setup() {
    log "INFO: Verificando configuración de cron..."
    
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        log "INFO: ✅ Entrada de cron encontrada"
        crontab -l | grep "$BACKUP_SCRIPT"
    else
        log "ERROR: ❌ Entrada de cron no encontrada"
        return 1
    fi
    
    # Verificar permisos del script
    if [[ -x "$BACKUP_SCRIPT" ]]; then
        log "INFO: ✅ Script de backup es ejecutable"
    else
        log "ERROR: ❌ Script de backup no es ejecutable"
        return 1
    fi
    
    # Verificar directorio de logs
    local log_dir=$(dirname "$LOG_FILE")
    if [[ -d "$log_dir" && -w "$log_dir" ]]; then
        log "INFO: ✅ Directorio de logs es escribible"
    else
        log "ERROR: ❌ Directorio de logs no es escribible: $log_dir"
        return 1
    fi
    
    log "INFO: ✅ Configuración de cron verificada correctamente"
}

# Mostrar estado de cron
show_cron_status() {
    log "INFO: === ESTADO DE CRON JOBS ==="
    
    echo "Cron jobs actuales:"
    crontab -l 2>/dev/null || echo "No hay cron jobs configurados"
    
    echo ""
    echo "Próximas ejecuciones programadas:"
    if command -v crontab &> /dev/null; then
        # Mostrar próximas 5 ejecuciones (aproximado)
        for i in {1..5}; do
            local next_run=$(date -d "tomorrow 2:00" +"%Y-%m-%d %H:%M:%S")
            echo "  $i. $next_run - Backup automático"
        done
    fi
    
    echo ""
    echo "Logs de backup:"
    if [[ -f "$LOG_FILE" ]]; then
        echo "  Archivo: $LOG_FILE"
        echo "  Tamaño: $(du -h "$LOG_FILE" | cut -f1)"
        echo "  Última modificación: $(stat -c %y "$LOG_FILE")"
    else
        echo "  No hay archivo de log aún"
    fi
}

# Eliminar configuración de cron
remove_cron_job() {
    log "INFO: Eliminando entrada de cron..."
    
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        log "INFO: ✅ Entrada de cron eliminada"
    else
        log "INFO: No se encontró entrada de cron para eliminar"
    fi
}

# Probar script de backup
test_backup_script() {
    log "INFO: Probando script de backup..."
    
    # Crear archivo de log temporal para la prueba
    local test_log="/tmp/backup_test_$$.log"
    
    if "$BACKUP_SCRIPT" > "$test_log" 2>&1; then
        log "INFO: ✅ Script de backup ejecutado exitosamente"
        log "INFO: Log de prueba: $test_log"
    else
        log "ERROR: ❌ Error ejecutando script de backup"
        log "ERROR: Ver log de prueba: $test_log"
        cat "$test_log"
        return 1
    fi
}

# Mostrar ayuda
show_help() {
    cat << EOF
Script de configuración de cron para backups automáticos

Uso: $0 [OPCIÓN]

Opciones:
  install     Instalar cron job para backup automático
  remove      Eliminar cron job de backup
  status      Mostrar estado de la configuración
  test        Probar script de backup
  verify      Verificar configuración
  help        Mostrar esta ayuda

Variables de entorno:
  CRON_SCHEDULE      Schedule de cron (default: "0 2 * * *")
  CRON_USER          Usuario para cron (default: usuario actual)
  LOG_FILE           Archivo de log (default: /var/log/postgresql-backup-cron.log)
  DB_*               Variables de configuración de base de datos

Ejemplos:
  $0 install          # Instalar backup diario a las 2 AM
  CRON_SCHEDULE="0 3 * * 0" $0 install  # Backup semanal domingos a las 3 AM
  $0 status           # Ver estado de la configuración
  $0 test             # Probar script de backup

EOF
}

# ===== FUNCIÓN PRINCIPAL =====

main() {
    local action="${1:-help}"
    
    log "INFO: === CONFIGURACIÓN DE CRON PARA BACKUPS ==="
    log "INFO: Acción: $action"
    log "INFO: Script de backup: $BACKUP_SCRIPT"
    log "INFO: Usuario: $CRON_USER"
    
    case "$action" in
        "install")
            check_backup_script
            setup_logging
            local env_file=$(setup_environment)
            create_cron_job "$env_file"
            verify_cron_setup
            show_cron_status
            log "INFO: ✅ Instalación completada"
            ;;
        "remove")
            remove_cron_job
            log "INFO: ✅ Desinstalación completada"
            ;;
        "status")
            show_cron_status
            ;;
        "test")
            check_backup_script
            test_backup_script
            ;;
        "verify")
            check_backup_script
            verify_cron_setup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# ===== EJECUCIÓN =====

# Verificar si se ejecuta directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi