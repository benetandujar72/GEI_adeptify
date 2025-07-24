# 🤖 API de Inteligencia Artificial - GEI Unified Platform

## 📋 Resumen

La API de Inteligencia Artificial proporciona funcionalidades avanzadas de IA para la plataforma educativa GEI Unified, incluyendo chatbot educativo, análisis predictivo y generación automática de reportes.

## 🔧 Configuración

### Variables de Entorno Requeridas

```bash
# OpenAI API Key (requerida para todas las funcionalidades de IA)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Configuración opcional de Redis (para caché de IA)
REDIS_URL=redis://localhost:6379
```

### Modelos de IA Utilizados

- **Chatbot**: `gpt-4o-mini` (temperatura: 0.7, max tokens: 1000)
- **Análisis**: `gpt-4o-mini` (temperatura: 0.3-0.5, max tokens: 800-2000)
- **Reportes**: `gpt-4o-mini` (temperatura: 0.4, max tokens: 2000)

## 🗣️ Chatbot Educativo

### Crear Sesión de Chat

```http
POST /api/ai/chat/sessions
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Nueva conversación"
}
```

**Respuesta:**
```json
{
  "id": "session_1703123456789_abc123def",
  "userId": "user_123",
  "title": "Nueva conversación",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "messageCount": 0
}
```

### Enviar Mensaje

```http
POST /api/ai/chat/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "sessionId": "session_1703123456789_abc123def",
  "content": "¿Cómo puedo mejorar el rendimiento de mis estudiantes?",
  "context": "profesor de matemáticas"
}
```

**Respuesta:**
```json
{
  "message": {
    "id": "msg_1703123456789_xyz789",
    "role": "assistant",
    "content": "Para mejorar el rendimiento de tus estudiantes en matemáticas, te recomiendo...",
    "timestamp": "2024-01-15T10:30:15.000Z",
    "metadata": {
      "confidence": 0.9
    }
  },
  "suggestions": [
    "¿Qué estrategias específicas puedo usar para estudiantes con dificultades?",
    "¿Cómo puedo motivar a los estudiantes desinteresados?",
    "¿Qué recursos digitales recomiendas para matemáticas?"
  ],
  "relatedTopics": [
    "Estrategias de enseñanza",
    "Motivación estudiantil",
    "Recursos educativos digitales"
  ],
  "confidence": 0.9
}
```

### Obtener Sesiones de Chat

```http
GET /api/ai/chat/sessions
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": "session_1703123456789_abc123def",
    "title": "Nueva conversación",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:15.000Z",
    "messageCount": 2
  }
]
```

### Eliminar Sesión

```http
DELETE /api/ai/chat/sessions/{sessionId}
Authorization: Bearer <token>
```

### Obtener Estadísticas del Chatbot

```http
GET /api/ai/chat/stats
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "totalSessions": 5,
  "totalMessages": 25,
  "averageMessagesPerSession": 5,
  "mostActiveDay": "Lunes",
  "sentimentDistribution": {
    "positive": 60,
    "neutral": 30,
    "negative": 10
  }
}
```

## 📊 Análisis Predictivo

### Predicción de Rendimiento Individual

```http
POST /api/ai/analytics/predict
Content-Type: application/json
Authorization: Bearer <token>

{
  "studentId": "student_123",
  "subjectId": "math_101",
  "currentGrade": 7.5,
  "attendanceRate": 85,
  "studyTime": 10,
  "previousGrades": [7.0, 8.0, 6.5, 7.5],
  "behaviorScore": 8.0,
  "participationRate": 75
}
```

**Respuesta:**
```json
{
  "studentId": "student_123",
  "subjectId": "math_101",
  "predictedGrade": 7.8,
  "confidence": 0.85,
  "riskLevel": "low",
  "factors": [
    "Asistencia consistente",
    "Mejora en calificaciones recientes",
    "Buena participación en clase"
  ],
  "recommendations": [
    "Mantener el nivel de estudio actual",
    "Fomentar participación en actividades grupales",
    "Revisar conceptos específicos de álgebra"
  ],
  "trend": "improving"
}
```

