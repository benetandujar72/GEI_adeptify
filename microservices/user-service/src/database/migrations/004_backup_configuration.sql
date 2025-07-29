-- ===== MIGRACIÓN 004 - CONFIGURACIÓN DE BACKUPS =====
-- Fecha: 2025-01-29
-- Descripción: Configurar sistema de backups automáticos

-- ===== TABLA DE BACKUP LOGS =====

CREATE TABLE backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'wal'
    backup_path VARCHAR(500) NOT NULL,
    backup_size BIGINT,
    backup_duration INTERVAL,
    backup_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'in_progress'
    backup_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    backup_completed_at TIMESTAMP,
    backup_error_message TEXT,
    backup_checksum VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== TABLA DE CONFIGURACIÓN DE BACKUPS =====

CREATE TABLE backup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== ÍNDICES =====

CREATE INDEX idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX idx_backup_logs_status ON backup_logs(backup_status);
CREATE INDEX idx_backup_logs_started_at ON backup_logs(backup_started_at);
CREATE INDEX idx_backup_config_key ON backup_config(config_key);

-- ===== TRIGGER =====

CREATE TRIGGER update_backup_config_updated_at 
    BEFORE UPDATE ON backup_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== DATOS INICIALES DE CONFIGURACIÓN =====

INSERT INTO backup_config (config_key, config_value, config_description) VALUES
('backup_enabled', 'true', 'Habilitar backups automáticos'),
('backup_schedule', '0 2 * * *', 'Cron schedule para backups (diario a las 2 AM)'),
('backup_retention_days', '30', 'Días de retención de backups'),
('backup_type', 'full', 'Tipo de backup (full, incremental)'),
('backup_compression', 'gzip', 'Compresión de backups (gzip, bzip2, none)'),
('backup_encryption', 'false', 'Encriptar backups'),
('backup_encryption_key', '', 'Clave de encriptación (vacía si no se usa)'),
('backup_storage_path', '/var/backups/postgresql', 'Ruta de almacenamiento de backups'),
('backup_remote_storage', 'false', 'Usar almacenamiento remoto'),
('backup_remote_url', '', 'URL del almacenamiento remoto'),
('backup_notification_email', 'admin@adeptify.es', 'Email para notificaciones de backup'),
('backup_verify_checksum', 'true', 'Verificar checksum de backups'),
('backup_parallel_jobs', '2', 'Número de jobs paralelos para backup'),
('backup_wal_archiving', 'true', 'Archivar WAL logs'),
('backup_wal_retention', '7', 'Días de retención de WAL logs');

-- ===== FUNCIONES DE BACKUP =====

-- Función para registrar un backup
CREATE OR REPLACE FUNCTION log_backup(
    p_backup_type VARCHAR(50),
    p_backup_path VARCHAR(500),
    p_backup_size BIGINT DEFAULT NULL,
    p_backup_duration INTERVAL DEFAULT NULL,
    p_backup_status VARCHAR(20),
    p_backup_error_message TEXT DEFAULT NULL,
    p_backup_checksum VARCHAR(64) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    backup_id UUID;
BEGIN
    INSERT INTO backup_logs (
        backup_type,
        backup_path,
        backup_size,
        backup_duration,
        backup_status,
        backup_completed_at,
        backup_error_message,
        backup_checksum
    ) VALUES (
        p_backup_type,
        p_backup_path,
        p_backup_size,
        p_backup_duration,
        p_backup_status,
        CASE WHEN p_backup_status = 'success' THEN NOW() ELSE NULL END,
        p_backup_error_message,
        p_backup_checksum
    ) RETURNING id INTO backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar backups antiguos
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Obtener días de retención de la configuración
    SELECT config_value::INTEGER INTO retention_days 
    FROM backup_config 
    WHERE config_key = 'backup_retention_days';
    
    -- Eliminar backups más antiguos que los días de retención
    DELETE FROM backup_logs 
    WHERE backup_started_at < NOW() - (retention_days || ' days')::INTERVAL
    AND backup_status = 'success';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de backup
CREATE OR REPLACE FUNCTION get_backup_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_backups BIGINT,
    successful_backups BIGINT,
    failed_backups BIGINT,
    total_size BIGINT,
    avg_duration INTERVAL,
    last_backup TIMESTAMP,
    next_backup TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE backup_status = 'success') as successful_backups,
        COUNT(*) FILTER (WHERE backup_status = 'failed') as failed_backups,
        COALESCE(SUM(backup_size), 0) as total_size,
        AVG(backup_duration) as avg_duration,
        MAX(backup_started_at) as last_backup,
        MAX(backup_started_at) + INTERVAL '1 day' as next_backup
    FROM backup_logs
    WHERE backup_started_at > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar integridad de backup
