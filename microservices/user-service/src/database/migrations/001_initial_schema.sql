-- ===== MIGRACIÓN INICIAL - ESQUEMA DE BASE DE DATOS =====
-- Fecha: 2025-01-29
-- Descripción: Crear esquema inicial para User Service

-- ===== ENUMS =====

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin', 'system');

-- Crear enum para estado de usuario
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Crear enum para tema
CREATE TYPE theme AS ENUM ('light', 'dark', 'auto');

-- Crear enum para visibilidad de perfil
CREATE TYPE profile_visibility AS ENUM ('public', 'private', 'friends');

-- Crear enum para género
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- ===== TABLA USERS =====

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'pending',
    
    -- Información del perfil
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar TEXT,
    bio TEXT,
    date_of_birth TIMESTAMP,
    gender gender,
    location VARCHAR(100),
    website VARCHAR(255),
    
    -- Información de dirección
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_country VARCHAR(100),
    address_postal_code VARCHAR(20),
    
    -- Preferencias
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    theme theme NOT NULL DEFAULT 'auto',
    
    -- Preferencias de notificación
    notifications_email BOOLEAN NOT NULL DEFAULT true,
    notifications_push BOOLEAN NOT NULL DEFAULT true,
    notifications_sms BOOLEAN NOT NULL DEFAULT false,
    notifications_in_app BOOLEAN NOT NULL DEFAULT true,
    
    -- Preferencias de privacidad
    profile_visibility profile_visibility NOT NULL DEFAULT 'public',
    data_sharing BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT true,
    
    -- Autenticación y seguridad
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    lock_until TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ===== TABLA SESSIONS =====

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== TABLA AUDIT_LOGS =====

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== TABLA PERMISSIONS =====

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===== TABLA USER_PERMISSIONS =====

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- ===== TABLA USER_PREFERENCES =====

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- ===== ÍNDICES =====

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Índices para sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);

-- Índices para user_permissions
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);

-- Índices para user_preferences
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- ===== TRIGGERS =====

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== DATOS INICIALES =====

-- Insertar permisos básicos
INSERT INTO permissions (name, description) VALUES
('user:read', 'Leer información de usuarios'),
('user:write', 'Crear y actualizar usuarios'),
('user:delete', 'Eliminar usuarios'),
('user:admin', 'Acceso administrativo completo'),
('session:manage', 'Gestionar sesiones de usuario'),
('audit:read', 'Leer logs de auditoría'),
('preferences:manage', 'Gestionar preferencias de usuario');

-- Insertar usuario administrador por defecto (password: admin123)
INSERT INTO users (
    email, 
    username, 
    password_hash, 
    role, 
    status, 
    first_name, 
    last_name, 
    email_verified
) VALUES (
    'admin@adeptify.es',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', -- admin123
    'admin',
    'active',
    'Administrador',
    'Sistema',
    true
);

-- Asignar todos los permisos al administrador
INSERT INTO user_permissions (user_id, permission_id)
SELECT 
    (SELECT id FROM users WHERE email = 'admin@adeptify.es'),
    id
FROM permissions;

-- ===== COMENTARIOS =====

COMMENT ON TABLE users IS 'Tabla principal de usuarios del sistema';
COMMENT ON TABLE sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE audit_logs IS 'Logs de auditoría de acciones de usuarios';
COMMENT ON TABLE permissions IS 'Permisos disponibles en el sistema';
COMMENT ON TABLE user_permissions IS 'Permisos asignados a usuarios';
COMMENT ON TABLE user_preferences IS 'Preferencias personalizadas de usuarios';