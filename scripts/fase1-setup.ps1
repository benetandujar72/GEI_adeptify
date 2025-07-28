# Script para completar la Fase 1: Preparación y Estrategia
# Migración MCP - EduAI Platform

Write-Host "🚀 Iniciando Fase 1: Preparación y Estrategia" -ForegroundColor Green
Write-Host ""

# 1. Crear directorios necesarios
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
    "docs\deployment",
    ".github\workflows"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path (Get-Location) $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✅ Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Ya existe: $dir" -ForegroundColor Cyan
    }
}

# 2. Crear archivo de inicialización de base de datos
Write-Host "`n🗄️  Configurando esquemas de base de datos..." -ForegroundColor Yellow

$schemas = @("users", "students", "courses", "resources", "communications", "analytics")
$initSQL = @"
-- Inicialización de esquemas para microservicios
-- Generado automáticamente el $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- Crear esquemas para cada microservicio
"@

foreach ($schema in $schemas) {
    $initSQL += "`nCREATE SCHEMA IF NOT EXISTS $schema;"
}

$initSQL += @"

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

$initPath = Join-Path (Get-Location) "database\init\01-init-schemas.sql"
Set-Content -Path $initPath -Value $initSQL
Write-Host "✅ Esquemas de base de datos configurados" -ForegroundColor Green

# 3. Crear configuración de Prometheus
Write-Host "`n📊 Configurando monitoreo..." -ForegroundColor Yellow

$prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

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

$prometheusPath = Join-Path (Get-Location) "monitoring\prometheus.yml"
Set-Content -Path $prometheusPath -Value $prometheusConfig

# 4. Crear configuración de Grafana
$grafanaDatasource = @"
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
"@

$datasourcePath = Join-Path (Get-Location) "monitoring\grafana\provisioning\datasources\prometheus.yml"
Set-Content -Path $datasourcePath -Value $grafanaDatasource

Write-Host "✅ Monitoreo configurado" -ForegroundColor Green

# 5. Crear archivo de configuración de entorno
Write-Host "`n⚙️  Generando archivos de configuración..." -ForegroundColor Yellow

$envConfig = @"
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

$envPath = Join-Path (Get-Location) "env.microservices"
Set-Content -Path $envPath -Value $envConfig

# 6. Crear GitHub Actions workflow
$workflow = @"
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

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
"@

$workflowPath = Join-Path (Get-Location) ".github\workflows\ci-cd.yml"
Set-Content -Path $workflowPath -Value $workflow

Write-Host "✅ Archivos de configuración generados" -ForegroundColor Green

# 7. Crear scripts de utilidad
Write-Host "`n📜 Configurando scripts de utilidad..." -ForegroundColor Yellow

# Script de inicio
$devStartScript = @"
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

Write-Host "✅ Entorno de desarrollo iniciado" -ForegroundColor Green
Write-Host "📊 Dashboard: http://localhost:3000 (Grafana)" -ForegroundColor Cyan
Write-Host "🔧 API Gateway: http://localhost:8080 (Traefik)" -ForegroundColor Cyan
Write-Host "📧 Email Testing: http://localhost:8025 (Mailhog)" -ForegroundColor Cyan
"@

$devStartPath = Join-Path (Get-Location) "scripts\dev-start.ps1"
Set-Content -Path $devStartPath -Value $devStartScript

# Script de parada
$devStopScript = @"
# Script para detener entorno de desarrollo MCP

Write-Host "🛑 Deteniendo entorno de desarrollo MCP..." -ForegroundColor Yellow

# Detener servicios
docker-compose -f docker-compose.dev.yml down

Write-Host "✅ Entorno de desarrollo detenido" -ForegroundColor Green
"@

$devStopPath = Join-Path (Get-Location) "scripts\dev-stop.ps1"
Set-Content -Path $devStopPath -Value $devStopScript

# Script de health check
$healthCheckScript = @"
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

$healthCheckPath = Join-Path (Get-Location) "scripts\health-check.ps1"
Set-Content -Path $healthCheckPath -Value $healthCheckScript

Write-Host "✅ Scripts de utilidad configurados" -ForegroundColor Green

# 8. Ejecutar auditoría del código
Write-Host "`n🔍 Ejecutando auditoría del código..." -ForegroundColor Yellow

try {
    node scripts/audit-analysis.js
    Write-Host "✅ Auditoría completada" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Error ejecutando auditoría: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "ℹ️  Puedes ejecutar la auditoría manualmente con: node scripts/audit-analysis.js" -ForegroundColor Cyan
}

# Resumen final
Write-Host "`n🎉 ¡Fase 1 completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔧 Configurar variables de entorno:" -ForegroundColor White
Write-Host "   Copy-Item env.microservices .env" -ForegroundColor Gray
Write-Host "   # Editar .env con tus valores reales" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🚀 Iniciar entorno de desarrollo:" -ForegroundColor White
Write-Host "   .\scripts\dev-start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🔍 Verificar estado de servicios:" -ForegroundColor White
Write-Host "   .\scripts\health-check.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 📊 Acceder a dashboards:" -ForegroundColor White
Write-Host "   - Grafana: http://localhost:3000 (admin/admin123)" -ForegroundColor Gray
Write-Host "   - Traefik: http://localhost:8080" -ForegroundColor Gray
Write-Host "   - Mailhog: http://localhost:8025" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentación disponible en:" -ForegroundColor White
Write-Host "   - docs\architecture-design.md" -ForegroundColor Gray
Write-Host "   - docs\audit-report.md (después de ejecutar auditoría)" -ForegroundColor Gray
Write-Host ""
Write-Host "🆘 Comandos útiles:" -ForegroundColor White
Write-Host "   - .\scripts\dev-stop.ps1 - Detener servicios" -ForegroundColor Gray
Write-Host "   - .\scripts\health-check.ps1 - Verificar servicios" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Fase 1: Preparación y Estrategia - COMPLETADA" -ForegroundColor Green 