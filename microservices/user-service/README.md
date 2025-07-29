# 🔐 User Service - Microservei d'Usuaris

## 📋 Resum

El User Service és un microservei complet per a la gestió d'usuaris de la plataforma EduAI, amb autenticació avançada, autorització, seguretat de nivell empresarial i un sistema complet de monitoreig i logging.

## ✨ Característiques Principals

### 🔒 **Seguretat Avançada**
- **Headers de Seguretat**: HSTS, XSS Protection, CSP, Frame Options
- **Rate Limiting**: Control de velocitat per IP i usuari amb Redis
- **Validació Robusta**: Schemas Zod amb sanitització automàtica
- **CORS Configurable**: Control d'accés cross-origin per entorn
- **Detecció d'Anomalies**: Identificació de patrons sospitosos

### 👤 **Gestió d'Usuaris**
- **Autenticació JWT**: Tokens segurs amb refresh automàtic
- **Registre i Login**: Amb validació i verificació d'email
- **Perfils Avançats**: Preferències, configuració, activitat
- **Sessions**: Gestió de sessions actives i dispositius
- **Auditoria**: Registre complet d'activitats

### 📊 **Sistema de Monitoreig i Logging**
- **Logging Estructurat**: Winston amb integració ELK Stack
- **Mètriques Prometheus**: Monitoreig complet de rendiment
- **Alertes Automàtiques**: Sistema d'alertes amb múltiples canals
- **Health Checks**: Verificació d'estat i dependències
- **Auditoria de Seguretat**: Detecció i logging d'amenaçes

### 🛠️ **Funcionalitats Administratives**
- **Gestió d'Usuaris**: CRUD complet amb permisos
- **Roles i Permisos**: Sistema RBAC avançat
- **Analytics**: Estadístiques d'ús i activitat
- **Backups**: Sistema automàtic de backups
- **Migracions**: Gestió automàtica de base de dades

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    USER SERVICE                         │
├─────────────────────────────────────────────────────────┤
│  🔒 Security Middleware                                 │
│  ├── Headers de Seguretat                               │
│  ├── Rate Limiting                                      │
│  ├── CORS Avançat                                       │
│  └── Detecció d'Anomalies                               │
├─────────────────────────────────────────────────────────┤
│  ✅ Validation Middleware                                │
│  ├── Zod Schemas                                        │
│  ├── Sanitització                                       │
│  └── Error Handling                                     │
├─────────────────────────────────────────────────────────┤
│  📊 Monitoring Middleware                               │
│  ├── Request Tracking                                   │
│  ├── Performance Logging                                │
│  ├── Audit Logging                                      │
│  └── Health Checks                                      │
├─────────────────────────────────────────────────────────┤
│  🔐 Authentication                                      │
│  ├── JWT Tokens                                         │
│  ├── Session Management                                 │
│  └── Role-based Access                                  │
├─────────────────────────────────────────────────────────┤
│  💾 Data Layer                                          │
│  ├── PostgreSQL + Drizzle                               │
│  ├── Redis Cache                                        │
│  └── Migrations                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Inici Ràpid

### **Prerequisits**
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (opcional)
- Elasticsearch 8+ (opcional, per logging)
- Prometheus (opcional, per mètriques)

### **Instal·lació**

```bash
# Clonar repositori
git clone <repository-url>
cd microservices/user-service

# Instal·lar dependències
npm install

# Configurar variables d'entorn
cp .env.example .env

# Configurar base de dades
npm run db:init

# Iniciar en desenvolupament
npm run dev
```

### **Variables d'Entorn**

```bash
# Base de dades
DATABASE_URL=postgresql://user:password@localhost:5432/adeptify
REDIS_URL=redis://localhost:6379

# Seguretat
JWT_SECRET=your-super-secret-key
NODE_ENV=production

# CORS
CORS_ORIGIN=https://gei.adeptify.es

# Logging
LOG_LEVEL=info
SERVICE_NAME=user-service

# Elasticsearch (opcional)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password

# Alertes
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@adeptify.es
SMTP_PASS=password
ALERT_EMAIL_RECIPIENTS=admin@adeptify.es,ops@adeptify.es

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts
SLACK_USERNAME=User Service Alerts

ALERT_WEBHOOK_URL=https://api.adeptify.es/webhooks/alerts
ALERT_WEBHOOK_TOKEN=secret-token

# Monitoreig
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
```

## 📊 Sistema de Monitoreig

### **Endpoints de Monitoreig**

#### Health Checks
```bash
# Health check bàsic
GET /health

# Health check detallat
GET /health/detailed

# Verificació de dependències
GET /monitoring/dependencies
```

#### Mètriques
```bash
# Mètriques Prometheus
GET /monitoring/metrics

# Mètriques JSON
GET /monitoring/metrics/json

# Informació del sistema
GET /monitoring/system/info

# Estadístiques de rendiment
GET /monitoring/performance
```

