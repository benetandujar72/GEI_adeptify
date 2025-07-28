-- Inicialización de esquemas para microservicios
-- Generado automáticamente el 2025-07-28 17:54:50

-- Crear esquemas para cada microservicio
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS students;
CREATE SCHEMA IF NOT EXISTS courses;
CREATE SCHEMA IF NOT EXISTS resources;
CREATE SCHEMA IF NOT EXISTS communications;
CREATE SCHEMA IF NOT EXISTS analytics;
-- Configurar permisos
GRANT USAGE ON SCHEMA users TO postgres;
GRANT USAGE ON SCHEMA students TO postgres;
GRANT USAGE ON SCHEMA courses TO postgres;
GRANT USAGE ON SCHEMA resources TO postgres;
GRANT USAGE ON SCHEMA communications TO postgres;
GRANT USAGE ON SCHEMA analytics TO postgres;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar timezone
SET timezone = 'UTC';
