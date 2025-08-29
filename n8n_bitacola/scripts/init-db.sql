-- Script d'inicialització de la base de dades per al Sistema d'Avaluació Automàtica - Adeptify.es
-- Autor: Equip de Desenvolupament Adeptify.es

-- Crear extensions necessàries
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Crear taula d'avaluacions
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    submission_date TIMESTAMP WITH TIME ZONE,
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_response TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula de feedback enviat
CREATE TABLE IF NOT EXISTS feedback_sent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula de notificacions
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Crear taula d'execucions de workflows
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear taula d'estadístiques
CREATE TABLE IF NOT EXISTS statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_evaluations INTEGER DEFAULT 0,
    total_feedback_sent INTEGER DEFAULT 0,
    average_score DECIMAL(3,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- Crear índexs per a millorar el rendiment
CREATE INDEX IF NOT EXISTS idx_evaluations_student_email ON evaluations(student_email);
CREATE INDEX IF NOT EXISTS idx_evaluations_subject ON evaluations(subject);
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_date ON evaluations(submission_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluation_date ON evaluations(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_feedback_sent_student_email ON feedback_sent(student_email);
CREATE INDEX IF NOT EXISTS idx_feedback_sent_sent_date ON feedback_sent(sent_date);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_timestamp ON workflow_executions(timestamp);

CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(date);

-- Crear índexs GIN per a cerca en JSONB
CREATE INDEX IF NOT EXISTS idx_evaluations_metadata_gin ON evaluations USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_feedback_sent_metadata_gin ON feedback_sent USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_notifications_data_gin ON notifications USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON notifications USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_data_gin ON workflow_executions USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_statistics_metadata_gin ON statistics USING GIN (metadata);

-- Crear vistes útils
CREATE OR REPLACE VIEW evaluations_summary AS
SELECT
    DATE(evaluation_date) as evaluation_day,
    COUNT(*) as total_evaluations,
    COUNT(DISTINCT student_email) as unique_students,
    COUNT(DISTINCT subject) as unique_subjects,
    AVG(EXTRACT(EPOCH FROM (evaluation_date - submission_date))/3600) as avg_processing_hours
FROM evaluations
GROUP BY DATE(evaluation_date)
ORDER BY evaluation_day DESC;

CREATE OR REPLACE VIEW student_performance AS
SELECT
    student_email,
    student_name,
    COUNT(*) as total_submissions,
    COUNT(DISTINCT subject) as subjects_count,
    MIN(submission_date) as first_submission,
    MAX(submission_date) as last_submission,
    AVG(EXTRACT(EPOCH FROM (evaluation_date - submission_date))/3600) as avg_processing_hours
FROM evaluations
GROUP BY student_email, student_name
ORDER BY total_submissions DESC;

CREATE OR REPLACE VIEW subject_statistics AS
SELECT
    subject,
    COUNT(*) as total_evaluations,
    COUNT(DISTINCT student_email) as unique_students,
    AVG(EXTRACT(EPOCH FROM (evaluation_date - submission_date))/3600) as avg_processing_hours,
    MIN(submission_date) as first_submission,
    MAX(submission_date) as last_submission
FROM evaluations
GROUP BY subject
ORDER BY total_evaluations DESC;

-- Crear funcions útils
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers per a actualitzar updated_at
CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at
    BEFORE UPDATE ON statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funció per a calcular estadístiques diàries
CREATE OR REPLACE FUNCTION calculate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO statistics (date, total_evaluations, total_feedback_sent, average_score, metadata)
    SELECT
        target_date,
        COUNT(e.id) as total_evaluations,
        COUNT(f.id) as total_feedback_sent,
        NULL as average_score, -- Calcularia la puntuació mitjana si tinguéssim aquest camp
        jsonb_build_object(
            'unique_students', COUNT(DISTINCT e.student_email),
            'unique_subjects', COUNT(DISTINCT e.subject),
            'avg_processing_hours', AVG(EXTRACT(EPOCH FROM (e.evaluation_date - e.submission_date))/3600)
        ) as metadata
    FROM evaluations e
    LEFT JOIN feedback_sent f ON e.email_id = f.email_id
    WHERE DATE(e.evaluation_date) = target_date
    GROUP BY target_date
    ON CONFLICT (date) DO UPDATE SET
        total_evaluations = EXCLUDED.total_evaluations,
        total_feedback_sent = EXCLUDED.total_feedback_sent,
        average_score = EXCLUDED.average_score,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Funció per a netejar dades antigues
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS VOID AS $$
BEGIN
    -- Netejar notificacions llegides més antigues de X dies
    DELETE FROM notifications
    WHERE read_at IS NOT NULL
    AND read_at < NOW() - INTERVAL '1 day' * days_to_keep;

    -- Netejar execucions de workflows més antigues de X dies
    DELETE FROM workflow_executions
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;

    -- Netejar estadístiques més antigues de X dies
    DELETE FROM statistics
    WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
END;
$$ LANGUAGE plpgsql;

-- Inserir dades d'exemple per a proves
INSERT INTO evaluations (email_id, student_email, student_name, subject, submission_date, ai_response, metadata) VALUES
('test-email-1', 'alumne1@adeptify.es', 'Joan Garcia', 'Matemàtiques', NOW() - INTERVAL '2 hours', 'Avaluació d''exemple per a Matemàtiques. Puntuació: 8/10', '{"workflow": "evaluation-engine", "version": "1.0"}'),
('test-email-2', 'alumne2@adeptify.es', 'Maria López', 'Història', NOW() - INTERVAL '1 hour', 'Avaluació d''exemple per a Història. Puntuació: 7/10', '{"workflow": "evaluation-engine", "version": "1.0"}')
ON CONFLICT DO NOTHING;

-- Crear usuari específic per a n8n si no existeix
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n') THEN
        CREATE ROLE n8n WITH LOGIN PASSWORD 'adeptify_postgres_2024';
    END IF;
END
$$;

-- Concedir permisos a l'usuari n8n
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO n8n;

-- Concedir permisos per a taules futures
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO n8n;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO n8n;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO n8n;

-- Comentaris per a documentació
COMMENT ON TABLE evaluations IS 'Taula principal per a emmagatzemar les avaluacions generades per IA';
COMMENT ON TABLE feedback_sent IS 'Registre dels feedbacks enviats als alumnes';
COMMENT ON TABLE notifications IS 'Sistema de notificacions per a professors i administradors';
COMMENT ON TABLE workflow_executions IS 'Registre d''execucions dels workflows d''n8n';
COMMENT ON TABLE statistics IS 'Estadístiques diàries del sistema d''avaluació';

COMMENT ON FUNCTION calculate_daily_statistics IS 'Calcula i emmagatzema les estadístiques diàries del sistema';
COMMENT ON FUNCTION cleanup_old_data IS 'Neteja dades antigues per a mantenir el rendiment de la base de dades';