### Predicción en Lote

```http
POST /api/ai/analytics/predict/batch
Content-Type: application/json
Authorization: Bearer <token>

{
  "predictions": [
    {
      "studentId": "student_123",
      "subjectId": "math_101",
      "currentGrade": 7.5,
      "attendanceRate": 85,
      "studyTime": 10,
      "previousGrades": [7.0, 8.0, 6.5, 7.5],
      "behaviorScore": 8.0,
      "participationRate": 75
    },
    {
      "studentId": "student_124",
      "subjectId": "math_101",
      "currentGrade": 5.0,
      "attendanceRate": 60,
      "studyTime": 5,
      "previousGrades": [4.5, 5.5, 4.0, 5.0],
      "behaviorScore": 6.0,
      "participationRate": 40
    }
  ]
}
```

### Detectar Patrones

```http
POST /api/ai/analytics/patterns
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "attendance",
  "data": [
    {"studentId": "s1", "date": "2024-01-15", "present": true},
    {"studentId": "s2", "date": "2024-01-15", "present": false},
    {"studentId": "s1", "date": "2024-01-16", "present": true}
  ],
  "timeRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.999Z"
  }
}
```

**Respuesta:**
```json
[
  {
    "patternType": "absenteeism_trend",
    "description": "Tendencia creciente de ausentismo los lunes",
    "confidence": 0.85,
    "impact": "negative",
    "affectedStudents": ["s2", "s3", "s5"],
    "recommendations": [
      "Implementar programa de motivación para lunes",
      "Contactar padres de estudiantes afectados",
      "Revisar horarios de lunes"
    ]
  }
]
```

### Generar Alertas Tempranas

```http
GET /api/ai/analytics/warnings
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "type": "academic",
    "severity": "high",
    "title": "Calificación baja detectada",
    "description": "El estudiante student_124 tiene una calificación de 4.5/10 en matemáticas",
    "affectedUsers": ["student_124"],
    "data": {
      "studentId": "student_124",
      "subject": "math_101",
      "grade": 4.5
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "resolved": false
  }
]
```

### Recomendaciones Personalizadas

```http
GET /api/ai/analytics/recommendations/{studentId}
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "academic": [
    "Implementar tutoría individual en matemáticas",
    "Asignar ejercicios de refuerzo específicos",
    "Programar sesiones de estudio guiado"
  ],
  "behavioral": [
    "Fomentar participación en actividades grupales",
    "Implementar sistema de recompensas por asistencia",
    "Establecer metas semanales alcanzables"
  ],
  "attendance": [
    "Contactar a los padres para coordinar esfuerzos",
    "Implementar programa de motivación matutina",
    "Revisar posibles causas de ausentismo"
  ],
  "general": [
    "Mantener comunicación regular con el estudiante",
    "Documentar progreso semanalmente",
    "Celebrar pequeñas mejoras"
  ]
}
```

### Insights de Análisis

```http
GET /api/ai/analytics/insights?start=2024-01-01&end=2024-01-31
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "overallTrends": [
    {
      "metric": "average_grade",
      "trend": "increasing",
      "value": 7.2,
      "change": "+0.5"
    }
  ],
  "keyMetrics": {
    "totalStudents": 150,
    "averageGrade": 7.2,
    "averageAttendance": 88,
    "averageBehavior": 7.8
  },
  "topPerformers": ["student_123", "student_456", "student_789"],
  "studentsAtRisk": ["student_124", "student_125"],
  "recommendations": [
    "Implementar programa de tutoría para estudiantes en riesgo",
    "Fomentar participación en actividades extracurriculares",
    "Revisar metodología de enseñanza en matemáticas"
  ]
}
```

### Precisión de Predicciones

```http
GET /api/ai/analytics/accuracy
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "overallAccuracy": 0.85,
  "accuracyBySubject": {
    "math": 0.88,
    "science": 0.82,
    "language": 0.85
  },
  "accuracyByGrade": {
    "9-10": 0.90,
    "7-8": 0.85,
    "5-6": 0.80,
    "0-4": 0.75
  },
  "recentPredictions": 150
}
```

