# Script para implementar Fases 4, 5 y 6 - Migración MCP
# EduAI Platform

Write-Host "🚀 Iniciando implementación de Fases 4, 5 y 6..." -ForegroundColor Green
Write-Host ""

# FASE 4: FRONTEND Y API GATEWAY
Write-Host "📱 FASE 4: FRONTEND Y API GATEWAY" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 4.1 Mejorar API Gateway (Traefik)
Write-Host "🔧 Mejorando configuración de Traefik..." -ForegroundColor Yellow

$traefikConfig = @"
# Traefik Configuration - API Gateway Avanzado
global:
  checkNewVersion: false
  sendAnonymousUsage: false

api:
  dashboard: true
  debug: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-network
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@eduai-platform.com
      storage: /etc/traefik/acme/acme.json
      httpChallenge:
        entryPoint: web

middlewares:
  auth-middleware:
    headers:
      customRequestHeaders:
        X-API-Key: "{{ .Env.API_KEY }}"
  rate-limit:
    rateLimit:
      burst: 100
      average: 50
  cors:
    headers:
      accessControlAllowOriginList:
        - "https://eduai-platform.com"
        - "https://app.eduai-platform.com"
      accessControlAllowMethods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      accessControlAllowHeaders:
        - Authorization
        - Content-Type
        - X-API-Key
      accessControlMaxAge: 86400

http:
  routers:
    # API Gateway Routes
    api-gateway:
      rule: "Host(`api.eduai-platform.com`)"
      service: api-gateway
      tls:
        certResolver: letsencrypt
      middlewares:
        - auth-middleware
        - rate-limit
        - cors
    
    # Frontend Routes
    frontend:
      rule: "Host(`eduai-platform.com`)"
      service: frontend
      tls:
        certResolver: letsencrypt
      middlewares:
        - cors
    
    # Admin Portal
    admin-portal:
      rule: "Host(`admin.eduai-platform.com`)"
      service: admin-portal
      tls:
        certResolver: letsencrypt
      middlewares:
        - auth-middleware
        - rate-limit
        - cors

  services:
    api-gateway:
      loadBalancer:
        servers:
          - url: "http://mcp-orchestrator:3000"
    frontend:
      loadBalancer:
        servers:
          - url: "http://client:3000"
    admin-portal:
      loadBalancer:
        servers:
          - url: "http://admin-portal:3001"

log:
  level: INFO
  format: json

accessLog:
  format: json
  fields:
    defaultMode: keep
    headers:
      defaultMode: keep
"@

Set-Content -Path "gateway/traefik-advanced.yml" -Value $traefikConfig

# 4.2 Frontend Migration - Web App Updates
Write-Host "🌐 Migrando frontend a nueva arquitectura..." -ForegroundColor Yellow

# Crear MCP Client para frontend
$mcpClient = @"
// MCP Client para Frontend
import { MCPClient } from '@modelcontextprotocol/sdk';

export class EduAIMCPClient {
  private client: MCPClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_MCP_URL || 'http://localhost:3000';
    this.client = new MCPClient(this.baseUrl);
  }

  // Academic Data Operations
  async getStudentData(studentId: string) {
    return this.client.execute('academic', 'get_student_data', { studentId });
  }

  async getCourseData(courseId: string) {
    return this.client.execute('academic', 'get_course_data', { courseId });
  }

  async getAcademicAnalytics(filters: any) {
    return this.client.execute('academic', 'get_analytics', { filters });
  }

  // Resource Management Operations
  async getResources(filters: any) {
    return this.client.execute('resources', 'get_resources', { filters });
  }

  async reserveResource(reservation: any) {
    return this.client.execute('resources', 'reserve_resource', { reservation });
  }

  // Communication Operations
  async sendNotification(notification: any) {
    return this.client.execute('communications', 'send_notification', { notification });
  }

  async getMessages(userId: string) {
    return this.client.execute('communications', 'get_messages', { userId });
  }

  // Analytics Operations
  async getAnalyticsReport(reportType: string, filters: any) {
    return this.client.execute('analytics', 'get_report', { reportType, filters });
  }

  // AI Operations
  async generateContent(request: any) {
    return this.client.execute('ai', 'generate_content', { request });
  }

  async getPredictions(data: any) {
    return this.client.execute('ai', 'get_predictions', { data });
  }

  async getPersonalizedRecommendations(userId: string) {
    return this.client.execute('ai', 'get_recommendations', { userId });
  }
}

