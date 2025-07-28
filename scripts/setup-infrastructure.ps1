# Script de Configuración de Infraestructura para Windows
# Configura el entorno de desarrollo para la migración MCP

param(
    [switch]$SkipPrerequisites,
    [switch]$SkipDocker,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

class InfrastructureSetup {
    [string]$ProjectRoot
    [hashtable]$Config

    InfrastructureSetup() {
        $this.ProjectRoot = Get-Location
        $this.Config = @{
            databases = @{
                postgres = @{
                    host = "localhost"
                    port = 5432
                    database = "eduai_platform"
                    username = "postgres"
                    password = "postgres123"
                }
                redis = @{
                    host = "localhost"
                    port = 6379
                    password = "redis123"
                }
            }
            services = @{
                mcpOrchestrator = @{ port = 3008 }
                userService = @{ port = 3001 }
                studentService = @{ port = 3002 }
                courseService = @{ port = 3003 }
                llmGateway = @{ port = 3004 }
                contentGeneration = @{ port = 3005 }
                chatbot = @{ port = 3006 }
                predictiveAnalytics = @{ port = 3007 }
            }
            monitoring = @{
                prometheus = @{ port = 9090 }
                grafana = @{ port = 3000 }
                elasticsearch = @{ port = 9200 }
                kibana = @{ port = 5601 }
            }
        }
    }

    [void]SetupInfrastructure() {
        Write-Host "🏗️  Configurando infraestructura de desarrollo..." -ForegroundColor Green
        Write-Host ""
        
        try {
            if (-not $SkipPrerequisites) {
                $this.CheckPrerequisites()
            }
            $this.SetupDirectories()
            $this.SetupDatabaseSchemas()
            $this.SetupMonitoring()
            $this.SetupCI()
            $this.GenerateConfigFiles()
            $this.SetupScripts()
            
            Write-Host "✅ Infraestructura configurada exitosamente" -ForegroundColor Green
            $this.PrintNextSteps()
        }
        catch {
            Write-Host "❌ Error configurando infraestructura: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }

    [void]CheckPrerequisites() {
        Write-Host "🔍 Verificando prerrequisitos..." -ForegroundColor Yellow
        
        $required = @("docker", "docker-compose", "node", "npm")
        $missing = @()
        
        foreach ($tool in $required) {
            try {
                $null = & $tool --version 2>$null
                Write-Host "✅ $tool encontrado" -ForegroundColor Green
            }
            catch {
                $missing += $tool
                Write-Host "❌ $tool no encontrado" -ForegroundColor Red
            }
        }
        
        if ($missing.Count -gt 0) {
            throw "Herramientas faltantes: $($missing -join ', ')"
        }
    }

    [void]SetupDirectories() {
        Write-Host "📁 Creando estructura de directorios..." -ForegroundColor Yellow
        
        $directories = @(
            "database\init",
            "database\backups",
            "monitoring\prometheus",
            "monitoring\grafana\provisioning\datasources",
            "monitoring\grafana\provisioning\dashboards",
            "monitoring\grafana\dashboards",
            "gateway\dynamic",
            "gateway\acme",
            "gateway\logs",
            "logs",
            "docs\architecture",
            "docs\api",
            "docs\deployment"
        )
        
        foreach ($dir in $directories) {
            $fullPath = Join-Path $this.ProjectRoot $dir
            if (-not (Test-Path $fullPath)) {
                New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
                Write-Host "📁 Creado: $dir" -ForegroundColor Cyan
            }
        }
    }

    [void]SetupDatabaseSchemas() {
        Write-Host "🗄️  Configurando esquemas de base de datos..." -ForegroundColor Yellow
        
        $schemas = @("users", "students", "courses", "resources", "communications", "analytics")
        
        $initSQL = $this.GenerateDatabaseInitSQL($schemas)
        $initPath = Join-Path $this.ProjectRoot "database\init\01-init-schemas.sql"
        Set-Content -Path $initPath -Value $initSQL
        
        Write-Host "✅ Esquemas de base de datos configurados" -ForegroundColor Green
    }

    [string]GenerateDatabaseInitSQL([string[]]$schemas) {
        $sql = @"
-- Inicialización de esquemas para microservicios
-- Generado automáticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- Crear esquemas para cada microservicio
"@

        foreach ($schema in $schemas) {
            $sql += "`nCREATE SCHEMA IF NOT EXISTS $schema;"
        }

        $sql += @"

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
"@

        return $sql
    }

    [void]SetupMonitoring() {
        Write-Host "📊 Configurando monitoreo..." -ForegroundColor Yellow
        
        # Configuración de Prometheus
        $prometheusConfig = $this.GeneratePrometheusConfig()
        $prometheusPath = Join-Path $this.ProjectRoot "monitoring\prometheus.yml"
        Set-Content -Path $prometheusPath -Value $prometheusConfig
        
        # Configuración de Grafana
        $grafanaDatasource = $this.GenerateGrafanaDatasource()
        $datasourcePath = Join-Path $this.ProjectRoot "monitoring\grafana\provisioning\datasources\prometheus.yml"
        Set-Content -Path $datasourcePath -Value $grafanaDatasource
        
        Write-Host "✅ Monitoreo configurado" -ForegroundColor Green
    }

    [string]GeneratePrometheusConfig() {
        return @"
global:
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
"@
    }

    [string]GenerateGrafanaDatasource() {
        return @"
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
"@
    }

    [void]SetupCI() {
        Write-Host "🔄 Configurando CI/CD..." -ForegroundColor Yellow
        
        $workflowsDir = Join-Path $this.ProjectRoot ".github\workflows"
        if (-not (Test-Path $workflowsDir)) {
            New-Item -ItemType Directory -Path $workflowsDir -Force | Out-Null
        }
        
        # GitHub Actions workflow
        $workflow = $this.GenerateGitHubWorkflow()
        $workflowPath = Join-Path $workflowsDir "ci-cd.yml"
        Set-Content -Path $workflowPath -Value $workflow
        
        Write-Host "✅ CI/CD configurado" -ForegroundColor Green
    }

    [string]GenerateGitHubWorkflow() {
        return @"
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: `${{ github.repository }}

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
        SNYK_TOKEN: `${{ secrets.SNYK_TOKEN }}
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
        registry: `${{ env.REGISTRY }}
        username: `${{ github.actor }}
        password: `${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        docker build -t `${{ env.REGISTRY }}/`${{ env.IMAGE_NAME }}:latest .
        docker push `${{ env.REGISTRY }}/`${{ env.IMAGE_NAME }}:latest

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
"@
    }

    [void]GenerateConfigFiles() {
        Write-Host "⚙️  Generando archivos de configuración..." -ForegroundColor Yellow
        
        # Configuración de entorno
        $envConfig = $this.GenerateEnvConfig()
        $envPath = Join-Path $this.ProjectRoot "env.microservices"
        Set-Content -Path $envPath -Value $envConfig
        
        # Configuración de Kubernetes
        $k8sConfig = $this.GenerateK8sConfig()
        $k8sPath = Join-Path $this.ProjectRoot "k8s\namespace.yml"
        $k8sDir = Split-Path $k8sPath -Parent
        if (-not (Test-Path $k8sDir)) {
            New-Item -ItemType Directory -Path $k8sDir -Force | Out-Null
        }
        Set-Content -Path $k8sPath -Value $k8sConfig
        
        Write-Host "✅ Archivos de configuración generados" -ForegroundColor Green
    }

    [string]GenerateEnvConfig() {
        return @"
# Configuración de entorno para microservicios
# Generado automáticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

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
"@
    }

    [string]GenerateK8sConfig() {
        return @"
apiVersion: v1
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
"@
    }

    [void]SetupScripts() {
        Write-Host "📜 Configurando scripts de utilidad..." -ForegroundColor Yellow
        
        $scripts = @{
            'dev-start.ps1' = $this.GenerateDevStartScript()
            'dev-stop.ps1' = $this.GenerateDevStopScript()
            'dev-logs.ps1' = $this.GenerateDevLogsScript()
            'db-migrate.ps1' = $this.GenerateDbMigrateScript()
            'db-backup.ps1' = $this.GenerateDbBackupScript()
            'health-check.ps1' = $this.GenerateHealthCheckScript()
        }
        
        foreach ($script in $scripts.GetEnumerator()) {
            $scriptPath = Join-Path $this.ProjectRoot "scripts\$($script.Key)"
            Set-Content -Path $scriptPath -Value $script.Value
            Write-Host "📜 Creado: $($script.Key)" -ForegroundColor Cyan
        }
        
        Write-Host "✅ Scripts de utilidad configurados" -ForegroundColor Green
    }

    [string]GenerateDevStartScript() {
        return @"
# Script para iniciar entorno de desarrollo MCP

Write-Host "🚀 Iniciando entorno de desarrollo MCP..." -ForegroundColor Green

# Verificar que Docker esté ejecutándose
try {
    docker info | Out-Null
    Write-Host "✅ Docker está ejecutándose" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker no está ejecutándose" -ForegroundColor Red
    exit 1
}

# Construir imágenes si es necesario
Write-Host "🔨 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml build

# Iniciar servicios
Write-Host "📦 Iniciando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verificar estado de los servicios
Write-Host "🔍 Verificando estado de los servicios..." -ForegroundColor Yellow
& "$PSScriptRoot\health-check.ps1"

Write-Host "✅ Entorno de desarrollo iniciado" -ForegroundColor Green
Write-Host "📊 Dashboard: http://localhost:3000 (Grafana)" -ForegroundColor Cyan
Write-Host "🔧 API Gateway: http://localhost:8080 (Traefik)" -ForegroundColor Cyan
Write-Host "📧 Email Testing: http://localhost:8025 (Mailhog)" -ForegroundColor Cyan
"@
    }

    [string]GenerateDevStopScript() {
        return @"
# Script para detener entorno de desarrollo MCP

Write-Host "🛑 Deteniendo entorno de desarrollo MCP..." -ForegroundColor Yellow

# Detener servicios
docker-compose -f docker-compose.dev.yml down

Write-Host "✅ Entorno de desarrollo detenido" -ForegroundColor Green
"@
    }

    [string]GenerateDevLogsScript() {
        return @"
# Script para mostrar logs de servicios

param(
    [string]`$Service = ""
)

if ([string]::IsNullOrEmpty(`$Service)) {
    Write-Host "📋 Mostrando logs de todos los servicios..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml logs -f
}
else {
    Write-Host "📋 Mostrando logs del servicio: `$Service" -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml logs -f `$Service
}
"@
    }

    [string]GenerateDbMigrateScript() {
        return @"
# Script para ejecutar migraciones de base de datos

Write-Host "🗄️  Ejecutando migraciones de base de datos..." -ForegroundColor Yellow

# Ejecutar migraciones en el contenedor de postgres
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -f /docker-entrypoint-initdb.d/01-init-schemas.sql

Write-Host "✅ Migraciones completadas" -ForegroundColor Green
"@
    }

    [string]GenerateDbBackupScript() {
        return @"
# Script para crear backup de base de datos

`$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
`$BackupDir = ".\database\backups"
`$BackupFile = "backup_`$Timestamp.sql"

Write-Host "💾 Creando backup de base de datos..." -ForegroundColor Yellow

# Crear directorio de backups si no existe
if (-not (Test-Path `$BackupDir)) {
    New-Item -ItemType Directory -Path `$BackupDir -Force | Out-Null
}

# Crear backup
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres eduai_platform > "`$BackupDir\`$BackupFile"

Write-Host "✅ Backup creado: `$BackupDir\`$BackupFile" -ForegroundColor Green
"@
    }

    [string]GenerateHealthCheckScript() {
        return @"
# Script para verificar salud de los servicios

Write-Host "🔍 Verificando salud de los servicios..." -ForegroundColor Yellow

`$Services = @(
    "postgres:5432",
    "redis:6379",
    "mcp-orchestrator:3008",
    "user-service:3001",
    "student-service:3002",
    "course-service:3003",
    "llm-gateway:3004",
    "content-generation:3005",
    "chatbot:3006",
    "predictive-analytics:3007",
    "prometheus:9090",
    "grafana:3000"
)

foreach (`$service in `$Services) {
    `$host, `$port = `$service.Split(":")
    
    try {
        `$tcp = New-Object System.Net.Sockets.TcpClient
        `$tcp.ConnectAsync(`$host, `$port).Wait(1000) | Out-Null
        if (`$tcp.Connected) {
            Write-Host "✅ `$host`:`$port - OK" -ForegroundColor Green
            `$tcp.Close()
        }
        else {
            Write-Host "❌ `$host`:`$port - ERROR" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ `$host`:`$port - ERROR" -ForegroundColor Red
    }
}

Write-Host "🏁 Verificación completada" -ForegroundColor Green
"@
    }

    [void]PrintNextSteps() {
        Write-Host @"

🎉 ¡Infraestructura configurada exitosamente!

📋 Próximos pasos:

1. 🔧 Configurar variables de entorno:
   Copy-Item env.microservices .env
   # Editar .env con tus valores reales

2. 🚀 Iniciar entorno de desarrollo:
   .\scripts\dev-start.ps1

3. 🗄️  Ejecutar migraciones de base de datos:
   .\scripts\db-migrate.ps1

4. 🔍 Verificar estado de servicios:
   .\scripts\health-check.ps1

5. 📊 Acceder a dashboards:
   - Grafana: http://localhost:3000 (admin/admin123)
   - Traefik: http://localhost:8080
   - Mailhog: http://localhost:8025

6. 🧪 Ejecutar auditoría del código:
   node scripts\audit-analysis.js

📚 Documentación disponible en:
   - docs\architecture-design.md
   - docs\audit-report.md (después de ejecutar auditoría)

🆘 Comandos útiles:
   - .\scripts\dev-logs.ps1 [servicio] - Ver logs
   - .\scripts\dev-stop.ps1 - Detener servicios
   - .\scripts\db-backup.ps1 - Crear backup

" -ForegroundColor Cyan
    }
}

# Ejecutar configuración
try {
    $setup = [InfrastructureSetup]::new()
    $setup.SetupInfrastructure()
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 