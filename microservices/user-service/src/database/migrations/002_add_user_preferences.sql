-- ===== MIGRACIÓN 002 - AGREGAR TABLA DE PREFERENCIAS =====
-- Fecha: 2025-01-29
-- Descripción: Agregar tabla para preferencias personalizadas de usuario

-- ===== TABLA USER_PREFERENCES_DETAILED =====

CREATE TABLE user_preferences_detailed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preferencias de interfaz
    ui_theme VARCHAR(20) DEFAULT 'light',
    ui_language VARCHAR(10) DEFAULT 'es',
    ui_timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    ui_date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    ui_time_format VARCHAR(10) DEFAULT '24h',
    
    -- Preferencias de notificación
    notifications_email_enabled BOOLEAN DEFAULT true,
    notifications_push_enabled BOOLEAN DEFAULT true,
    notifications_sms_enabled BOOLEAN DEFAULT false,
    notifications_in_app_enabled BOOLEAN DEFAULT true,
    notifications_frequency VARCHAR(20) DEFAULT 'immediate',
    notifications_quiet_hours_start TIME DEFAULT '22:00',
    notifications_quiet_hours_end TIME DEFAULT '08:00',
    
    -- Preferencias de privacidad
    privacy_profile_visibility VARCHAR(20) DEFAULT 'public',
    privacy_show_email BOOLEAN DEFAULT false,
    privacy_show_phone BOOLEAN DEFAULT false,
    privacy_show_location BOOLEAN DEFAULT true,
    privacy_allow_search BOOLEAN DEFAULT true,
    privacy_data_sharing BOOLEAN DEFAULT false,
    privacy_analytics BOOLEAN DEFAULT true,
    
    -- Preferencias de seguridad
    security_two_factor_enabled BOOLEAN DEFAULT false,
    security_session_timeout INTEGER DEFAULT 3600, -- segundos
    security_password_expiry_days INTEGER DEFAULT 90,
    security_login_notifications BOOLEAN DEFAULT true,
    
    -- Preferencias de contenido
    content_language VARCHAR(10) DEFAULT 'es',
    content_maturity_level VARCHAR(20) DEFAULT 'all',
    content_auto_translate BOOLEAN DEFAULT false,
    content_show_help_tooltips BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ===== ÍNDICES =====

CREATE INDEX idx_user_preferences_detailed_user_id ON user_preferences_detailed(user_id);
CREATE INDEX idx_user_preferences_detailed_ui_theme ON user_preferences_detailed(ui_theme);
CREATE INDEX idx_user_preferences_detailed_ui_language ON user_preferences_detailed(ui_language);

-- ===== TRIGGER =====

CREATE TRIGGER update_user_preferences_detailed_updated_at 
    BEFORE UPDATE ON user_preferences_detailed 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== MIGRAR DATOS EXISTENTES =====

-- Migrar preferencias básicas desde la tabla users
INSERT INTO user_preferences_detailed (
    user_id,
    ui_theme,
    ui_language,
    notifications_email_enabled,
    notifications_push_enabled,
    notifications_sms_enabled,
    notifications_in_app_enabled,
    privacy_profile_visibility,
    privacy_show_email,
    privacy_show_phone,
    privacy_data_sharing,
    privacy_analytics
)
SELECT 
    id,
    theme,
    language,
    notifications_email,
    notifications_push,
    notifications_sms,
    notifications_in_app,
    profile_visibility,
    false, -- privacy_show_email por defecto
    false, -- privacy_show_phone por defecto
    data_sharing,
    analytics
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ===== COMENTARIOS =====

COMMENT ON TABLE user_preferences_detailed IS 'Preferencias detalladas de usuario para personalización avanzada';
COMMENT ON COLUMN user_preferences_detailed.ui_theme IS 'Tema de interfaz (light, dark, auto)';
COMMENT ON COLUMN user_preferences_detailed.ui_language IS 'Idioma de interfaz';
COMMENT ON COLUMN user_preferences_detailed.ui_timezone IS 'Zona horaria del usuario';
COMMENT ON COLUMN user_preferences_detailed.notifications_frequency IS 'Frecuencia de notificaciones (immediate, daily, weekly)';
COMMENT ON COLUMN user_preferences_detailed.privacy_profile_visibility IS 'Visibilidad del perfil (public, private, friends)';
COMMENT ON COLUMN user_preferences_detailed.security_session_timeout IS 'Tiempo de expiración de sesión en segundos';
COMMENT ON COLUMN user_preferences_detailed.content_maturity_level IS 'Nivel de madurez del contenido (all, teen, adult)';