#### Alertes (requereix autenticació admin)
```bash
# Estat de les alertes
GET /monitoring/alerts/status

# Disparar alerta manual
POST /monitoring/alerts/trigger

# Gestionar regles d'alerta
POST /monitoring/alerts/rules
DELETE /monitoring/alerts/rules/:ruleId

# Gestionar canals de notificació
POST /monitoring/alerts/channels
DELETE /monitoring/alerts/channels/:channelId
```

### **Mètriques Principals**

#### HTTP Metrics
- `http_requests_total`: Total de requests HTTP
- `http_request_duration_seconds`: Durada de requests
- `http_requests_in_progress`: Requests en progrés
- `http_requests_failed_total`: Requests fallits

#### Authentication Metrics
- `auth_attempts_total`: Intents d'autenticació
- `auth_success_total`: Autenticacions exitoses
- `auth_failure_total`: Autenticacions fallides
- `auth_token_validations_total`: Validacions de tokens
- `auth_token_expirations_total`: Expiració de tokens

#### User Metrics
- `user_registrations_total`: Registres d'usuaris
- `user_logins_total`: Logins d'usuaris
- `user_logouts_total`: Logouts d'usuaris
- `user_profile_updates_total`: Actualitzacions de perfil
- `user_deletions_total`: Eliminacions d'usuaris
- `active_users`: Usuaris actius

#### Security Metrics
- `security_events_total`: Esdeveniments de seguretat
- `rate_limit_hits_total`: Hits de rate limiting
- `suspicious_activities_total`: Activitats sospitoses

### **Regles d'Alerta Predefinides**

1. **High Error Rate**: Error rate > 5% en 5 minuts
2. **High Response Time**: Temps de resposta promig > 2 segons
3. **High Memory Usage**: Ús de memòria > 80%
4. **Database Connection Issues**: Errors de DB > 10 en 5 minuts
5. **Redis Connection Issues**: Errors de Redis > 5 en 5 minuts
6. **Security Breach Attempt**: Esdeveniments de seguretat > 20 en 5 minuts
7. **Rate Limit Abuse**: Rate limit hits > 50 en 5 minuts

## 🛠️ Comandaments Disponibles

### **Desenvolupament**
```bash
# Iniciar en desenvolupament
npm run dev

# Build de producció
npm run build

# Iniciar en producció
npm start
```

### **Base de Dades**
```bash
# Inicialitzar base de dades
npm run db:init

# Estat de migracions
npm run db:status

# Reset complet
npm run db:reset
```

### **Testing**
```bash
# Executar tests
npm test

# Tests en mode watch
npm run test:watch

# Cobertura de tests
npm run test:coverage
```

### **Seguretat**
```bash
# Auditoria de seguretat
npm run security:audit

# Verificació completa
npm run security:check
```

### **Monitoreig**
```bash
# Health check
npm run monitoring:health

# Mètriques
npm run monitoring:metrics

# Estat d'alertes
npm run monitoring:alerts

# Logs en temps real
npm run monitoring:logs

# Logs d'errors
npm run monitoring:errors

# Informació del sistema
npm run monitoring:system

# Estat de dependències
npm run monitoring:dependencies

# Estadístiques de rendiment
npm run monitoring:performance
```

### **Manteniment**
```bash
# Netejar logs
npm run logs:clear

# Arxivar logs
npm run logs:archive

# Exportar mètriques
npm run metrics:export

# Provar alertes
npm run alerts:test

# Verificar mètriques de Prometheus
npm run prometheus:test
```

### **Backups**
```bash
# Configurar backups automàtics
npm run backup:setup

# Backup manual
npm run backup:manual

# Estat dels backups
npm run backup:status

# Provar backups
npm run backup:test

# Eliminar backups
npm run backup:remove
```

## 🔍 Logging Avanzat

