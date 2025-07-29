# AI Services - EduAI Platform

Servicios especializados de Inteligencia Artificial para la plataforma EduAI, incluyendo generación de contenido, análisis predictivo, personalización y pipeline de machine learning.

## 🚀 Características

### 📝 Generación de Contenido
- **Lecciones educativas** generadas automáticamente
- **Cuestionarios** y ejercicios personalizados
- **Resúmenes** y explicaciones adaptativas
- **Transcripciones** de contenido educativo
- Soporte para múltiples idiomas y niveles

### 📊 Análisis Predictivo
- **Análisis de rendimiento** estudiantil
- **Métricas de engagement** y participación
- **Predicciones** de éxito académico
- **Recomendaciones** basadas en datos
- **Tendencias** y patrones de aprendizaje

### 🎯 Personalización
- **Adaptación de contenido** según el estilo de aprendizaje
- **Ajuste de dificultad** dinámico
- **Optimización del ritmo** de aprendizaje
- **Recomendaciones personalizadas**
- **Perfiles de usuario** inteligentes

### 🤖 Pipeline de Machine Learning
- **Entrenamiento** de modelos personalizados
- **Evaluación** y validación automática
- **Despliegue** de modelos en producción
- **Predicciones** en tiempo real
- **Gestión** de versiones de modelos

## 🏗️ Arquitectura

```
AI Services (Puerto 3008)
├── Content Generation Service
│   ├── Lesson Generator
│   ├── Quiz Generator
│   ├── Exercise Generator
│   └── Summary Generator
├── Analytics Service
│   ├── Performance Analytics
│   ├── Engagement Analytics
│   ├── Predictive Analytics
│   └── Recommendation Engine
├── Personalization Service
│   ├── Content Adaptation
│   ├── Difficulty Adjustment
│   ├── Pace Optimization
│   └── Style Detection
└── ML Pipeline Service
    ├── Model Training
    ├── Model Evaluation
    ├── Model Deployment
    └── Prediction Engine
```

## 📋 Prerrequisitos

- **Node.js** 18.x o superior
- **npm** 9.x o superior
- **Redis** 6.x o superior
- **Docker** (opcional)
- **LLM Gateway** (puerto 3007)

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
cd microservices/ai-services
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

### 4. Configurar servicios externos
- **Redis**: Para caché y colas
- **LLM Gateway**: Para generación de contenido
- **Vector Store**: Para búsqueda semántica (opcional)

### 5. Iniciar en desarrollo
```bash
npm run dev
```

### 6. Construir para producción
```bash
npm run build
npm start
```

## 🐳 Docker

### Construir imagen
```bash
docker build -t ai-services .
```

### Ejecutar contenedor
```bash
docker run -p 3008:3008 --env-file .env ai-services
```

### Docker Compose
```yaml
version: '3.8'
services:
  ai-services:
    build: .
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - LLM_GATEWAY_URL=http://llm-gateway:3007
    depends_on:
      - redis
      - llm-gateway
```

## 📚 API Endpoints

### Generación de Contenido

#### Generar contenido educativo
```http
POST /api/ai/content
Content-Type: application/json

{
  "type": "lesson",
  "topic": "Matemáticas básicas",
  "level": "intermediate",
  "language": "es",
  "length": "medium",
  "style": "formal",
  "includeExamples": true,
  "includeExercises": false
}
```

#### Generar lección específica
```http
POST /api/ai/content/lesson
Content-Type: application/json

{
  "topic": "Álgebra lineal",
  "level": "advanced",
  "targetAudience": "estudiantes universitarios",
  "keywords": ["matrices", "vectores", "transformaciones"]
}
```

#### Generar cuestionario
```http
POST /api/ai/content/quiz
Content-Type: application/json

{
  "topic": "Historia de España",
  "level": "intermediate",
  "length": "short",
  "includeExplanations": true
}
```

### Análisis Predictivo

#### Obtener análisis de rendimiento
```http
POST /api/ai/analytics/performance
Content-Type: application/json

{
  "userId": "user123",
  "courseId": "course456",
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "metrics": ["score", "completion_rate", "time_spent"]
}
```

#### Obtener predicciones
```http
POST /api/ai/analytics/predictions
Content-Type: application/json

{
  "userId": "user123",
  "courseId": "course456",
  "predictionType": "academic_success"
}
```

### Personalización

#### Personalizar contenido
```http
POST /api/ai/personalization
Content-Type: application/json

{
  "type": "content",
  "userId": "user123",
  "contentId": "content789",
  "context": {
    "currentLevel": "intermediate",
    "learningStyle": "visual",
    "preferences": {
      "difficulty": "medium",
      "pace": "moderate"
    }
  }
}
```

#### Adaptar dificultad
```http
POST /api/ai/personalization/difficulty
Content-Type: application/json

{
  "userId": "user123",
  "courseId": "course456",
  "context": {
    "recentPerformance": 85,
    "learningGoals": "advanced"
  }
}
```

### Pipeline de ML

#### Entrenar modelo
```http
POST /api/ai/pipeline/train
Content-Type: application/json

{
  "modelId": "performance-prediction-v2",
  "dataset": {
    "source": "student_performance_data",
    "format": "csv",
    "features": ["score", "time_spent", "attempts"],
    "target": "success_probability"
  },
  "config": {
    "type": "regression",
    "name": "Performance Prediction Model",
    "version": "2.0.0",
    "parameters": {
      "algorithm": "random_forest",
      "n_estimators": 100
    }
  },
  "options": {
    "epochs": 50,
    "validation_split": 0.2,
    "early_stopping": true
  }
}
```

#### Hacer predicción
```http
POST /api/ai/pipeline/predict
Content-Type: application/json

{
  "modelId": "performance-prediction-v2",
  "data": [
    {
      "score": 85,
      "time_spent": 120,
      "attempts": 2
    }
  ],
  "options": {
    "returnProbabilities": true
  }
}
```

