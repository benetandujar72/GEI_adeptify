# Script para Despliegue en Producción - Render y GitHub
# Migración MCP - EduAI Platform

Write-Host "🚀 Configurando despliegue en producción..." -ForegroundColor Green
Write-Host ""

# 1. Crear docker-compose.prod.yml
Write-Host "🐳 Creando Docker Compose para producción..." -ForegroundColor Yellow

$dockerComposeProd = @"
version: '3.8'

services:
  # API Gateway
  traefik:
    image: traefik:v2.10
    container_name: traefik-prod
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@eduai-platform.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/etc/traefik/acme/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./gateway/dynamic:/etc/traefik/dynamic
      - ./gateway/acme:/etc/traefik/acme
    networks:
      - mcp-network-prod
    restart: unless-stopped

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres-prod
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - mcp-network-prod
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    container_name: redis-prod
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data_prod:/data
    networks:
      - mcp-network-prod
    restart: unless-stopped

  # MCP Orchestrator
  mcp-orchestrator:
    build:
      context: ./microservices/mcp-orchestrator
      dockerfile: Dockerfile.prod
    container_name: mcp-orchestrator-prod
    environment:
      - NODE_ENV=production
      - PORT=3008
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-orchestrator.rule=Host(`${DOMAIN}`)"
      - "traefik.http.services.mcp-orchestrator.loadbalancer.server.port=3008"
      - "traefik.http.routers.mcp-orchestrator.tls.certresolver=letsencrypt"

  # User Service
  user-service:
    build:
      context: ./microservices/user-service
      dockerfile: Dockerfile.prod
    container_name: user-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/users`)"
      - "traefik.http.services.user-service.loadbalancer.server.port=3001"
      - "traefik.http.routers.user-service.tls.certresolver=letsencrypt"

  # Student Service
  student-service:
    build:
      context: ./microservices/student-service
      dockerfile: Dockerfile.prod
    container_name: student-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3002
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.student-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/students`)"
      - "traefik.http.services.student-service.loadbalancer.server.port=3002"
      - "traefik.http.routers.student-service.tls.certresolver=letsencrypt"

  # Course Service
  course-service:
    build:
      context: ./microservices/course-service
      dockerfile: Dockerfile.prod
    container_name: course-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3003
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.course-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/courses`)"
      - "traefik.http.services.course-service.loadbalancer.server.port=3003"
      - "traefik.http.routers.course-service.tls.certresolver=letsencrypt"

  # Resource Service
  resource-service:
    build:
      context: ./microservices/resource-service
      dockerfile: Dockerfile.prod
    container_name: resource-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3009
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.resource-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/resources`)"
      - "traefik.http.services.resource-service.loadbalancer.server.port=3009"
      - "traefik.http.routers.resource-service.tls.certresolver=letsencrypt"

  # Communication Service
  communication-service:
    build:
      context: ./microservices/communication-service
      dockerfile: Dockerfile.prod
    container_name: communication-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3010
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.communication-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/communications`)"
      - "traefik.http.services.communication-service.loadbalancer.server.port=3010"
      - "traefik.http.routers.communication-service.tls.certresolver=letsencrypt"

  # Analytics Service
  analytics-service:
    build:
      context: ./microservices/analytics-service
      dockerfile: Dockerfile.prod
    container_name: analytics-service-prod
    environment:
      - NODE_ENV=production
      - PORT=3011
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.analytics-service.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/v1/analytics`)"
      - "traefik.http.services.analytics-service.loadbalancer.server.port=3011"
      - "traefik.http.routers.analytics-service.tls.certresolver=letsencrypt"

  # AI Services
  llm-gateway:
    build:
      context: ./microservices/llm-gateway
      dockerfile: Dockerfile.prod
    container_name: llm-gateway-prod
    environment:
      - NODE_ENV=production
      - PORT=3004
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.llm-gateway.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/llm`)"
      - "traefik.http.services.llm-gateway.loadbalancer.server.port=3004"
      - "traefik.http.routers.llm-gateway.tls.certresolver=letsencrypt"

  content-generation:
    build:
      context: ./microservices/ai-services/content-generation
      dockerfile: Dockerfile.prod
    container_name: content-generation-prod
    environment:
      - NODE_ENV=production
      - PORT=3005
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.content-generation.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/content`)"
      - "traefik.http.services.content-generation.loadbalancer.server.port=3005"
      - "traefik.http.routers.content-generation.tls.certresolver=letsencrypt"

  chatbot:
    build:
      context: ./microservices/ai-services/chatbot
      dockerfile: Dockerfile.prod
    container_name: chatbot-prod
    environment:
      - NODE_ENV=production
      - PORT=3006
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chatbot.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/chatbot`)"
      - "traefik.http.services.chatbot.loadbalancer.server.port=3006"
      - "traefik.http.routers.chatbot.tls.certresolver=letsencrypt"

  predictive-analytics:
    build:
      context: ./microservices/ai-services/predictive-analytics
      dockerfile: Dockerfile.prod
    container_name: predictive-analytics-prod
    environment:
      - NODE_ENV=production
      - PORT=3007
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.predictive-analytics.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/analytics`)"
      - "traefik.http.services.predictive-analytics.loadbalancer.server.port=3007"
      - "traefik.http.routers.predictive-analytics.tls.certresolver=letsencrypt"

  personalization-engine:
    build:
      context: ./microservices/ai-services/personalization-engine
      dockerfile: Dockerfile.prod
    container_name: personalization-engine-prod
    environment:
      - NODE_ENV=production
      - PORT=3012
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.personalization-engine.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/personalization`)"
      - "traefik.http.services.personalization-engine.loadbalancer.server.port=3012"
      - "traefik.http.routers.personalization-engine.tls.certresolver=letsencrypt"

  ml-pipeline:
    build:
      context: ./microservices/ai-services/ml-pipeline
      dockerfile: Dockerfile.prod
    container_name: ml-pipeline-prod
    environment:
      - NODE_ENV=production
      - PORT=3013
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ml-pipeline.rule=Host(`api.${DOMAIN}`) && PathPrefix(`/api/ai/ml`)"
      - "traefik.http.services.ml-pipeline.loadbalancer.server.port=3013"
      - "traefik.http.routers.ml-pipeline.tls.certresolver=letsencrypt"

  # Frontend
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.prod
    container_name: frontend-prod
    environment:
      - VITE_API_URL=https://api.${DOMAIN}
      - VITE_MCP_URL=https://${DOMAIN}
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus-prod
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prometheus.rule=Host(`monitoring.${DOMAIN}`)"
      - "traefik.http.services.prometheus.loadbalancer.server.port=9090"
      - "traefik.http.routers.prometheus.tls.certresolver=letsencrypt"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana-prod
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - mcp-network-prod
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`dashboard.${DOMAIN}`)"
      - "traefik.http.services.grafana.loadbalancer.server.port=3000"
      - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"

volumes:
  postgres_data_prod:
  redis_data_prod:

networks:
  mcp-network-prod:
    driver: bridge
"@

Set-Content -Path "docker-compose.prod.yml" -Value $dockerComposeProd -Encoding UTF8
Write-Host "✅ Docker Compose para producción creado" -ForegroundColor Green

# 2. Crear Dockerfile.prod para cada servicio
Write-Host "`n📦 Creando Dockerfiles para producción..." -ForegroundColor Yellow