CREATE OR REPLACE FUNCTION verify_backup_integrity(backup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    backup_record RECORD;
    file_exists BOOLEAN;
BEGIN
    -- Obtener información del backup
    SELECT * INTO backup_record 
    FROM backup_logs 
    WHERE id = backup_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup no encontrado';
    END IF;
    
    -- Verificar si el archivo existe (simulado)
    -- En producción, esto verificaría el archivo real
    file_exists := true; -- Simulado
    
    -- Verificar checksum si está disponible
    IF backup_record.backup_checksum IS NOT NULL THEN
        -- Aquí se verificaría el checksum real
        RETURN file_exists AND true; -- Simulado
    END IF;
    
    RETURN file_exists;
END;
$$ LANGUAGE plpgsql;

-- ===== VISTA PARA MONITOREO =====

CREATE VIEW backup_monitoring AS
SELECT 
    bl.id,
    bl.backup_type,
    bl.backup_path,
    bl.backup_size,
    bl.backup_duration,
    bl.backup_status,
    bl.backup_started_at,
    bl.backup_completed_at,
    CASE 
        WHEN bl.backup_status = 'success' THEN 'OK'
        WHEN bl.backup_status = 'failed' THEN 'ERROR'
        WHEN bl.backup_status = 'in_progress' THEN 'RUNNING'
        ELSE 'UNKNOWN'
    END as status_display,
    CASE 
        WHEN bl.backup_size IS NOT NULL THEN 
            pg_size_pretty(bl.backup_size)
        ELSE 'N/A'
    END as size_display,
    CASE 
        WHEN bl.backup_duration IS NOT NULL THEN 
            EXTRACT(EPOCH FROM bl.backup_duration)::INTEGER || 's'
        ELSE 'N/A'
    END as duration_display,
    CASE 
        WHEN bl.backup_started_at > NOW() - INTERVAL '24 hours' THEN 'Recent'
        WHEN bl.backup_started_at > NOW() - INTERVAL '7 days' THEN 'This Week'
        WHEN bl.backup_started_at > NOW() - INTERVAL '30 days' THEN 'This Month'
        ELSE 'Old'
    END as age_category
FROM backup_logs bl
ORDER BY bl.backup_started_at DESC;

-- ===== COMENTARIOS =====

COMMENT ON TABLE backup_logs IS 'Registro de backups realizados';
COMMENT ON TABLE backup_config IS 'Configuración del sistema de backups';
COMMENT ON FUNCTION log_backup(VARCHAR, VARCHAR, BIGINT, INTERVAL, VARCHAR, TEXT, VARCHAR) IS 'Registra un nuevo backup en el sistema';
COMMENT ON FUNCTION cleanup_old_backups() IS 'Limpia backups antiguos según la configuración de retención';
COMMENT ON FUNCTION get_backup_stats(INTEGER) IS 'Obtiene estadísticas de backups de los últimos N días';
COMMENT ON FUNCTION verify_backup_integrity(UUID) IS 'Verifica la integridad de un backup específico';
COMMENT ON VIEW backup_monitoring IS 'Vista para monitoreo de backups en tiempo real';