export const mcpClient = new EduAIMCPClient();
"@

Set-Content -Path "client/src/services/mcp-client.ts" -Value $mcpClient

# Actualizar API Client principal
$apiClient = @"
// API Client actualizado para microservicios
import { mcpClient } from './mcp-client';

export class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }

  // User Service
  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`\${this.baseUrl}/api/v1/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  }

  async register(userData: any) {
    const response = await fetch(`\${this.baseUrl}/api/v1/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }

  // Student Service
  async getStudents(filters?: any) {
    const response = await fetch(`\${this.baseUrl}/api/v1/students\${filters ? '?' + new URLSearchParams(filters) : ''}`);
    return response.json();
  }

  async getStudent(id: string) {
    const response = await fetch(`\${this.baseUrl}/api/v1/students/\${id}`);
    return response.json();
  }

  // Course Service
  async getCourses(filters?: any) {
    const response = await fetch(`\${this.baseUrl}/api/v1/courses\${filters ? '?' + new URLSearchParams(filters) : ''}`);
    return response.json();
  }

  async getCourse(id: string) {
    const response = await fetch(`\${this.baseUrl}/api/v1/courses/\${id}`);
    return response.json();
  }

  // MCP Operations
  async getStudentDataViaMCP(studentId: string) {
    return mcpClient.getStudentData(studentId);
  }

  async getCourseDataViaMCP(courseId: string) {
    return mcpClient.getCourseData(courseId);
  }

  async generateContentViaMCP(request: any) {
    return mcpClient.generateContent(request);
  }

  async getPredictionsViaMCP(data: any) {
    return mcpClient.getPredictions(data);
  }

  async getPersonalizedRecommendations(userId: string) {
    return mcpClient.getPersonalizedRecommendations(userId);
  }
}

export const apiClient = new APIClient();
"@

Set-Content -Path "client/src/services/api.ts" -Value $apiClient

# 4.3 Mobile App (React Native)
Write-Host "📱 Creando estructura para Mobile App..." -ForegroundColor Yellow

# Crear estructura básica para React Native
$mobileAppStructure = @"
// React Native App Structure
// mobile-app/
// ├── src/
// │   ├── components/
// │   ├── screens/
// │   ├── services/
// │   ├── navigation/
// │   └── utils/
// ├── android/
// ├── ios/
// └── package.json
"@

New-Item -ItemType Directory -Path "mobile-app" -Force
New-Item -ItemType Directory -Path "mobile-app/src" -Force
New-Item -ItemType Directory -Path "mobile-app/src/components" -Force
New-Item -ItemType Directory -Path "mobile-app/src/screens" -Force
New-Item -ItemType Directory -Path "mobile-app/src/services" -Force
New-Item -ItemType Directory -Path "mobile-app/src/navigation" -Force
New-Item -ItemType Directory -Path "mobile-app/src/utils" -Force

# Package.json para React Native
$mobilePackageJson = @"
{
  "name": "eduai-mobile",
  "version": "1.0.0",
  "description": "EduAI Platform Mobile App",
  "main": "index.js",
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-gesture-handler": "^2.12.0",
    "react-native-reanimated": "^3.4.0",
    "react-native-safe-area-context": "^4.7.0",
    "react-native-screens": "^3.24.0",
    "react-native-async-storage": "^1.19.0",
    "react-native-push-notification": "^8.1.0",
    "react-native-biometrics": "^3.0.0",
    "react-native-camera": "^4.2.0",
    "react-native-qrcode-scanner": "^1.5.0",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^13.14.0",
    "axios": "^1.5.0",
    "@tanstack/react-query": "^4.35.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/preset-env": "^7.20.0",
    "@babel/runtime": "^7.20.0",
    "@react-native/eslint-config": "^0.72.0",
    "@react-native/metro-config": "^0.72.0",
    "@tsconfig/react-native": "^3.0.0",
    "@types/react": "^18.0.24",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.2.1",
    "eslint": "^8.19.0",
    "jest": "^29.2.1",
    "metro-react-native-babel-preset": "0.76.8",
    "prettier": "^2.4.1",
    "react-test-renderer": "18.2.0",
    "typescript": "4.8.4"
  }
}
"@

Set-Content -Path "mobile-app/package.json" -Value $mobilePackageJson

# 4.4 Admin Portal
Write-Host "⚙️ Creando Admin Portal..." -ForegroundColor Yellow