## 📄 Generación de Reportes

### Generar Reporte Automático

```http
POST /api/ai/reports/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "evaluation",
  "timeRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.999Z"
  },
  "filters": {
    "subjects": ["math_101", "science_101"],
    "grades": [5, 6, 7, 8, 9, 10]
  },
  "includeCharts": true,
  "includeRecommendations": true,
  "format": "html"
}
```

**Respuesta:**
```json
{
  "id": "report_1703123456789_abc123",
  "type": "evaluation",
  "title": "Evaluaciones - 01/01/2024 a 31/01/2024",
  "summary": "Este reporte analiza 150 puntos de datos del período especificado...",
  "content": {
    "sections": [
      {
        "title": "Resumen Ejecutivo",
        "content": "Se analizaron 150 registros durante el período...",
        "type": "text"
      },
      {
        "title": "Datos Principales",
        "content": "Los datos muestran variaciones significativas...",
        "type": "table",
        "data": {
          "headers": ["Estudiante", "Asignatura", "Calificación"],
          "rows": [["Estudiante 1", "Matemáticas", "8.5"]]
        }
      }
    ],
    "charts": [
      {
        "type": "bar",
        "title": "Distribución de Calificaciones",
        "data": {
          "labels": ["9-10", "7-8", "5-6", "0-4"],
          "datasets": [{"data": [15, 45, 60, 30]}]
        }
      }
    ],
    "recommendations": [
      "Implementar tutoría para estudiantes con calificaciones bajas",
      "Fomentar participación en actividades de refuerzo",
      "Revisar metodología de evaluación"
    ],
    "insights": [
      {
        "type": "positive",
        "title": "Mejora en rendimiento general",
        "description": "Se observa una mejora del 15% en las calificaciones promedio",
        "impact": "high"
      }
    ]
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    },
    "dataPoints": 150,
    "confidence": 0.85
  },
  "format": "html"
}
```

### Análisis de Tendencias

```http
POST /api/ai/reports/trends
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": [
    {"month": "Enero", "averageGrade": 7.0},
    {"month": "Febrero", "averageGrade": 7.2},
    {"month": "Marzo", "averageGrade": 7.5}
  ],
  "timeRange": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-03-31T23:59:59.999Z"
  }
}
```

**Respuesta:**
```json
[
  {
    "trend": "increasing",
    "magnitude": 0.7,
    "confidence": 0.85,
    "factors": [
      "Implementación de nuevas metodologías",
      "Mejora en recursos educativos",
      "Mayor participación estudiantil"
    ],
    "prediction": {
      "nextPeriod": 7.8,
      "confidence": 0.75
    }
  }
]
```

### Reporte Comparativo

```http
POST /api/ai/reports/comparative
Content-Type: application/json
Authorization: Bearer <token>

{
  "data1": [
    {"studentId": "s1", "grade": 8.0},
    {"studentId": "s2", "grade": 7.5}
  ],
  "data2": [
    {"studentId": "s1", "grade": 8.5},
    {"studentId": "s2", "grade": 8.0}
  ],
  "comparisonType": "period"
}
```

### Reporte Predictivo

```http
POST /api/ai/reports/predictive
Content-Type: application/json
Authorization: Bearer <token>

{
  "historicalData": [
    {"month": "Enero", "averageGrade": 7.0},
    {"month": "Febrero", "averageGrade": 7.2},
    {"month": "Marzo", "averageGrade": 7.5}
  ],
  "predictionPeriods": 3
}
```

### Plantillas de Reportes

```http
GET /api/ai/reports/templates
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": "evaluation_summary",
    "name": "Resumen de Evaluaciones",
    "description": "Reporte completo de evaluaciones con análisis de tendencias",
    "type": "evaluation",
    "config": {
      "type": "evaluation",
      "includeCharts": true,
      "includeRecommendations": true,
      "format": "html"
    }
  },
  {
    "id": "attendance_analysis",
    "name": "Análisis de Asistencia",
    "description": "Análisis detallado de patrones de asistencia",
    "type": "attendance",
    "config": {
      "type": "attendance",
      "includeCharts": true,
      "includeRecommendations": true,
      "format": "html"
    }
  }
]
```

## 🔍 Estado y Monitoreo

### Estado de los Servicios de IA

```http
GET /api/ai/status
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "chatbot": {
    "initialized": true,
    "model": "gpt-4o-mini",
    "features": ["chat", "sentiment_analysis", "topic_extraction", "suggestions"]
  },
  "analytics": {
    "initialized": true,
    "features": ["predictions", "pattern_detection", "early_warnings", "recommendations"]
  },
  "reports": {
    "initialized": true,
    "features": ["auto_generation", "trend_analysis", "comparative_reports", "predictive_reports"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Health Check

```http
GET /api/ai/health
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "status": "healthy",
  "services": {
    "openai": "connected",
    "cache": "available",
    "database": "connected"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚨 Códigos de Error

### Errores Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| `400` | Datos inválidos | Verificar formato de datos enviados |
| `401` | No autenticado | Incluir token de autorización válido |
| `500` | Error interno | Verificar configuración de OpenAI API |
| `503` | Servicio no disponible | Verificar estado de servicios de IA |

### Errores Específicos de IA

| Código | Descripción |
|--------|-------------|
| `AI_001` | OpenAI API Key no configurada |
| `AI_002` | Modelo de IA no disponible |
| `AI_003` | Límite de tokens excedido |
| `AI_004` | Error en análisis de sentimientos |
| `AI_005` | Error en generación de predicciones |

## 📈 Límites y Cuotas

### Límites por Endpoint

- **Chatbot**: 100 mensajes por hora por usuario
- **Predicciones**: 50 predicciones por minuto
- **Reportes**: 10 reportes por hora por usuario
- **Análisis**: 20 análisis por minuto

### Límites de OpenAI

- **Tokens por petición**: 2000 tokens máximo
- **Peticiones por minuto**: 60 peticiones
- **Peticiones por día**: 1000 peticiones

## 🔒 Seguridad

### Autenticación

Todas las rutas requieren autenticación mediante JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Auditoría

Todas las operaciones de IA son auditadas automáticamente:

- Creación de sesiones de chat
- Envío de mensajes
- Generación de predicciones
- Creación de reportes
- Acceso a datos sensibles

### Privacidad

- Los datos de estudiantes son anonimizados antes del análisis
- No se almacenan conversaciones completas permanentemente
- Los datos se eliminan automáticamente después de 30 días

## 🚀 Ejemplos de Uso

### Ejemplo: Chatbot Educativo

```javascript
// Crear nueva sesión
const session = await fetch('/api/ai/chat/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Consulta sobre matemáticas'
  })
});

// Enviar mensaje
const response = await fetch('/api/ai/chat/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    sessionId: session.id,
    content: '¿Cómo puedo explicar las fracciones de manera más efectiva?'
  })
});
```

### Ejemplo: Análisis Predictivo

```javascript
// Predicción de rendimiento
const prediction = await fetch('/api/ai/analytics/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    studentId: 'student_123',
    subjectId: 'math_101',
    currentGrade: 7.5,
    attendanceRate: 85,
    studyTime: 10,
    previousGrades: [7.0, 8.0, 6.5, 7.5],
    behaviorScore: 8.0,
    participationRate: 75
  })
});
```

### Ejemplo: Generación de Reportes

```javascript
// Generar reporte automático
const report = await fetch('/api/ai/reports/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'evaluation',
    timeRange: {
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-31T23:59:59.999Z'
    },
    includeCharts: true,
    includeRecommendations: true,
    format: 'html'
  })
});
```

## 📚 Recursos Adicionales

- [Documentación de OpenAI API](https://platform.openai.com/docs)
- [Guía de mejores prácticas de IA](https://platform.openai.com/docs/guides/prompt-engineering)
- [Ejemplos de prompts educativos](https://platform.openai.com/examples)
- [Soporte técnico](mailto:support@gei.adeptify.es)

---

**🤖 ¡IA al servicio de la educación!** 