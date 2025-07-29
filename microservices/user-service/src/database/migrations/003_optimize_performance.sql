-- ===== MIGRACIÓN 003 - OPTIMIZAR RENDIMIENTO =====
-- Fecha: 2025-01-29
-- Descripción: Optimizar índices y rendimiento de la base de datos

-- ===== ÍNDICES COMPUESTOS =====

-- Índice compuesto para búsquedas de usuarios
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('spanish', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(email, '') || ' ' || 
    coalesce(username, '')
));

-- Índice compuesto para filtros de usuario
CREATE INDEX idx_users_role_status ON users(role, status) WHERE deleted_at IS NULL;

-- Índice compuesto para sesiones activas
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at) 
WHERE revoked_at IS NULL AND expires_at > NOW();

-- Índice compuesto para auditoría por usuario y tiempo
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, timestamp DESC);

-- Índice para búsqueda de texto en logs de auditoría
CREATE INDEX idx_audit_logs_action_search ON audit_logs USING gin(to_tsvector('spanish', action));

-- ===== ÍNDICES PARCIALES =====

-- Índice para usuarios activos
CREATE INDEX idx_users_active ON users(id, email, role, status) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Índice para sesiones no revocadas
CREATE INDEX idx_sessions_not_revoked ON sessions(id, user_id, expires_at) 
WHERE revoked_at IS NULL;

-- Índice para logs de auditoría recientes (últimos 30 días)
CREATE INDEX idx_audit_logs_recent ON audit_logs(user_id, timestamp) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- ===== ÍNDICES FUNCIONALES =====

-- Índice para búsqueda por email (case insensitive)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Índice para búsqueda por username (case insensitive)
CREATE INDEX idx_users_username_lower ON users(LOWER(username));

-- Índice para fecha de creación (últimos usuarios)
CREATE INDEX idx_users_created_recent ON users(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '1 year';

-- ===== VISTAS MATERIALIZADAS =====

-- Vista materializada para estadísticas de usuarios
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE role = 'student') as students,
    COUNT(*) FILTER (WHERE role = 'teacher') as teachers,
    COUNT(*) FILTER (WHERE role = 'admin') as admins,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
    COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_users_7d
FROM users 
WHERE deleted_at IS NULL;

-- Vista materializada para estadísticas de sesiones
CREATE MATERIALIZED VIEW session_stats AS
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > NOW()) as active_sessions,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_sessions,
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_sessions,
    COUNT(DISTINCT user_id) as users_with_sessions
FROM sessions;

-- ===== FUNCIONES DE AYUDA =====

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW() OR revoked_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar logs de auditoría antiguos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar estadísticas
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW user_stats;
    REFRESH MATERIALIZED VIEW session_stats;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS PARA MANTENIMIENTO =====

-- Trigger para actualizar estadísticas cuando cambia un usuario
CREATE OR REPLACE FUNCTION trigger_refresh_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_user_stats();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_user_stats();

-- Trigger para actualizar estadísticas cuando cambia una sesión
CREATE OR REPLACE FUNCTION trigger_refresh_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_user_stats();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_session_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_session_stats();

-- ===== CONFIGURACIÓN DE RENDIMIENTO =====

-- Configurar autovacuum para tablas grandes
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.2);
ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.05);

-- Configurar fillfactor para optimizar actualizaciones
ALTER TABLE users SET (fillfactor = 90);
ALTER TABLE sessions SET (fillfactor = 85);
ALTER TABLE audit_logs SET (fillfactor = 80);

-- ===== COMENTARIOS =====

COMMENT ON MATERIALIZED VIEW user_stats IS 'Estadísticas agregadas de usuarios para consultas rápidas';
COMMENT ON MATERIALIZED VIEW session_stats IS 'Estadísticas agregadas de sesiones para consultas rápidas';
COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Limpia sesiones expiradas y revocadas';
COMMENT ON FUNCTION cleanup_old_audit_logs(INTEGER) IS 'Limpia logs de auditoría más antiguos que el número de días especificado';
COMMENT ON FUNCTION refresh_user_stats() IS 'Actualiza las vistas materializadas de estadísticas';