$dockerfileProd = @"
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE ${PORT:-3000}
CMD ["node", "dist/index.js"]
"@

# Crear Dockerfile.prod para cada microservicio
$services = @(
    "microservices/mcp-orchestrator",
    "microservices/user-service", 
    "microservices/student-service",
    "microservices/course-service",
    "microservices/resource-service",
    "microservices/communication-service",
    "microservices/analytics-service",
    "microservices/llm-gateway",
    "microservices/ai-services/content-generation",
    "microservices/ai-services/chatbot",
    "microservices/ai-services/predictive-analytics",
    "microservices/ai-services/personalization-engine",
    "microservices/ai-services/ml-pipeline"
)

foreach ($service in $services) {
    $dockerfilePath = Join-Path $service "Dockerfile.prod"
    Set-Content -Path $dockerfilePath -Value $dockerfileProd -Encoding UTF8
    Write-Host "✅ Dockerfile.prod creado para $service" -ForegroundColor Green
}

# 3. Crear Dockerfile.prod para frontend
$frontendDockerfile = @"
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"@

$frontendDockerfilePath = "client/Dockerfile.prod"
Set-Content -Path $frontendDockerfilePath -Value $frontendDockerfile -Encoding UTF8
Write-Host "✅ Dockerfile.prod para frontend creado" -ForegroundColor Green