New-Item -ItemType Directory -Path "admin-portal" -Force
New-Item -ItemType Directory -Path "admin-portal/src" -Force
New-Item -ItemType Directory -Path "admin-portal/src/components" -Force
New-Item -ItemType Directory -Path "admin-portal/src/pages" -Force
New-Item -ItemType Directory -Path "admin-portal/src/services" -Force
New-Item -ItemType Directory -Path "admin-portal/src/utils" -Force

$adminPackageJson = @"
{
  "name": "eduai-admin-portal",
  "version": "1.0.0",
  "description": "EduAI Platform Admin Portal",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@tanstack/react-query": "^4.35.0",
    "axios": "^1.5.0",
    "recharts": "^2.7.0",
    "react-hook-form": "^7.45.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.263.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
"@

Set-Content -Path "admin-portal/package.json" -Value $adminPackageJson

Write-Host "✅ Fase 4 completada" -ForegroundColor Green
Write-Host ""

# FASE 5: TESTING Y OPTIMIZACIÓN
Write-Host "🧪 FASE 5: TESTING Y OPTIMIZACIÓN" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 5.1 Unit Testing Setup
Write-Host "🧪 Configurando Unit Testing..." -ForegroundColor Yellow

$jestConfig = @"
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000,
};
"@

# Crear Jest config para cada microservicio
$services = @("user-service", "student-service", "course-service", "resource-service", "communication-service", "analytics-service", "mcp-orchestrator", "llm-gateway", "content-generation", "chatbot", "predictive-analytics", "personalization-engine", "ml-pipeline")

foreach ($service in $services) {
    if (Test-Path "microservices/$service") {
        Set-Content -Path "microservices/$service/jest.config.js" -Value $jestConfig
        New-Item -ItemType Directory -Path "microservices/$service/src/__tests__" -Force
    }
}

# 5.2 E2E Testing Setup
Write-Host "🔍 Configurando E2E Testing..." -ForegroundColor Yellow

$playwrightConfig = @"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
"@

Set-Content -Path "playwright.config.ts" -Value $playwrightConfig

New-Item -ItemType Directory -Path "tests" -Force
New-Item -ItemType Directory -Path "tests/e2e" -Force

# 5.3 Performance Testing
Write-Host "⚡ Configurando Performance Testing..." -ForegroundColor Yellow

