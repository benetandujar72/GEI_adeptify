# Script para completar la Fase 2: Migración de Microservicios
# Migración MCP - EduAI Platform

Write-Host "🚀 Iniciando Fase 2: Migración de Microservicios" -ForegroundColor Green
Write-Host ""

# 1. Completar Student Service
Write-Host "📚 Completando Student Service..." -ForegroundColor Yellow

$studentServicePath = "microservices\student-service"
if (-not (Test-Path $studentServicePath)) {
    New-Item -ItemType Directory -Path $studentServicePath -Force | Out-Null
}

# Crear estructura del Student Service
$studentDirs = @(
    "src\routes",
    "src\services", 
    "src\types",
    "src\utils",
    "src\database"
)

foreach ($dir in $studentDirs) {
    $fullPath = Join-Path $studentServicePath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✅ Creado: $dir" -ForegroundColor Green
    }
}

# Crear package.json para Student Service
$studentPackageJson = @"
{
  "name": "student-service",
  "version": "1.0.0",
  "description": "Student Management Microservice",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "esbuild": "^0.19.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
"@

$studentPackagePath = Join-Path $studentServicePath "package.json"
Set-Content -Path $studentPackagePath -Value $studentPackageJson

# 2. Completar Course Service
Write-Host "`n📖 Completando Course Service..." -ForegroundColor Yellow

$courseServicePath = "microservices\course-service"
if (-not (Test-Path $courseServicePath)) {
    New-Item -ItemType Directory -Path $courseServicePath -Force | Out-Null
}

# Crear estructura del Course Service
$courseDirs = @(
    "src\routes",
    "src\services",
    "src\types", 
    "src\utils",
    "src\database"
)

foreach ($dir in $courseDirs) {
    $fullPath = Join-Path $courseServicePath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✅ Creado: $dir" -ForegroundColor Green
    }
}