## 🔧 Configuración

### Variables de Entorno Principales

```bash
# Servidor
PORT=3008
NODE_ENV=development
LOG_LEVEL=info

# Seguridad
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGINS=http://localhost:3000,https://gei.adeptify.es

# LLM Gateway
LLM_GATEWAY_URL=http://localhost:3007
LLM_API_KEY=your-llm-api-key

# Redis
REDIS_URL=redis://localhost:6379

# Caché
CACHE_ENABLED=true
CACHE_TTL=3600

# Vector Store
VECTOR_STORE_TYPE=chroma
VECTOR_STORE_URL=http://localhost:8000

# ML Models
ML_MODEL_STORAGE=./models
ML_TRAINING_TIMEOUT=300000
```

### Configuración de Modelos

Los modelos de ML se almacenan en el directorio `./models` y pueden ser configurados a través de variables de entorno:

```bash
# Modelos por defecto
ML_DEFAULT_MODELS=performance-prediction,engagement-classification,content-recommendation

# Configuración de entrenamiento
ML_TRAINING_TIMEOUT=300000
ML_PREDICTION_TIMEOUT=30000
```

## 📊 Monitoreo

### Health Checks

```http
GET /api/ai/health
```

Respuesta:
```json
{
  "success": true,
  "message": "AI Services are running",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "contentGeneration": "active",
    "analytics": "active",
    "personalization": "active",
    "mlPipeline": "active"
  }
}
```

### Métricas Prometheus

```http
GET /api/metrics
```

### Estado detallado

```http
GET /api/ai/status
```

## 🧪 Testing

### Ejecutar tests unitarios
```bash
npm test
```

### Ejecutar tests con coverage
```bash
npm run test:coverage
```

### Ejecutar tests de integración
```bash
npm run test:integration
```

### Ejecutar tests de rendimiento
```bash
npm run test:performance
```

## 📝 Logs

Los logs se almacenan en el directorio `./logs` con los siguientes archivos:

- `ai-services-combined.log` - Todos los logs
- `ai-services-error.log` - Solo errores
- `ai-services-exceptions.log` - Excepciones no manejadas
- `ai-services-rejections.log` - Promesas rechazadas

### Niveles de log

- `error` - Errores críticos
- `warn` - Advertencias
- `info` - Información general
- `debug` - Información de depuración

## 🔒 Seguridad

### Autenticación
- JWT tokens para autenticación
- Middleware de autorización por roles
- Validación de permisos

### Validación
- Validación de entrada con Zod
- Sanitización de datos
- Límites de tamaño de archivo

### Rate Limiting
- Límite de 100 requests por 15 minutos por IP
- Límites específicos por endpoint
- Configuración personalizable

## 🚀 Despliegue

### Producción

1. **Configurar variables de entorno**
```bash
NODE_ENV=production
LOG_LEVEL=warn
```

2. **Construir aplicación**
```bash
npm run build
```

3. **Iniciar servicios**
```bash
npm start
```

### Docker Production

```bash
# Construir imagen de producción
docker build -f Dockerfile.prod -t ai-services:prod .

# Ejecutar con variables de entorno
docker run -d \
  --name ai-services \
  -p 3008:3008 \
  --env-file .env.prod \
  ai-services:prod
```

## 🔧 Desarrollo

### Estructura del proyecto

```
src/
├── controllers/          # Controladores de la API
├── services/            # Lógica de negocio
│   ├── content-generation.ts
│   ├── analytics.ts
│   ├── personalization.ts
│   └── ml-pipeline.ts
├── routes/              # Definición de rutas
├── middleware/          # Middlewares personalizados
├── types/               # Tipos TypeScript
├── utils/               # Utilidades
└── index.ts             # Punto de entrada
```

### Scripts disponibles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo
npm run build            # Construir para producción
npm start                # Iniciar en producción

# Testing
npm test                 # Tests unitarios
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con coverage

# Linting
npm run lint             # Verificar código
npm run lint:fix         # Corregir problemas de linting

# Limpieza
npm run clean            # Limpiar archivos generados
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### Guías de contribución

- Seguir las convenciones de código establecidas
- Agregar tests para nuevas funcionalidades
- Actualizar documentación según sea necesario
- Verificar que todos los tests pasen

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

### Documentación
- [API Documentation](./docs/api.md)
- [Architecture Guide](./docs/architecture.md)
- [Deployment Guide](./docs/deployment.md)

### Contacto
- **Email**: soporte@adeptify.es
- **Issues**: [GitHub Issues](https://github.com/adeptify/eduai-platform/issues)
- **Documentación**: [Wiki](https://github.com/adeptify/eduai-platform/wiki)

### Comunidad
- **Discord**: [EduAI Community](https://discord.gg/eduai)
- **Foro**: [Community Forum](https://community.adeptify.es)

## 🔄 Changelog

### v1.0.0 (2024-01-15)
- ✨ Implementación inicial de AI Services
- 🚀 Generación de contenido educativo
- 📊 Análisis predictivo y analytics
- 🎯 Sistema de personalización
- 🤖 Pipeline de machine learning
- 🔒 Sistema de autenticación y autorización
- 📝 Documentación completa
- 🧪 Tests unitarios y de integración
- 🐳 Soporte para Docker
- 📊 Métricas y monitoreo

## 🙏 Agradecimientos

- **OpenAI** por las APIs de GPT
- **Anthropic** por Claude
- **Google** por Gemini
- **ML.js** por las librerías de machine learning
- **Express.js** por el framework web
- **TypeScript** por el tipado estático
- **Redis** por el almacenamiento en caché
- **Prometheus** por las métricas