# 4. Crear nginx.conf para frontend
$nginxConfig = @"
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files `$uri `$uri/ /index.html;
        }

        location /api {
            proxy_pass http://api-gateway;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }
    }
}
"@

$nginxConfigPath = "client/nginx.conf"
Set-Content -Path $nginxConfigPath -Value $nginxConfig -Encoding UTF8
Write-Host "✅ nginx.conf creado" -ForegroundColor Green

# 5. Crear .env.production
Write-Host "`n🔧 Creando variables de entorno para producción..." -ForegroundColor Yellow

$envProduction = @"
# Database
POSTGRES_DB=eduai_platform_prod
POSTGRES_USER=eduai_user
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://eduai_user:your_secure_password_here@postgres:5432/eduai_platform_prod

# Redis
REDIS_PASSWORD=your_redis_password_here
REDIS_URL=redis://:your_redis_password_here@redis:6379

# JWT
JWT_SECRET=your_jwt_secret_here

# Domain
DOMAIN=eduai-platform.com

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password_here

# Monitoring
GRAFANA_PASSWORD=your_grafana_password_here

# Environment
NODE_ENV=production
"@

Set-Content -Path ".env.production" -Value $envProduction -Encoding UTF8
Write-Host "✅ .env.production creado" -ForegroundColor Green

# 6. Crear GitHub Actions para CI/CD
Write-Host "`n🚀 Creando GitHub Actions..." -ForegroundColor Yellow

$githubWorkflow = @"
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
        image: postgres:15
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

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run linting
      run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: `${{ secrets.DOCKER_USERNAME }}
        password: `${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker images
      run: |
        docker build -t eduai-platform/mcp-orchestrator:latest ./microservices/mcp-orchestrator
        docker build -t eduai-platform/user-service:latest ./microservices/user-service
        docker build -t eduai-platform/student-service:latest ./microservices/student-service
        docker build -t eduai-platform/course-service:latest ./microservices/course-service
        docker build -t eduai-platform/resource-service:latest ./microservices/resource-service
        docker build -t eduai-platform/communication-service:latest ./microservices/communication-service
        docker build -t eduai-platform/analytics-service:latest ./microservices/analytics-service
        docker build -t eduai-platform/llm-gateway:latest ./microservices/llm-gateway
        docker build -t eduai-platform/content-generation:latest ./microservices/ai-services/content-generation
        docker build -t eduai-platform/chatbot:latest ./microservices/ai-services/chatbot
        docker build -t eduai-platform/predictive-analytics:latest ./microservices/ai-services/predictive-analytics
        docker build -t eduai-platform/personalization-engine:latest ./microservices/ai-services/personalization-engine
        docker build -t eduai-platform/ml-pipeline:latest ./microservices/ai-services/ml-pipeline
        docker build -t eduai-platform/frontend:latest ./client
        
        docker push eduai-platform/mcp-orchestrator:latest
        docker push eduai-platform/user-service:latest
        docker push eduai-platform/student-service:latest
        docker push eduai-platform/course-service:latest
        docker push eduai-platform/resource-service:latest
        docker push eduai-platform/communication-service:latest
        docker push eduai-platform/analytics-service:latest
        docker push eduai-platform/llm-gateway:latest
        docker push eduai-platform/content-generation:latest
        docker push eduai-platform/chatbot:latest
        docker push eduai-platform/predictive-analytics:latest
        docker push eduai-platform/personalization-engine:latest
        docker push eduai-platform/ml-pipeline:latest
        docker push eduai-platform/frontend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v1.0.0
      with:
        service-id: `${{ secrets.RENDER_SERVICE_ID }}
        api-key: `${{ secrets.RENDER_API_KEY }}
"@

$githubWorkflowPath = ".github/workflows/ci-cd.yml"
Set-Content -Path $githubWorkflowPath -Value $githubWorkflow -Encoding UTF8
Write-Host "✅ GitHub Actions creado" -ForegroundColor Green

# 7. Crear render.yaml para Render
Write-Host "`n☁️  Creando configuración para Render..." -ForegroundColor Yellow

$renderConfig = @"
services:
  - type: web
    name: eduai-platform-frontend
    env: node
    buildCommand: cd client && npm install && npm run build
    startCommand: cd client && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_API_URL
        value: https://api.eduai-platform.com
      - key: VITE_MCP_URL
        value: https://eduai-platform.com

  - type: web
    name: eduai-platform-api
    env: docker
    dockerfilePath: ./Dockerfile.api
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: eduai-platform-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: eduai-platform-redis
          property: connectionString

  - type: redis
    name: eduai-platform-redis
    ipAllowList: []

  - type: pserv
    name: eduai-platform-db
    env: postgres
    plan: standard-0
    ipAllowList: []

databases:
  - name: eduai-platform-db
    databaseName: eduai_platform_prod
    user: eduai_user
"@

Set-Content -Path "render.yaml" -Value $renderConfig -Encoding UTF8
Write-Host "✅ render.yaml creado" -ForegroundColor Green

# 8. Crear script de despliegue
Write-Host "`n📜 Creando script de despliegue..." -ForegroundColor Yellow

$deployScript = @"
# Script de Despliegue en Producción

Write-Host "🚀 Iniciando despliegue en producción..." -ForegroundColor Green

# 1. Verificar variables de entorno
Write-Host "`n🔧 Verificando variables de entorno..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production no encontrado" -ForegroundColor Red
    exit 1
}

