#!/bin/bash

# ===== SCRIPT DE BACKUP AUTOMÁTICO PARA POSTGRESQL =====
# Fecha: 2025-01-29
# Descripción: Script para realizar backups automáticos de la base de datos

set -e

# ===== CONFIGURACIÓN =====

# Variables de entorno
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-adeptify}"
DB_USER="${DB_USER:-adeptify}"
DB_PASSWORD="${DB_PASSWORD:-adeptify123}"

# Configuración de backup
BACKUP_TYPE="${BACKUP_TYPE:-full}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_STORAGE_PATH="${BACKUP_STORAGE_PATH:-/var/backups/postgresql}"
BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-gzip}"
BACKUP_ENCRYPTION="${BACKUP_ENCRYPTION:-false}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Configuración de notificaciones
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-admin@adeptify.es}"
NOTIFICATION_ENABLED="${NOTIFICATION_ENABLED:-true}"

# Configuración de logging
LOG_FILE="${LOG_FILE:-/var/log/postgresql-backup.log}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# ===== FUNCIONES DE LOGGING =====

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "DEBUG")
            if [[ "$LOG_LEVEL" == "DEBUG" ]]; then
                echo "[$timestamp] [DEBUG] $message" | tee -a "$LOG_FILE"
            fi
            ;;
        "INFO")
            echo "[$timestamp] [INFO] $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo "[$timestamp] [WARN] $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo "[$timestamp] [ERROR] $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# ===== FUNCIONES DE UTILIDAD =====

# Verificar dependencias
check_dependencies() {
    log "INFO" "Verificando dependencias..."
    
    local dependencies=("pg_dump" "psql" "gzip" "sha256sum")
    
    for dep in "${dependencies[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log "ERROR" "Dependencia no encontrada: $dep"
            exit 1
        fi
    done
    
    log "INFO" "Todas las dependencias están disponibles"
}

# Verificar conectividad a la base de datos
check_database_connection() {
    log "INFO" "Verificando conectividad a la base de datos..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log "ERROR" "No se puede conectar a la base de datos"
        log "ERROR" "Host: $DB_HOST, Puerto: $DB_PORT, Usuario: $DB_USER, Base de datos: $DB_NAME"
        exit 1
    fi
    
    log "INFO" "Conexión a la base de datos establecida correctamente"
}

# Crear directorio de backup si no existe
create_backup_directory() {
    log "INFO" "Creando directorio de backup: $BACKUP_STORAGE_PATH"
    
    if [[ ! -d "$BACKUP_STORAGE_PATH" ]]; then
        mkdir -p "$BACKUP_STORAGE_PATH"
        log "INFO" "Directorio de backup creado"
    else
        log "INFO" "Directorio de backup ya existe"
    fi
}

# Generar nombre de archivo de backup
generate_backup_filename() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local filename="backup_${DB_NAME}_${BACKUP_TYPE}_${timestamp}.sql"
    
    if [[ "$BACKUP_COMPRESSION" == "gzip" ]]; then
        filename="${filename}.gz"
    elif [[ "$BACKUP_COMPRESSION" == "bzip2" ]]; then
        filename="${filename}.bz2"
    fi
    
    echo "$filename"
}

# Realizar backup completo
perform_full_backup() {
    local backup_file="$1"
    local start_time=$(date +%s)
    
    log "INFO" "Iniciando backup completo..."
    log "INFO" "Archivo de backup: $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Comando base de pg_dump
    local pg_dump_cmd="pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    
    # Agregar opciones según el tipo de backup
    pg_dump_cmd="$pg_dump_cmd --verbose --clean --if-exists --no-owner --no-privileges"
    
    # Agregar compresión si está habilitada
    if [[ "$BACKUP_COMPRESSION" == "gzip" ]]; then
        pg_dump_cmd="$pg_dump_cmd | gzip > $backup_file"
    elif [[ "$BACKUP_COMPRESSION" == "bzip2" ]]; then
        pg_dump_cmd="$pg_dump_cmd | bzip2 > $backup_file"
    else
        pg_dump_cmd="$pg_dump_cmd > $backup_file"
    fi
    
    # Ejecutar backup
    if eval "$pg_dump_cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "INFO" "Backup completo completado exitosamente en ${duration} segundos"
        return 0
    else
        log "ERROR" "Error durante el backup completo"
        return 1
    fi
}

# Realizar backup incremental (solo WAL)
perform_incremental_backup() {
    log "INFO" "Backup incremental no implementado aún"
    log "WARN" "Realizando backup completo en su lugar"
    return 1
}

# Calcular checksum del archivo de backup
calculate_backup_checksum() {
    local backup_file="$1"
    
    if [[ -f "$backup_file" ]]; then
        local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
        log "INFO" "Checksum del backup: $checksum"
        echo "$checksum"
    else
        log "ERROR" "Archivo de backup no encontrado: $backup_file"
        return 1
    fi
}

# Verificar integridad del backup
verify_backup_integrity() {
    local backup_file="$1"
    local expected_checksum="$2"
    
    log "INFO" "Verificando integridad del backup..."
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Archivo de backup no encontrado: $backup_file"
        return 1
    fi
    
    local actual_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    
    if [[ "$actual_checksum" == "$expected_checksum" ]]; then
        log "INFO" "Integridad del backup verificada correctamente"
        return 0
    else
        log "ERROR" "Error de integridad del backup"
        log "ERROR" "Esperado: $expected_checksum"
        log "ERROR" "Actual: $actual_checksum"
        return 1
    fi
}