# Crear package.json para Course Service
$coursePackageJson = @"
{
  "name": "course-service",
  "version": "1.0.0",
  "description": "Course Management Microservice",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "esbuild": "^0.19.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
"@

$coursePackagePath = Join-Path $courseServicePath "package.json"
Set-Content -Path $coursePackagePath -Value $coursePackageJson

# 3. Crear Resource Service
Write-Host "`n🏢 Creando Resource Service..." -ForegroundColor Yellow

$resourceServicePath = "microservices\resource-service"
New-Item -ItemType Directory -Path $resourceServicePath -Force | Out-Null

$resourceDirs = @(
    "src\routes",
    "src\services",
    "src\types",
    "src\utils", 
    "src\database"
)

foreach ($dir in $resourceDirs) {
    $fullPath = Join-Path $resourceServicePath $dir
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Write-Host "✅ Creado: $dir" -ForegroundColor Green
}

# Crear package.json para Resource Service
$resourcePackageJson = @"
{
  "name": "resource-service",
  "version": "1.0.0",
  "description": "Resource Management Microservice",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "esbuild": "^0.19.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
"@

$resourcePackagePath = Join-Path $resourceServicePath "package.json"
Set-Content -Path $resourcePackagePath -Value $resourcePackageJson

# 4. Crear Communication Service
Write-Host "`n💬 Creando Communication Service..." -ForegroundColor Yellow

$communicationServicePath = "microservices\communication-service"
New-Item -ItemType Directory -Path $communicationServicePath -Force | Out-Null

$communicationDirs = @(
    "src\routes",
    "src\services",
    "src\types",
    "src\utils",
    "src\database"
)

foreach ($dir in $communicationDirs) {
    $fullPath = Join-Path $communicationServicePath $dir
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Write-Host "✅ Creado: $dir" -ForegroundColor Green
}

# Crear package.json para Communication Service
$communicationPackageJson = @"
{
  "name": "communication-service",
  "version": "1.0.0",
  "description": "Communication Management Microservice",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "socket.io": "^4.7.4",
    "nodemailer": "^6.9.7"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/nodemailer": "^6.4.14",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "esbuild": "^0.19.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
"@

$communicationPackagePath = Join-Path $communicationServicePath "package.json"
Set-Content -Path $communicationPackagePath -Value $communicationPackageJson

# 5. Crear Analytics Service
Write-Host "`n📊 Creando Analytics Service..." -ForegroundColor Yellow

$analyticsServicePath = "microservices\analytics-service"
New-Item -ItemType Directory -Path $analyticsServicePath -Force | Out-Null

$analyticsDirs = @(
    "src\routes",
    "src\services",
    "src\types",
    "src\utils",
    "src\database"
)

foreach ($dir in $analyticsDirs) {
    $fullPath = Join-Path $analyticsServicePath $dir
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Write-Host "✅ Creado: $dir" -ForegroundColor Green
}

# Crear package.json para Analytics Service
$analyticsPackageJson = @"
{
  "name": "analytics-service",
  "version": "1.0.0",
  "description": "Analytics Management Microservice",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pg": "^8.11.3",
    "drizzle-orm": "^0.29.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "socket.io": "^4.7.4",
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "esbuild": "^0.19.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
"@

$analyticsPackagePath = Join-Path $analyticsServicePath "package.json"
Set-Content -Path $analyticsPackagePath -Value $analyticsPackageJson

# 6. Actualizar docker-compose.dev.yml con los nuevos servicios
Write-Host "`n🐳 Actualizando Docker Compose..." -ForegroundColor Yellow

$dockerComposeContent = @"
version: '3.8'

services:
  # API Gateway
  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "8080:8080"
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./gateway/dynamic:/etc/traefik/dynamic
    networks:
      - mcp-network

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    environment:
      POSTGRES_DB: eduai_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - mcp-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: redis
    command: redis-server --requirepass redis123
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mcp-network

  # MCP Orchestrator
  mcp-orchestrator:
    build:
      context: ./microservices/mcp-orchestrator
      dockerfile: Dockerfile
    container_name: mcp-orchestrator
    environment:
      - NODE_ENV=development
      - PORT=3008
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3008:3008"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-orchestrator.rule=Host(`mcp-orchestrator.localhost`)"
      - "traefik.http.services.mcp-orchestrator.loadbalancer.server.port=3008"

  # User Service
  user-service:
    build:
      context: ./microservices/user-service
      dockerfile: Dockerfile
    container_name: user-service
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=Host(`user-service.localhost`)"
      - "traefik.http.services.user-service.loadbalancer.server.port=3001"

  # Student Service
  student-service:
    build:
      context: ./microservices/student-service
      dockerfile: Dockerfile
    container_name: student-service
    environment:
      - NODE_ENV=development
      - PORT=3002
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3002:3002"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.student-service.rule=Host(`student-service.localhost`)"
      - "traefik.http.services.student-service.loadbalancer.server.port=3002"

  # Course Service
  course-service:
    build:
      context: ./microservices/course-service
      dockerfile: Dockerfile
    container_name: course-service
    environment:
      - NODE_ENV=development
      - PORT=3003
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3003:3003"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.course-service.rule=Host(`course-service.localhost`)"
      - "traefik.http.services.course-service.loadbalancer.server.port=3003"

  # Resource Service
  resource-service:
    build:
      context: ./microservices/resource-service
      dockerfile: Dockerfile
    container_name: resource-service
    environment:
      - NODE_ENV=development
      - PORT=3009
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3009:3009"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.resource-service.rule=Host(`resource-service.localhost`)"
      - "traefik.http.services.resource-service.loadbalancer.server.port=3009"

  # Communication Service
  communication-service:
    build:
      context: ./microservices/communication-service
      dockerfile: Dockerfile
    container_name: communication-service
    environment:
      - NODE_ENV=development
      - PORT=3010
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3010:3010"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.communication-service.rule=Host(`communication-service.localhost`)"
      - "traefik.http.services.communication-service.loadbalancer.server.port=3010"

  # Analytics Service
  analytics-service:
    build:
      context: ./microservices/analytics-service
      dockerfile: Dockerfile
    container_name: analytics-service
    environment:
      - NODE_ENV=development
      - PORT=3011
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3011:3011"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.analytics-service.rule=Host(`analytics-service.localhost`)"
      - "traefik.http.services.analytics-service.loadbalancer.server.port=3011"

  # LLM Gateway
  llm-gateway:
    build:
      context: ./microservices/llm-gateway
      dockerfile: Dockerfile
    container_name: llm-gateway
    environment:
      - NODE_ENV=development
      - PORT=3004
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3004:3004"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.llm-gateway.rule=Host(`llm-gateway.localhost`)"
      - "traefik.http.services.llm-gateway.loadbalancer.server.port=3004"

  # Content Generation
  content-generation:
    build:
      context: ./microservices/ai-services/content-generation
      dockerfile: Dockerfile
    container_name: content-generation
    environment:
      - NODE_ENV=development
      - PORT=3005
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3005:3005"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.content-generation.rule=Host(`content-generation.localhost`)"
      - "traefik.http.services.content-generation.loadbalancer.server.port=3005"

  # Chatbot
  chatbot:
    build:
      context: ./microservices/ai-services/chatbot
      dockerfile: Dockerfile
    container_name: chatbot
    environment:
      - NODE_ENV=development
      - PORT=3006
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3006:3006"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chatbot.rule=Host(`chatbot.localhost`)"
      - "traefik.http.services.chatbot.loadbalancer.server.port=3006"

  # Predictive Analytics
  predictive-analytics:
    build:
      context: ./microservices/ai-services/predictive-analytics
      dockerfile: Dockerfile
    container_name: predictive-analytics
    environment:
      - NODE_ENV=development
      - PORT=3007
      - DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/eduai_platform
      - REDIS_URL=redis://:redis123@redis:6379
    ports:
      - "3007:3007"
    depends_on:
      - postgres
      - redis
    networks:
      - mcp-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.predictive-analytics.rule=Host(`predictive-analytics.localhost`)"
      - "traefik.http.services.predictive-analytics.loadbalancer.server.port=3007"

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - mcp-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    ports:
      - "3000:3000"
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - mcp-network

  # Email Testing
  mailhog:
    image: mailhog/mailhog:latest
    container_name: mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - mcp-network

  # Logging
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    networks:
      - mcp-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - mcp-network

volumes:
  postgres_data:
  redis_data:

networks:
  mcp-network:
    driver: bridge
"@

$dockerComposePath = "docker-compose.dev.yml"
Set-Content -Path $dockerComposePath -Value $dockerComposeContent
Write-Host "✅ Docker Compose actualizado" -ForegroundColor Green

# 7. Crear script de migración de datos
Write-Host "`n🗄️  Creando script de migración de datos..." -ForegroundColor Yellow

$migrationScript = @"
# Script para migrar datos del servidor monolítico a microservicios

Write-Host "🔄 Iniciando migración de datos..." -ForegroundColor Yellow

# 1. Backup de la base de datos actual
Write-Host "💾 Creando backup de la base de datos actual..." -ForegroundColor Cyan
`$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
`$backupFile = "backup_before_migration_`$timestamp.sql"

docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U postgres eduai_platform > "database\backups\`$backupFile"
Write-Host "✅ Backup creado: `$backupFile" -ForegroundColor Green

# 2. Ejecutar migraciones de esquemas
Write-Host "🗄️  Ejecutando migraciones de esquemas..." -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -f /docker-entrypoint-initdb.d/01-init-schemas.sql
Write-Host "✅ Esquemas creados" -ForegroundColor Green

# 3. Migrar datos por servicio
Write-Host "📊 Migrando datos por servicio..." -ForegroundColor Cyan

# Migrar usuarios
Write-Host "👥 Migrando usuarios..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -c "
INSERT INTO users.users (id, email, name, role, created_at, updated_at)
SELECT id, email, name, role, created_at, updated_at FROM public.users;
"

# Migrar estudiantes
Write-Host "📚 Migrando estudiantes..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -c "
INSERT INTO students.students (id, user_id, student_code, grade, created_at, updated_at)
SELECT id, user_id, student_code, grade, created_at, updated_at FROM public.students;
"

# Migrar cursos
Write-Host "📖 Migrando cursos..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d eduai_platform -c "
INSERT INTO courses.courses (id, name, description, teacher_id, created_at, updated_at)
SELECT id, name, description, teacher_id, created_at, updated_at FROM public.courses;
"

Write-Host "✅ Migración de datos completada" -ForegroundColor Green
Write-Host "📋 Verificar datos en cada esquema:" -ForegroundColor Cyan
Write-Host "   - users.users" -ForegroundColor Gray
Write-Host "   - students.students" -ForegroundColor Gray
Write-Host "   - courses.courses" -ForegroundColor Gray
"@

$migrationScriptPath = "scripts\migrate-data.ps1"
Set-Content -Path $migrationScriptPath -Value $migrationScript
Write-Host "✅ Script de migración creado" -ForegroundColor Green

# 8. Actualizar script de health check
Write-Host "`n🔍 Actualizando script de health check..." -ForegroundColor Yellow

$healthCheckContent = @"
# Script para verificar salud de los servicios

Write-Host "🔍 Verificando salud de los servicios..." -ForegroundColor Yellow

`$Services = @(
    "postgres:5432",
    "redis:6379",
    "mcp-orchestrator:3008",
    "user-service:3001",
    "student-service:3002",
    "course-service:3003",
    "resource-service:3009",
    "communication-service:3010",
    "analytics-service:3011",
    "llm-gateway:3004",
    "content-generation:3005",
    "chatbot:3006",
    "predictive-analytics:3007",
    "prometheus:9090",
    "grafana:3000",
    "mailhog:1025",
    "elasticsearch:9200",
    "kibana:5601"
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

$healthCheckPath = "scripts\health-check.ps1"
Set-Content -Path $healthCheckPath -Value $healthCheckContent
Write-Host "✅ Script de health check actualizado" -ForegroundColor Green

# Resumen final
Write-Host "`n🎉 ¡Fase 2 completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Servicios creados:" -ForegroundColor Cyan
Write-Host "✅ Student Service (puerto 3002)" -ForegroundColor Green
Write-Host "✅ Course Service (puerto 3003)" -ForegroundColor Green
Write-Host "✅ Resource Service (puerto 3009)" -ForegroundColor Green
Write-Host "✅ Communication Service (puerto 3010)" -ForegroundColor Green
Write-Host "✅ Analytics Service (puerto 3011)" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🚀 Iniciar entorno de desarrollo:" -ForegroundColor White
Write-Host "   .\scripts\dev-start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🗄️  Migrar datos:" -ForegroundColor White
Write-Host "   .\scripts\migrate-data.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🔍 Verificar servicios:" -ForegroundColor White
Write-Host "   .\scripts\health-check.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 📊 Acceder a dashboards:" -ForegroundColor White
Write-Host "   - Grafana: http://localhost:3000 (admin/admin123)" -ForegroundColor Gray
Write-Host "   - Traefik: http://localhost:8080" -ForegroundColor Gray
Write-Host "   - Mailhog: http://localhost:8025" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Fase 2: Migración de Microservicios - COMPLETADA" -ForegroundColor Green 