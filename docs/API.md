# 📚 Documentación Técnica de la API

## 🔗 Base URL
```
https://api.gei-platform.com/v1
```

## 🔐 Autenticación

### JWT Token
Todas las peticiones a endpoints protegidos requieren un token JWT en el header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtener Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "teacher",
      "institute": "Institute ID"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 👥 Usuarios

### Obtener Usuario Actual
```http
GET /auth/me
Authorization: Bearer <token>
```

### Crear Usuario
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "teacher",
  "instituteId": "institute-1"
}
```

### Actualizar Usuario
```http
PUT /users/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

### Eliminar Usuario
```http
DELETE /users/{id}
Authorization: Bearer <token>
```

## 📝 Evaluaciones

### Obtener Evaluaciones
```http
GET /evaluations?page=1&limit=10&status=active
Authorization: Bearer <token>
```

**Parámetros:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `status`: Filtrar por estado (draft, active, completed)
- `subject`: Filtrar por asignatura
- `type`: Filtrar por tipo (exam, project, presentation, participation)

### Crear Evaluación
```http
POST /evaluations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Examen Final Matemáticas",
  "subject": "Matemáticas",
  "type": "exam",
  "date": "2024-01-15",
  "weight": 30,
  "competencies": ["comp1", "comp2"],
  "description": "Examen final del trimestre"
}
```

### Actualizar Evaluación
```http
PUT /evaluations/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Examen Final Actualizado",
  "weight": 35
}
```

### Eliminar Evaluación
```http
DELETE /evaluations/{id}
Authorization: Bearer <token>
```

## ✅ Asistencia

### Obtener Datos de Asistencia
```http
GET /attendance?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Registrar Asistencia
```http
POST /attendance/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-01-15",
  "class": "1A",
  "subject": "Matemáticas",
  "teacher": "teacher-id",
  "students": [
    {
      "id": "student-1",
      "status": "present"
    },
    {
      "id": "student-2", 
      "status": "absent"
    },
    {
      "id": "student-3",
      "status": "late"
    }
  ]
}
```

### Generar Reporte de Asistencia
```http
POST /attendance/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "csv",
  "includeDetails": true
}
```

## 🛡️ Guardias

### Obtener Guardias
```http
GET /guards?date=2024-01-15&status=assigned
Authorization: Bearer <token>
```

### Asignar Guardia
```http
POST /guards/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-01-15",
  "timeSlot": "10:30-11:00",
  "location": "Patio Principal",
  "teacherId": "teacher-1",
  "type": "recess",
  "notes": "Guardia de recreo"
}
```

### Asignación Automática
```http
POST /guards/auto-assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "startDate": "2024-01-15",
  "endDate": "2024-01-19",
  "preferences": {
    "maxGuardsPerTeacher": 3,
    "preferredTimeSlots": ["recess", "lunch"]
  }
}
```

## 📋 Encuestas

### Obtener Encuestas
```http
GET /surveys?status=active&type=student
Authorization: Bearer <token>
```

### Crear Encuesta
```http
POST /surveys
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Satisfacción Estudiantil",
  "description": "Encuesta sobre satisfacción con el curso",
  "type": "student",
  "targetAudience": ["1A", "1B", "2A"],
  "startDate": "2024-01-15",
  "endDate": "2024-01-30",
  "questions": [
    {
      "text": "¿Cómo calificarías el curso?",
      "type": "rating",
      "required": true
    },
    {
      "text": "¿Qué aspectos mejorarías?",
      "type": "text",
      "required": false
    },
    {
      "text": "¿Recomendarías el curso?",
      "type": "yes_no",
      "required": true
    }
  ]
}
```

### Obtener Respuestas
```http
GET /surveys/{id}/responses
Authorization: Bearer <token>
```

### Generar Análisis
```http
POST /surveys/analytics
Authorization: Bearer <token>
Content-Type: application/json

{
  "surveyId": "survey-1",
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

## 🏢 Recursos

### Obtener Recursos
```http
GET /resources?status=available&type=classroom
Authorization: Bearer <token>
```

### Crear Recurso
```http
POST /resources
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Aula 101",
  "type": "classroom",
  "capacity": 30,
  "location": "Primer Piso",
  "description": "Aula de informática",
  "equipment": ["Proyector", "Pizarra Digital"],
  "features": ["Aire Acondicionado", "WiFi"]
}
```

### Reservar Recurso
```http
POST /resources/book
Authorization: Bearer <token>
Content-Type: application/json

{
  "resourceId": "resource-1",
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "10:00",
  "purpose": "Clase de Matemáticas",
  "attendees": 25,
  "notes": "Necesito proyector"
}
```

### Obtener Reservas
```http
GET /resources/bookings?date=2024-01-15&resourceId=resource-1
Authorization: Bearer <token>
```

## 📊 Analíticas

### Obtener Datos de Analíticas
```http
GET /analytics?period=month&module=all
Authorization: Bearer <token>
```

### Generar Reporte
```http
POST /analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "comprehensive",
  "period": "month",
  "format": "pdf",
  "modules": ["evaluation", "attendance"],
  "filters": {
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

### Exportar Datos
```http
POST /analytics/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "attendance",
  "period": "month",
  "format": "csv",
  "includeDetails": true
}
```

## 🏫 Institutos

### Obtener Institutos
```http
GET /institutes
Authorization: Bearer <token>
```

### Crear Instituto
```http
POST /institutes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Instituto Tecnológico",
  "code": "IT001",
  "address": "Calle Principal 123",
  "phone": "+34 123 456 789",
  "email": "info@instituto.com",
  "adminId": "admin-1",
  "modules": ["evaluation", "attendance", "guard"]
}
```

## ⚙️ Sistema

### Obtener Configuración
```http
GET /system/config
Authorization: Bearer <token>
```

### Actualizar Configuración
```http
PUT /system/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionTimeout": 120,
  "maxLoginAttempts": 5,
  "require2FA": true,
  "backupFrequency": "daily",
  "retentionDays": 30
}
```

## 🤖 AI

### Chat
```http
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "¿Cómo puedo crear una evaluación?",
  "module": "evaluation",
  "context": {
    "userId": "user-1",
    "instituteId": "institute-1"
  }
}
```

### Generar Contenido
```http
POST /ai/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "evaluation_questions",
  "subject": "Matemáticas",
  "topic": "Álgebra",
  "difficulty": "medium",
  "count": 5
}
```

## 📄 Años Académicos

### Crear Año Académico
```http
POST /academic-years
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "2024-2025",
  "startDate": "2024-09-01",
  "endDate": "2025-06-30",
  "modules": ["evaluation", "attendance", "guard"],
  "settings": {
    "evaluationWeight": 70,
    "attendanceWeight": 30,
    "maxAbsences": 10
  }
}
```

## 🔍 Filtros y Paginación

### Parámetros Comunes
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 100)
- `sortBy`: Campo para ordenar
- `sortOrder`: `asc` o `desc` (default: `desc`)
- `search`: Búsqueda de texto
- `dateFrom`: Fecha de inicio
- `dateTo`: Fecha de fin

### Ejemplo de Respuesta Paginada
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## ❌ Códigos de Error

### Errores Comunes
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional info"
  }
}
```

| Código | Descripción |
|--------|-------------|
| `AUTH_REQUIRED` | Autenticación requerida |
| `INVALID_TOKEN` | Token inválido o expirado |
| `PERMISSION_DENIED` | Permisos insuficientes |
| `VALIDATION_ERROR` | Error de validación |
| `NOT_FOUND` | Recurso no encontrado |
| `CONFLICT` | Conflicto de datos |
| `RATE_LIMIT` | Límite de peticiones excedido |
| `INTERNAL_ERROR` | Error interno del servidor |

## 📈 Rate Limiting

- **Límite**: 1000 peticiones por hora por IP
- **Headers de respuesta**:
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Peticiones restantes
  - `X-RateLimit-Reset`: Tiempo de reset (Unix timestamp)

## 🔒 Seguridad

### Headers de Seguridad
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Validación de Input
- Todos los inputs son validados y sanitizados
- Protección contra SQL Injection
- Protección contra XSS
- Validación de tipos de archivo

## 📞 Soporte

Para soporte técnico:
- **Email**: api-support@gei-platform.com
- **Documentación**: https://docs.gei-platform.com
- **Status**: https://status.gei-platform.com 