# Limpiar backups antiguos
cleanup_old_backups() {
    log "INFO" "Limpiando backups antiguos (más de $BACKUP_RETENTION_DAYS días)..."
    
    local deleted_count=0
    
    # Encontrar y eliminar backups antiguos
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            rm "$file"
            log "INFO" "Eliminado: $file"
            ((deleted_count++))
        fi
    done < <(find "$BACKUP_STORAGE_PATH" -name "backup_${DB_NAME}_*.sql*" -mtime +$BACKUP_RETENTION_DAYS -print0)
    
    log "INFO" "Limpieza completada. $deleted_count archivos eliminados"
}

# Enviar notificación por email
send_notification() {
    local subject="$1"
    local message="$2"
    local status="$3"
    
    if [[ "$NOTIFICATION_ENABLED" == "true" && -n "$NOTIFICATION_EMAIL" ]]; then
        log "INFO" "Enviando notificación a: $NOTIFICATION_EMAIL"
        
        local email_body="
Backup de Base de Datos - $status

$message

Fecha: $(date)
Base de datos: $DB_NAME
Host: $DB_HOST:$DB_PORT
Usuario: $DB_USER

Este es un mensaje automático del sistema de backup.
        "
        
        if command -v mail &> /dev/null; then
            echo "$email_body" | mail -s "$subject" "$NOTIFICATION_EMAIL"
            log "INFO" "Notificación enviada por email"
        else
            log "WARN" "Comando 'mail' no disponible, no se pudo enviar notificación"
        fi
    fi
}

# Registrar backup en la base de datos
log_backup_to_database() {
    local backup_file="$1"
    local backup_size="$2"
    local backup_duration="$3"
    local backup_status="$4"
    local backup_checksum="$5"
    
    log "INFO" "Registrando backup en la base de datos..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local sql="
    INSERT INTO backup_logs (
        backup_type, 
        backup_path, 
        backup_size, 
        backup_duration, 
        backup_status, 
        backup_checksum
    ) VALUES (
        '$BACKUP_TYPE',
        '$backup_file',
        $backup_size,
        INTERVAL '$backup_duration seconds',
        '$backup_status',
        '$backup_checksum'
    );
    "
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" &> /dev/null; then
        log "INFO" "Backup registrado en la base de datos"
    else
        log "WARN" "No se pudo registrar el backup en la base de datos"
    fi
}

# ===== FUNCIÓN PRINCIPAL =====

main() {
    local start_time=$(date +%s)
    local backup_file=""
    local backup_status="success"
    local error_message=""
    
    log "INFO" "=== INICIANDO BACKUP DE BASE DE DATOS ==="
    log "INFO" "Tipo de backup: $BACKUP_TYPE"
    log "INFO" "Base de datos: $DB_NAME"
    log "INFO" "Host: $DB_HOST:$DB_PORT"
    
    # Verificaciones iniciales
    check_dependencies
    check_database_connection
    create_backup_directory
    
    # Generar nombre de archivo
    backup_file="$BACKUP_STORAGE_PATH/$(generate_backup_filename)"
    
    # Realizar backup según el tipo
    case "$BACKUP_TYPE" in
        "full")
            if ! perform_full_backup "$backup_file"; then
                backup_status="failed"
                error_message="Error durante el backup completo"
            fi
            ;;
        "incremental")
            if ! perform_incremental_backup "$backup_file"; then
                backup_status="failed"
                error_message="Error durante el backup incremental"
            fi
            ;;
        *)
            log "ERROR" "Tipo de backup no válido: $BACKUP_TYPE"
            exit 1
            ;;
    esac
    
    # Verificar y procesar backup si fue exitoso
    if [[ "$backup_status" == "success" ]]; then
        # Calcular checksum
        local backup_checksum=$(calculate_backup_checksum "$backup_file")
        
        # Verificar integridad
        if ! verify_backup_integrity "$backup_file" "$backup_checksum"; then
            backup_status="failed"
            error_message="Error de integridad del backup"
        else
            # Obtener información del archivo
            local backup_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
            local end_time=$(date +%s)
            local backup_duration=$((end_time - start_time))
            
            # Registrar en base de datos
            log_backup_to_database "$backup_file" "$backup_size" "$backup_duration" "$backup_status" "$backup_checksum"
            
            log "INFO" "Backup completado exitosamente"
            log "INFO" "Archivo: $backup_file"
            log "INFO" "Tamaño: $(numfmt --to=iec-i --suffix=B $backup_size)"
            log "INFO" "Duración: ${backup_duration} segundos"
            log "INFO" "Checksum: $backup_checksum"
        fi
    fi
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    # Enviar notificación
    local notification_subject="Backup de Base de Datos - $backup_status"
    local notification_message="
Backup completado con estado: $backup_status

Archivo: $backup_file
Duración: ${backup_duration:-0} segundos
Tamaño: $(numfmt --to=iec-i --suffix=B ${backup_size:-0})

${error_message:-}
    "
    
    send_notification "$notification_subject" "$notification_message" "$backup_status"
    
    # Finalizar
    local total_duration=$(( $(date +%s) - start_time ))
    log "INFO" "=== BACKUP COMPLETADO ==="
    log "INFO" "Estado: $backup_status"
    log "INFO" "Duración total: ${total_duration} segundos"
    
    if [[ "$backup_status" == "success" ]]; then
        exit 0
    else
        exit 1
    fi
}

# ===== EJECUCIÓN =====

# Verificar si se ejecuta directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi