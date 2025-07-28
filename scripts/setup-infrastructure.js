#!/usr/bin/env node

/**
 * Script de Configuración de Infraestructura
 * Configura el entorno de desarrollo para la migración MCP
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class InfrastructureSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.config = {
      databases: {
        postgres: {
          host: 'localhost',
          port: 5432,
          database: 'eduai_platform',
          username: 'postgres',
          password: 'postgres123'
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: 'redis123'
        }
      },
      services: {
        mcpOrchestrator: { port: 3008 },
        userService: { port: 3001 },
        studentService: { port: 3002 },
        courseService: { port: 3003 },
        llmGateway: { port: 3004 },
        contentGeneration: { port: 3005 },
        chatbot: { port: 3006 },
        predictiveAnalytics: { port: 3007 }
      },
      monitoring: {
        prometheus: { port: 9090 },
        grafana: { port: 3000 },
        elasticsearch: { port: 9200 },
        kibana: { port: 5601 }
      }
    };
  }

  async setupInfrastructure() {
    console.log('🏗️  Configurando infraestructura de desarrollo...\n');
    
    try {
      await this.checkPrerequisites();
      await this.setupDirectories();
      await this.setupDatabaseSchemas();
      await this.setupMonitoring();
      await this.setupCI();
      await this.generateConfigFiles();
      await this.setupScripts();
      
      console.log('✅ Infraestructura configurada exitosamente');
      this.printNextSteps();
    } catch (error) {
      console.error('❌ Error configurando infraestructura:', error);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Verificando prerrequisitos...');
    
    const required = ['docker', 'docker-compose', 'node', 'npm'];
    const missing = [];
    
    for (const tool of required) {
      try {
        execSync(`${tool} --version`, { stdio: 'ignore' });
        console.log(`✅ ${tool} encontrado`);
      } catch (error) {
        missing.push(tool);
        console.log(`❌ ${tool} no encontrado`);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Herramientas faltantes: ${missing.join(', ')}`);
    }
  }

  async setupDirectories() {
    console.log('📁 Creando estructura de directorios...');
    
    const directories = [
      'database/init',
      'database/backups',
      'monitoring/prometheus',
      'monitoring/grafana/provisioning/datasources',
      'monitoring/grafana/provisioning/dashboards',
      'monitoring/grafana/dashboards',
      'gateway/dynamic',
      'gateway/acme',
      'gateway/logs',
      'logs',
      'docs/architecture',
      'docs/api',
      'docs/deployment'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Creado: ${dir}`);
      }
    }
  }

  async setupDatabaseSchemas() {
    console.log('🗄️  Configurando esquemas de base de datos...');
    
    const schemas = [
      'users',
      'students', 
      'courses',
      'resources',
      'communications',
      'analytics'
    ];
    
    const initSQL = this.generateDatabaseInitSQL(schemas);
    const initPath = path.join(this.projectRoot, 'database', 'init', '01-init-schemas.sql');
    fs.writeFileSync(initPath, initSQL);
    
    console.log('✅ Esquemas de base de datos configurados');
  }

  generateDatabaseInitSQL(schemas) {
    let sql = `-- Inicialización de esquemas para microservicios
-- Generado automáticamente el ${new Date().toISOString()}

-- Crear esquemas para cada microservicio
`;

    schemas.forEach(schema => {
      sql += `CREATE SCHEMA IF NOT EXISTS ${schema};\n`;
    });

    sql += `
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
`;

    return sql;
  }

  async setupMonitoring() {
    console.log('📊 Configurando monitoreo...');
    
    // Configuración de Prometheus
    const prometheusConfig = this.generatePrometheusConfig();
    const prometheusPath = path.join(this.projectRoot, 'monitoring', 'prometheus.yml');
    fs.writeFileSync(prometheusPath, prometheusConfig);
    
    // Configuración de Grafana
    const grafanaDatasource = this.generateGrafanaDatasource();
    const datasourcePath = path.join(this.projectRoot, 'monitoring', 'grafana', 'provisioning', 'datasources', 'prometheus.yml');
    fs.writeFileSync(datasourcePath, grafanaDatasource);
    
    console.log('✅ Monitoreo configurado');
  }

  generatePrometheusConfig() {
    return `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'mcp-orchestrator'
    static_configs:
      - targets: ['mcp-orchestrator:3008']
    metrics_path: '/metrics'

  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3001']
    metrics_path: '/metrics'

  - job_name: 'student-service'
    static_configs:
      - targets: ['student-service:3002']
    metrics_path: '/metrics'

  - job_name: 'course-service'
    static_configs:
      - targets: ['course-service:3003']
    metrics_path: '/metrics'

  - job_name: 'llm-gateway'
    static_configs:
      - targets: ['llm-gateway:3004']
    metrics_path: '/metrics'

  - job_name: 'content-generation'
    static_configs:
      - targets: ['content-generation:3005']
    metrics_path: '/metrics'

  - job_name: 'chatbot'
    static_configs:
      - targets: ['chatbot:3006']
    metrics_path: '/metrics'

  - job_name: 'predictive-analytics'
    static_configs:
      - targets: ['predictive-analytics:3007']
    metrics_path: '/metrics'
`;
  }

  generateGrafanaDatasource() {
    return `apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
`;
  }

  async setupCI() {
    console.log('🔄 Configurando CI/CD...');
    
    const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }
    
    // GitHub Actions workflow
    const workflow = this.generateGitHubWorkflow();
    const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
    fs.writeFileSync(workflowPath, workflow);
    
    console.log('✅ CI/CD configurado');
  }

  generateGitHubWorkflow() {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
    
    - name: Run linting
      run: npm run lint
    
    - name: Build application
      run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: \${{ env.REGISTRY }}
        username: \${{ github.actor }}
        password: \${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        docker build -t \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:latest .
        docker push \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:latest

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
    - name: Deploy to staging
      run: echo "Deploy to staging environment"
      # Aquí irían los comandos de despliegue reales

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Deploy to production
      run: echo "Deploy to production environment"
      # Aquí irían los comandos de despliegue reales
`;
  }

  async generateConfigFiles() {
    console.log('⚙️  Generando archivos de configuración...');
    
    // Configuración de entorno
    const envConfig = this.generateEnvConfig();
    const envPath = path.join(this.projectRoot, 'env.microservices');
    fs.writeFileSync(envPath, envConfig);
    
    // Configuración de Kubernetes
    const k8sConfig = this.generateK8sConfig();
    const k8sPath = path.join(this.projectRoot, 'k8s', 'namespace.yml');
    const k8sDir = path.dirname(k8sPath);
    if (!fs.existsSync(k8sDir)) {
      fs.mkdirSync(k8sDir, { recursive: true });
    }
    fs.writeFileSync(k8sPath, k8sConfig);
    
    console.log('✅ Archivos de configuración generados');
  }

  generateEnvConfig() {
    return `# Configuración de entorno para microservicios
# Generado automáticamente el ${new Date().toISOString()}

# Base de datos
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
REDIS_URL=redis://:redis123@redis:6379

# JWT Secrets (cambiar en producción)
JWT_SECRET=mcp-jwt-secret-key-dev
JWT_REFRESH_SECRET=mcp-jwt-refresh-secret-key-dev

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=debug

# MCP Orchestrator
MCP_ORCHESTRATOR_URL=http://mcp-orchestrator:3008

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
OPENAI_API_KEY=your_openai_api_key

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# Email (para desarrollo)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
`;
  }

  generateK8sConfig() {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: eduai-platform
  labels:
    name: eduai-platform
    environment: development

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: eduai-config
  namespace: eduai-platform
data:
  DATABASE_URL: "postgresql://postgres:postgres123@postgres:5432/eduai_platform"
  REDIS_URL: "redis://:redis123@redis:6379"
  LOG_LEVEL: "debug"
  CORS_ORIGIN: "http://localhost:3000,http://localhost:5173"

---
apiVersion: v1
kind: Secret
metadata:
  name: eduai-secrets
  namespace: eduai-platform
type: Opaque
data:
  JWT_SECRET: bWNwLWp3dC1zZWNyZXQta2V5LWRldg==
  JWT_REFRESH_SECRET: bWNwLWp3dC1yZWZyZXNoLXNlY3JldC1rZXktZGV2
  ANTHROPIC_API_KEY: eW91cl9hbnRocm9waWNfYXBpX2tleQ==
  GOOGLE_AI_API_KEY: eW91cl9nb29nbGVfYWlfYXBpX2tleQ==
  OPENAI_API_KEY: eW91cl9vcGVuYWlfYXBpX2tleQ==
`;
  }

  async setupScripts() {
    console.log('📜 Configurando scripts de utilidad...');
    
    const scripts = {
      'dev-start': this.generateDevStartScript(),
      'dev-stop': this.generateDevStopScript(),
      'dev-logs': this.generateDevLogsScript(),
      'db-migrate': this.generateDbMigrateScript(),
      'db-backup': this.generateDbBackupScript(),
      'health-check': this.generateHealthCheckScript()
    };
    
    for (const [name, content] of Object.entries(scripts)) {
      const scriptPath = path.join(this.projectRoot, 'scripts', `${name}.sh`);
      fs.writeFileSync(scriptPath, content);
      
      // Hacer ejecutable en sistemas Unix
      try {
        fs.chmodSync(scriptPath, '755');
      } catch (error) {
        // Ignorar en Windows
      }
    }
    
    console.log('✅ Scripts de utilidad configurados');
  }

  generateDevStartScript() {
    return `#!/bin/bash

echo "🚀 Iniciando entorno de desarrollo MCP..."

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose"
    exit 1
fi

# Construir imágenes si es necesario
echo "🔨 Construyendo imágenes Docker..."
docker-compose -f docker-compose.dev.yml build

# Iniciar servicios
echo "📦 Iniciando servicios..."
docker-compose -f docker-compose.dev.yml up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los servicios
echo "🔍 Verificando estado de los servicios..."
./scripts/health-check.sh

echo "✅ Entorno de desarrollo iniciado"
echo "📊 Dashboard: http://localhost:3000 (Grafana)"
echo "🔧 API Gateway: http://localhost:8080 (Traefik)"
echo "📧 Email Testing: http://localhost:8025 (Mailhog)"
`;
  }

  generateDevStopScript() {
    return `#!/bin/bash

echo "🛑 Deteniendo entorno de desarrollo MCP..."

# Detener servicios
docker-compose -f docker-compose.dev.yml down

echo "✅ Entorno de desarrollo detenido"
`;
  }

  generateDevLogsScript() {
    return `#!/bin/bash

SERVICE=\${1:-""}

if [ -z "\$SERVICE" ]; then
    echo "📋 Mostrando logs de todos los servicios..."
    docker-compose -f docker-compose.dev.yml logs -f
else
    echo "📋 Mostrando logs del servicio: \$SERVICE"
    docker-compose -f docker-compose.dev.yml logs -f \$SERVICE
fi
`;
  }

  generateDbMigrateScript() {
    return `#!/bin/bash

echo "🗄️  Ejecutando migraciones de base de datos..."

# Ejecutar migraciones en el contenedor de postgres
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -f /docker-entrypoint-initdb.d/01-init-schemas.sql

echo "✅ Migraciones completadas"
`;
  }

  generateDbBackupScript() {
    return `#!/bin/bash

TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./database/backups"
BACKUP_FILE="backup_\$TIMESTAMP.sql"

echo "💾 Creando backup de base de datos..."

# Crear directorio de backups si no existe
mkdir -p \$BACKUP_DIR

# Crear backup
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres eduai_platform > \$BACKUP_DIR/\$BACKUP_FILE

echo "✅ Backup creado: \$BACKUP_DIR/\$BACKUP_FILE"
`;
  }

  generateHealthCheckScript() {
    return `#!/bin/bash

echo "🔍 Verificando salud de los servicios..."

SERVICES=(
    "postgres:5432"
    "redis:6379"
    "mcp-orchestrator:3008"
    "user-service:3001"
    "student-service:3002"
    "course-service:3003"
    "llm-gateway:3004"
    "content-generation:3005"
    "chatbot:3006"
    "predictive-analytics:3007"
    "prometheus:9090"
    "grafana:3000"
)

for service in "\${SERVICES[@]}"; do
    IFS=':' read -r host port <<< "\$service"
    
    if nc -z localhost \$port 2>/dev/null; then
        echo "✅ \$host:\$port - OK"
    else
        echo "❌ \$host:\$port - ERROR"
    fi
done

echo "🏁 Verificación completada"
`;
  }

  printNextSteps() {
    console.log(`
🎉 ¡Infraestructura configurada exitosamente!

📋 Próximos pasos:

1. 🔧 Configurar variables de entorno:
   cp env.microservices .env
   # Editar .env con tus valores reales

2. 🚀 Iniciar entorno de desarrollo:
   ./scripts/dev-start.sh

3. 🗄️  Ejecutar migraciones de base de datos:
   ./scripts/db-migrate.sh

4. 🔍 Verificar estado de servicios:
   ./scripts/health-check.sh

5. 📊 Acceder a dashboards:
   - Grafana: http://localhost:3000 (admin/admin123)
   - Traefik: http://localhost:8080
   - Mailhog: http://localhost:8025

6. 🧪 Ejecutar auditoría del código:
   node scripts/audit-analysis.js

📚 Documentación disponible en:
   - docs/architecture-design.md
   - docs/audit-report.md (después de ejecutar auditoría)

🆘 Comandos útiles:
   - ./scripts/dev-logs.sh [servicio] - Ver logs
   - ./scripts/dev-stop.sh - Detener servicios
   - ./scripts/db-backup.sh - Crear backup
`);
  }
}

// Ejecutar configuración
if (require.main === module) {
  const setup = new InfrastructureSetup();
  setup.setupInfrastructure();
}

module.exports = InfrastructureSetup; 