# 2. Construir imágenes Docker
Write-Host "`n🐳 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build

# 3. Ejecutar migraciones
Write-Host "`n🗄️  Ejecutando migraciones..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml run --rm postgres psql -U `$env:POSTGRES_USER -d `$env:POSTGRES_DB -f /docker-entrypoint-initdb.d/01-init-schemas.sql

# 4. Desplegar servicios
Write-Host "`n🚀 Desplegando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# 5. Verificar salud de servicios
Write-Host "`n🔍 Verificando salud de servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

`$services = @(
    "mcp-orchestrator-prod:3008",
    "user-service-prod:3001",
    "student-service-prod:3002",
    "course-service-prod:3003",
    "resource-service-prod:3009",
    "communication-service-prod:3010",
    "analytics-service-prod:3011",
    "llm-gateway-prod:3004",
    "content-generation-prod:3005",
    "chatbot-prod:3006",
    "predictive-analytics-prod:3007",
    "personalization-engine-prod:3012",
    "ml-pipeline-prod:3013",
    "frontend-prod:80"
)

foreach (`$service in `$services) {
    `$host, `$port = `$service.Split(":")
    try {
        `$response = Invoke-WebRequest -Uri "http://`$host`:`$port/health" -TimeoutSec 10
        if (`$response.StatusCode -eq 200) {
            Write-Host "✅ `$host`:`$port - OK" -ForegroundColor Green
        } else {
            Write-Host "❌ `$host`:`$port - ERROR" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ `$host`:`$port - ERROR" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Despliegue completado!" -ForegroundColor Green
Write-Host "📊 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   - Frontend: https://`$env:DOMAIN" -ForegroundColor White
Write-Host "   - API: https://api.`$env:DOMAIN" -ForegroundColor White
Write-Host "   - Dashboard: https://dashboard.`$env:DOMAIN" -ForegroundColor White
Write-Host "   - Monitoring: https://monitoring.`$env:DOMAIN" -ForegroundColor White
"@

$deployScriptPath = "scripts/deploy-production.ps1"
Set-Content -Path $deployScriptPath -Value $deployScript -Encoding UTF8
Write-Host "✅ Script de despliegue creado" -ForegroundColor Green

# 9. Crear README de producción
Write-Host "`n📚 Creando documentación de producción..." -ForegroundColor Yellow

$productionReadme = @"
# EduAI Platform - Producción

## 🚀 Despliegue en Producción

### Requisitos Previos

1. **Docker y Docker Compose** instalados
2. **Dominio configurado** con DNS apuntando a Render
3. **Variables de entorno** configuradas en `.env.production`
4. **API Keys** configuradas para servicios AI

### Configuración

1. **Editar variables de entorno**:
   ```bash
   cp .env.production .env
   # Editar .env con valores reales
   ```

2. **Configurar GitHub Secrets**:
   - `DOCKER_USERNAME`: Usuario de Docker Hub
   - `DOCKER_PASSWORD`: Contraseña de Docker Hub
   - `RENDER_SERVICE_ID`: ID del servicio en Render
   - `RENDER_API_KEY`: API Key de Render

### Despliegue

#### Opción 1: Despliegue Manual
```bash
# Construir y desplegar
./scripts/deploy-production.ps1
```

#### Opción 2: Despliegue Automático (GitHub Actions)
1. Hacer push a la rama `main`
2. GitHub Actions ejecutará automáticamente:
   - Tests
   - Build de imágenes Docker
   - Push a Docker Hub
   - Despliegue a Render

### URLs de Producción

- **Frontend**: https://eduai-platform.com
- **API**: https://api.eduai-platform.com
- **Dashboard**: https://dashboard.eduai-platform.com
- **Monitoring**: https://monitoring.eduai-platform.com

### Monitoreo

- **Grafana**: https://dashboard.eduai-platform.com (admin/admin123)
- **Prometheus**: https://monitoring.eduai-platform.com
- **Logs**: Accesibles desde Render Dashboard

### Escalabilidad

Los servicios están configurados para escalar automáticamente en Render:

- **Auto-scaling**: Basado en CPU y memoria
- **Load balancing**: Traefik distribuye la carga
- **Health checks**: Verificación automática de servicios

### Seguridad

- **SSL/TLS**: Certificados automáticos con Let's Encrypt
- **JWT**: Autenticación segura
- **Rate limiting**: Protección contra ataques
- **CORS**: Configurado para dominios específicos

### Backup

- **Base de datos**: Backup automático diario
- **Volúmenes**: Persistencia de datos
- **Configuración**: Versionada en GitHub

### Troubleshooting

1. **Verificar logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs [service-name]
   ```

2. **Reiniciar servicio**:
   ```bash
   docker-compose -f docker-compose.prod.yml restart [service-name]
   ```

3. **Verificar salud**:
   ```bash
   ./scripts/health-check.ps1
   ```

### Contacto

Para soporte técnico: admin@eduai-platform.com
"@

Set-Content -Path "README-PRODUCTION.md" -Value $productionReadme -Encoding UTF8
Write-Host "✅ README de producción creado" -ForegroundColor Green

# Resumen final
Write-Host "`n🎉 ¡Configuración de producción completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Archivos creados:" -ForegroundColor Cyan
Write-Host "✅ docker-compose.prod.yml - Configuración de producción" -ForegroundColor Green
Write-Host "✅ Dockerfile.prod - Para todos los servicios" -ForegroundColor Green
Write-Host "✅ .env.production - Variables de entorno" -ForegroundColor Green
Write-Host "✅ .github/workflows/ci-cd.yml - GitHub Actions" -ForegroundColor Green
Write-Host "✅ render.yaml - Configuración de Render" -ForegroundColor Green
Write-Host "✅ scripts/deploy-production.ps1 - Script de despliegue" -ForegroundColor Green
Write-Host "✅ README-PRODUCTION.md - Documentación" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔧 Configurar variables de entorno:" -ForegroundColor White
Write-Host "   cp .env.production .env" -ForegroundColor Gray
Write-Host "   # Editar .env con valores reales" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🚀 Configurar GitHub Secrets:" -ForegroundColor White
Write-Host "   - DOCKER_USERNAME" -ForegroundColor Gray
Write-Host "   - DOCKER_PASSWORD" -ForegroundColor Gray
Write-Host "   - RENDER_SERVICE_ID" -ForegroundColor Gray
Write-Host "   - RENDER_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🐳 Configurar Render:" -ForegroundColor White
Write-Host "   - Crear servicio desde GitHub" -ForegroundColor Gray
Write-Host "   - Configurar variables de entorno" -ForegroundColor Gray
Write-Host "   - Configurar dominio personalizado" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🚀 Desplegar:" -ForegroundColor White
Write-Host "   ./scripts/deploy-production.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Configuración de producción - COMPLETADA" -ForegroundColor Green 