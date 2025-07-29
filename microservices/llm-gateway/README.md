# LLM Gateway Service

Gateway unificado para múltiples proveedores de LLM (OpenAI, Anthropic, Google) con capacidades avanzadas de caché, cost tracking y monitoreo.

## 🚀 Características

- **Multi-Provider Support**: Integración con OpenAI, Anthropic Claude y Google Gemini
- **Caching Inteligente**: Cache híbrido (memoria + Redis) con estrategias configurables
- **Cost Tracking**: Seguimiento detallado de costos por proveedor, modelo y usuario
- **Rate Limiting**: Limitación de velocidad granular por proveedor
- **Métricas Avanzadas**: Métricas Prometheus para monitoreo completo
- **Health Checks**: Verificación de salud de todos los componentes
- **Batch Processing**: Procesamiento en lote de múltiples requests
- **Failover Automático**: Cambio automático entre proveedores en caso de fallo

## 📋 Endpoints

### Chat Completions
```
POST /api/llm/chat
```

### Text Completions
```
POST /api/llm/completions
```

### Embeddings
```
POST /api/llm/embeddings
```

### Batch Processing
```
POST /api/llm/batch
```

### Provider Management
```
GET /api/llm/providers
GET /api/llm/providers/:provider/test
```

### Model Information
```
GET /api/llm/models
GET /api/llm/models/:provider
```

### Cost Tracking
```
GET /api/llm/costs/summary
GET /api/llm/costs/history
GET /api/llm/costs/users
```

### Cache Management
```
GET /api/llm/cache/stats
DELETE /api/llm/cache
DELETE /api/llm/cache/:pattern
```

### Health Checks
```
GET /api/health
GET /api/health/detailed
GET /api/health/dependencies
GET /api/health/providers
GET /api/health/cache
GET /api/health/costs
```

### Métricas
```
GET /api/metrics/prometheus
GET /api/metrics/custom
POST /api/metrics/reset
```

## 🛠️ Instalación

### Prerrequisitos
- Node.js 18+
- Redis (opcional, para cache distribuido)
- API Keys de los proveedores LLM

### Configuración

1. **Clonar el repositorio**
```bash
cd microservices/llm-gateway
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

4. **Variables de entorno requeridas**
```env
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Anthropic (opcional)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google (opcional)
GOOGLE_API_KEY=your-google-api-key

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key
```

### Desarrollo

```bash
# Modo desarrollo con hot reload
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

### Docker

```bash
# Construir imagen
docker build -t llm-gateway .

# Ejecutar contenedor
docker run -p 3007:3007 --env-file .env llm-gateway
```

## 📖 Uso

### Ejemplo de Chat Request

```bash
curl -X POST http://localhost:3007/api/llm/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

### Ejemplo de Batch Request

```bash
curl -X POST http://localhost:3007/api/llm/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "requests": [
      {
        "messages": [{"role": "user", "content": "Hello"}],
        "model": "gpt-4"
      },
      {
        "messages": [{"role": "user", "content": "World"}],
        "model": "claude-3-sonnet"
      }
    ],
    "parallel": true
  }'
```

### Ejemplo de Embedding Request

```bash
curl -X POST http://localhost:3007/api/llm/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "input": "Hello world",
    "model": "text-embedding-ada-002"
  }'
```

## 🔧 Configuración Avanzada

### Cache Configuration

```env
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
CACHE_STRATEGY=hybrid  # memory, redis, hybrid
```

### Cost Tracking Configuration

```env
COST_TRACKING_ENABLED=true
COST_CURRENCY=USD
COST_BUDGET_DAILY=100
COST_BUDGET_MONTHLY=3000
COST_ALERT_THRESHOLD=0.8
COST_ALERT_EMAIL=admin@adeptify.es
```

### Rate Limiting Configuration

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LLM_RATE_LIMIT_WINDOW_MS=60000
LLM_RATE_LIMIT_MAX_REQUESTS=10
```

## 📊 Monitoreo

### Métricas Prometheus

El servicio expone métricas en formato Prometheus en `/api/metrics/prometheus`:

- `http_requests_total`: Total de requests HTTP
- `http_request_duration_seconds`: Duración de requests HTTP
- `llm_requests_total`: Total de requests LLM
- `llm_request_duration_seconds`: Duración de requests LLM
- `llm_tokens_total`: Total de tokens procesados
- `llm_cost_total`: Costo total de requests LLM
- `cache_hit_ratio`: Ratio de aciertos de cache
- `active_connections`: Conexiones activas
- `error_rate_total`: Total de errores

### Health Checks

El servicio incluye health checks detallados:

- **Básico**: `/api/health`
- **Detallado**: `/api/health/detailed`
- **Dependencias**: `/api/health/dependencies`
- **Providers**: `/api/health/providers`
- **Cache**: `/api/health/cache`
- **Cost Tracking**: `/api/health/costs`

## 🔒 Seguridad

- **Autenticación JWT**: Todas las rutas protegidas requieren token JWT válido
- **Rate Limiting**: Limitación de velocidad por IP y usuario
- **Input Sanitization**: Sanitización automática de inputs
- **CORS**: Configuración de CORS para orígenes permitidos
- **Helmet**: Headers de seguridad HTTP
- **Validation**: Validación de esquemas con Zod

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Tests de cobertura
npm run test:coverage
```

## 📝 Logs

El servicio utiliza Winston para logging con diferentes niveles:

- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **LLM logs**: `logs/llm.log`
- **Cost logs**: `logs/costs.log`
- **Metrics logs**: `logs/metrics.log`

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico, contacta al equipo de desarrollo o crea un issue en el repositorio.