### **Estructura de Logs**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "AUTH: login",
  "service": "user-service",
  "hostname": "user-service-1",
  "environment": "production",
  "userId": "user-123",
  "requestId": "req-456",
  "sessionId": "sess-789",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/auth/login",
  "method": "POST",
  "statusCode": 200,
  "responseTime": 150,
  "category": "authentication",
  "metadata": {
    "success": true,
    "loginMethod": "email"
  }
}
```

### **Categories de Logs**
- **authentication**: Logs d'autenticació i autorització
- **user_operation**: Operacions d'usuaris
- **security**: Esdeveniments de seguretat
- **performance**: Mètriques de rendiment
- **audit**: Auditoria d'accions sensibles

### **Sanitització Automàtica**
Els logs automàticament sanititzen camps sensibles:
- `password`
- `token`
- `secret`
- `key`
- `authorization`
- `cookie`
- `x-api-key`

## 🔐 API Endpoints

### **Autenticació**
```bash
POST /api/v1/auth/register    # Registre d'usuari
POST /api/v1/auth/login       # Login d'usuari
POST /api/v1/auth/logout      # Logout d'usuari
POST /api/v1/auth/refresh     # Refresh de token
POST /api/v1/auth/forgot-password  # Recuperar contrasenya
POST /api/v1/auth/reset-password   # Reset de contrasenya
```

### **Usuaris**
```bash
GET    /api/v1/users          # Llistar usuaris
GET    /api/v1/users/:id      # Obtenir usuari
PUT    /api/v1/users/:id      # Actualitzar usuari
DELETE /api/v1/users/:id      # Eliminar usuari
GET    /api/v1/users/profile  # Perfil de l'usuari actual
PUT    /api/v1/users/profile  # Actualitzar perfil
```

### **Administració**
```bash
GET    /api/v1/admin/users    # Llistar usuaris (admin)
POST   /api/v1/admin/users    # Crear usuari (admin)
PUT    /api/v1/admin/users/:id # Actualitzar usuari (admin)
DELETE /api/v1/admin/users/:id # Eliminar usuari (admin)
GET    /api/v1/admin/analytics # Analytics (admin)
```

## 📈 Integració amb Prometheus i Grafana

### **Configuració de Prometheus**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3001']
    metrics_path: '/monitoring/metrics'
    scrape_interval: 10s
```

### **Dashboards de Grafana**
- **Dashboard Principal**: Requests per segon, temps de resposta, taxa d'error
- **Dashboard de Seguretat**: Intents d'autenticació, esdeveniments de seguretat
- **Dashboard de Rendiment**: Ús de memòria, CPU, durada de queries

## 🔍 Integració amb ELK Stack

### **Configuració de Elasticsearch**
```typescript
// Configuració del transport Elasticsearch
new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL,
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    }
  },
  indexPrefix: `logs-${serviceName}`,
  ensureMappingTemplate: true
})
```

### **Dashboards de Kibana**
- **User Service Overview**: Requests per minut, temps de resposta, taxa d'error
- **Security Monitoring**: Esdeveniments de seguretat, intents fallits
- **Performance Analysis**: Ús de memòria, CPU, requests lents

## 🐳 Docker

### **Docker Compose**
```yaml
version: '3.8'
services:
  user-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/adeptify
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - elasticsearch

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: adeptify
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY logs/ ./logs/

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

## 🔧 Troubleshooting

### **Problemes Comuns**

#### 1. Logs no apareixen a Elasticsearch
```bash
# Verificar connexió
curl -X GET "http://localhost:9200/_cluster/health"

# Verificar índexs
curl -X GET "http://localhost:9200/_cat/indices/logs-*"
```

#### 2. Mètriques no es registren
```bash
# Verificar endpoint de mètriques
curl http://localhost:3001/monitoring/metrics

# Verificar configuració
echo $METRICS_ENABLED
```

#### 3. Alertes no es disparen
```bash
# Verificar estat d'alertes
npm run monitoring:alerts

# Provar alerta manual
npm run alerts:test
```

### **Logs de Debug**
```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npm run dev
```

## 📋 Millors Pràctiques

### **Configuració de Logs**
- Usar nivells apropiats: `error`, `warn`, `info`, `debug`
- Incloure context rellevant: userId, requestId, endpoint
- Sanititzar dades sensibles: passwords, tokens, keys
- Rotar logs regularment: evitar arxius molt grans

### **Mètriques**
- Usar noms descriptius: `http_requests_total` vs `requests`
- Incloure labels rellevants: method, route, status_code
- Evitar cardinalitat alta: no usar valors únics com labels
- Documentar mètriques: incloure HELP i TYPE a Prometheus

### **Alertes**
- Configurar llindars apropiats: basats en observació històrica
- Usar cooldowns: evitar spam d'alertes
- Escalar alertes: diferents canals segons severitat
- Provar alertes: usar alertes manuals per verificar

## 🚀 Pròxims Passos

1. **Integració amb Jaeger**: per distributed tracing
2. **Mètriques personalitzades**: específiques del domini d'usuaris
3. **Alertes intel·ligents**: basades en machine learning
4. **Dashboards automàtics**: generació automàtica de dashboards
5. **Anàlisi de logs**: detecció de patrons i anomalies
6. **SLA monitoring**: monitoreig d'acords de nivell de servei
7. **Capacity planning**: predicció d'ús de recursos
8. **Automated remediation**: accions automàtiques davant alertes

## 📄 Llicència

MIT License - veure [LICENSE](LICENSE) per més detalls.

## 🤝 Contribucions

Les contribucions són benvingudes! Si us plau, llegeix [CONTRIBUTING.md](CONTRIBUTING.md) per més detalls.

---

**Nota**: Aquest sistema de monitoreig està dissenyat per escalar amb l'aplicació i proporcionar visibilitat completa de l'estat i rendiment del User Service en producció.