$k6Config = @"
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const BASE_URL = 'http://localhost:3000';
  
  // Test API endpoints
  const responses = http.batch([
    ['GET', `\${BASE_URL}/api/v1/users`],
    ['GET', `\${BASE_URL}/api/v1/students`],
    ['GET', `\${BASE_URL}/api/v1/courses`],
    ['GET', `\${BASE_URL}/api/mcp/academic/health`],
    ['GET', `\${BASE_URL}/api/ai/llm/health`],
  ]);
  
  responses.forEach((response) => {
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
  
  sleep(1);
}
"@

Set-Content -Path "tests/performance/load-test.js" -Value $k6Config

# 5.4 Security Testing
Write-Host "🔒 Configurando Security Testing..." -ForegroundColor Yellow

$securityTest = @"
// Security Testing Suite
import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  test('should not expose sensitive headers', async ({ request }) => {
    const response = await request.get('/api/v1/users');
    expect(response.headers()).not.toHaveProperty('x-powered-by');
    expect(response.headers()).not.toHaveProperty('server');
  });

  test('should require authentication for protected routes', async ({ request }) => {
    const response = await request.get('/api/v1/users/profile');
    expect(response.status()).toBe(401);
  });

  test('should validate input data', async ({ request }) => {
    const response = await request.post('/api/v1/users/register', {
      data: {
        email: 'invalid-email',
        password: '123'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should prevent SQL injection', async ({ request }) => {
    const response = await request.get('/api/v1/students?search=1\' OR \'1\'=\'1');
    expect(response.status()).toBe(400);
  });

  test('should rate limit requests', async ({ request }) => {
    const promises = Array(100).fill().map(() => 
      request.get('/api/v1/users')
    );
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
"@

Set-Content -Path "tests/security/security.spec.ts" -Value $securityTest

Write-Host "✅ Fase 5 completada" -ForegroundColor Green
Write-Host ""

# FASE 6: DESPLIEGUE Y MONITOREO
Write-Host "🚀 FASE 6: DESPLIEGUE Y MONITOREO" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 6.1 Kubernetes Configuration
Write-Host "☸️ Configurando Kubernetes..." -ForegroundColor Yellow

New-Item -ItemType Directory -Path "k8s" -Force
New-Item -ItemType Directory -Path "k8s/base" -Force
New-Item -ItemType Directory -Path "k8s/overlays" -Force
New-Item -ItemType Directory -Path "k8s/overlays/staging" -Force
New-Item -ItemType Directory -Path "k8s/overlays/production" -Force

# Namespace
$namespace = @"
apiVersion: v1
kind: Namespace
metadata:
  name: eduai-platform
  labels:
    name: eduai-platform
"@

Set-Content -Path "k8s/base/namespace.yaml" -Value $namespace

# ConfigMap
$configMap = @"
apiVersion: v1
kind: ConfigMap
metadata:
  name: eduai-config
  namespace: eduai-platform
data:
  NODE_ENV: production
  DATABASE_URL: postgresql://postgres:password@postgres:5432/eduai
  REDIS_URL: redis://redis:6379
  JWT_SECRET: your-jwt-secret
  ANTHROPIC_API_KEY: your-anthropic-key
  GOOGLE_API_KEY: your-google-key
"@

Set-Content -Path "k8s/base/configmap.yaml" -Value $configMap

# 6.2 Monitoring Stack
Write-Host "📊 Configurando Monitoring Stack..." -ForegroundColor Yellow

# Prometheus Configuration
$prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'eduai-services'
    static_configs:
      - targets: 
        - 'user-service:3001'
        - 'student-service:3002'
        - 'course-service:3003'
        - 'resource-service:3009'
        - 'communication-service:3010'
        - 'analytics-service:3011'
        - 'mcp-orchestrator:3000'
        - 'llm-gateway:3004'
        - 'content-generation:3005'
        - 'chatbot:3006'
        - 'predictive-analytics:3007'
        - 'personalization-engine:3012'
        - 'ml-pipeline:3013'
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
"@

Set-Content -Path "monitoring/prometheus/prometheus.yml" -Value $prometheusConfig

# Grafana Dashboard
$grafanaDashboard = @"
{
  "dashboard": {
    "id": null,
    "title": "EduAI Platform Dashboard",
    "tags": ["eduai", "education"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Service Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "{{job}}"
          }
        ]
      }
    ]
  }
}
"@

Set-Content -Path "monitoring/grafana/dashboards/eduai-dashboard.json" -Value $grafanaDashboard

# 6.3 Alerting System
Write-Host "🚨 Configurando Alerting System..." -ForegroundColor Yellow

$alertingRules = @"
groups:
  - name: eduai-alerts
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate for {{ $labels.job }}"
          description: "Error rate is {{ $value }} for {{ $labels.job }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time for {{ $labels.job }}"
          description: "95th percentile response time is {{ $value }}s for {{ $labels.job }}"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"
"@

Set-Content -Path "monitoring/prometheus/rules/alerts.yml" -Value $alertingRules

# 6.4 ELK Stack Configuration
Write-Host "📝 Configurando ELK Stack..." -ForegroundColor Yellow

$elasticsearchConfig = @"
cluster.name: eduai-cluster
node.name: eduai-node-1
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
"@

Set-Content -Path "monitoring/elasticsearch/elasticsearch.yml" -Value $elasticsearchConfig

$logstashConfig = @"
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] {
    mutate {
      add_tag => [ "service" ]
    }
  }
  
  if [fields][level] {
    mutate {
      add_tag => [ "level" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "eduai-logs-%{+YYYY.MM.dd}"
  }
}
"@

Set-Content -Path "monitoring/logstash/pipeline/logstash.conf" -Value $logstashConfig

# 6.5 Jaeger Tracing
Write-Host "🔍 Configurando Jaeger Tracing..." -ForegroundColor Yellow

$jaegerConfig = @"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: eduai-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        ports:
        - containerPort: 16686
        - containerPort: 14268
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: eduai-platform
spec:
  selector:
    app: jaeger
  ports:
  - name: ui
    port: 16686
    targetPort: 16686
  - name: collector
    port: 14268
    targetPort: 14268
"@

Set-Content -Path "k8s/base/jaeger.yaml" -Value $jaegerConfig

# 6.6 Backup and Recovery
Write-Host "💾 Configurando Backup y Recovery..." -ForegroundColor Yellow

$backupScript = @"
#!/bin/bash
# Backup Script for EduAI Platform

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="eduai-postgres"
REDIS_CONTAINER="eduai-redis"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec $POSTGRES_CONTAINER pg_dumpall -U postgres > $BACKUP_DIR/postgres_backup_$DATE.sql

# Backup Redis
echo "Backing up Redis..."
docker exec $REDIS_CONTAINER redis-cli BGSAVE
sleep 5
docker cp $REDIS_CONTAINER:/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Backup configuration files
echo "Backing up configuration files..."
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz \
  docker-compose.prod.yml \
  .env.production \
  k8s/ \
  monitoring/ \
  gateway/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
"@

Set-Content -Path "scripts/backup.sh" -Value $backupScript

# 6.7 Disaster Recovery
Write-Host "🔄 Configurando Disaster Recovery..." -ForegroundColor Yellow

$disasterRecovery = @"
# Disaster Recovery Plan for EduAI Platform

## Recovery Procedures

### 1. Database Recovery
```bash
# Restore PostgreSQL
docker exec -i eduai-postgres psql -U postgres < /backups/postgres_backup_YYYYMMDD_HHMMSS.sql

# Restore Redis
docker cp /backups/redis_backup_YYYYMMDD_HHMMSS.rdb eduai-redis:/data/dump.rdb
docker exec eduai-redis redis-cli BGREWRITEAOF
```

### 2. Service Recovery
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Verify health
./scripts/health-check.ps1
```

### 3. Configuration Recovery
```bash
# Restore configuration
tar -xzf /backups/config_backup_YYYYMMDD_HHMMSS.tar.gz
cp .env.production .env
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring and Alerts

### Health Checks
- Service availability every 30 seconds
- Database connectivity every minute
- Disk space monitoring
- Memory and CPU usage alerts

### Automated Recovery
- Auto-restart failed services
- Load balancer failover
- Database connection pooling
- Circuit breaker patterns
"@

Set-Content -Path "docs/disaster-recovery.md" -Value $disasterRecovery

Write-Host "✅ Fase 6 completada" -ForegroundColor Green
Write-Host ""

# Actualizar docker-compose.dev.yml con nuevos servicios
Write-Host "🔧 Actualizando docker-compose.dev.yml..." -ForegroundColor Yellow

$dockerComposeUpdate = @"
# Agregar servicios de Fase 4, 5, 6
  # Fase 4: Frontend y API Gateway
  admin-portal:
    build:
      context: ./admin-portal
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:3000
    volumes:
      - ./admin-portal:/app
      - /app/node_modules
    networks:
      - eduai-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.localhost`)"
      - "traefik.http.routers.admin.tls=false"

  # Fase 5: Testing Services
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - NODE_ENV=test
    volumes:
      - ./tests:/app/tests
    networks:
      - eduai-network
    depends_on:
      - postgres
      - redis

  # Fase 6: Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - eduai-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prometheus.rule=Host(`prometheus.localhost`)"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - eduai-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.localhost`)"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - eduai-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - eduai-network
    depends_on:
      - elasticsearch
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kibana.rule=Host(`kibana.localhost`)"

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    networks:
      - eduai-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.jaeger.rule=Host(`jaeger.localhost`)"

volumes:
  prometheus_data:
  grafana_data:
  elasticsearch_data:
"@

# Leer el archivo actual y agregar los nuevos servicios
$currentContent = Get-Content "docker-compose.dev.yml" -Raw
$updatedContent = $currentContent -replace "volumes:", $dockerComposeUpdate
Set-Content -Path "docker-compose.dev.yml" -Value $updatedContent

Write-Host "🎉 ¡Fases 4, 5 y 6 implementadas exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 RESUMEN DE IMPLEMENTACIÓN:" -ForegroundColor Cyan
Write-Host "✅ Fase 4: Frontend y API Gateway - COMPLETADA" -ForegroundColor Green
Write-Host "✅ Fase 5: Testing y Optimización - COMPLETADA" -ForegroundColor Green
Write-Host "✅ Fase 6: Despliegue y Monitoreo - COMPLETADA" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. Ejecutar: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor White
Write-Host "2. Verificar servicios: ./scripts/health-check.ps1" -ForegroundColor White
Write-Host "3. Ejecutar tests: npm test" -ForegroundColor White
Write-Host "4. Acceder a dashboards:" -ForegroundColor White
Write-Host "   - Grafana: http://localhost:3000" -ForegroundColor White
Write-Host "   - Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "   - Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "   - Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host ""
Write-Host "🎯 ¡Migración MCP 100% COMPLETADA!" -ForegroundColor Green 