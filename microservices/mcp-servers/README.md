# MCP Servers Service

Servicio especializado para la gestión y operación de servidores MCP (Model Context Protocol) en la plataforma EduAI.

## Características

### Servidores MCP Implementados
- **File System Server**: Operaciones de archivos y directorios
- **Git Server**: Gestión de repositorios Git
- **Search Server**: Búsqueda y indexación
- **Database Server**: Operaciones de base de datos
- **Web Browser Server**: Navegación web automatizada
- **Image Generation Server**: Generación de imágenes con IA
- **Text-to-Speech Server**: Conversión de texto a voz
- **Speech-to-Text Server**: Reconocimiento de voz
- **Calendar Server**: Gestión de calendarios
- **Email Server**: Operaciones de correo electrónico
- **Weather Server**: Datos meteorológicos
- **News Server**: Noticias y RSS
- **Translation Server**: Traducción de idiomas
- **Code Analysis Server**: Análisis de código
- **Document Processing Server**: Procesamiento de documentos

### Características Core
- **Gestión de Servidores**: Registro, monitoreo y control de servidores MCP
- **Protocolo MCP**: Implementación completa del protocolo MCP v2.0
- **Heartbeat Monitoring**: Monitoreo de salud de servidores en tiempo real
- **Load Balancing**: Distribución inteligente de carga
- **Circuit Breaker**: Patrón de tolerancia a fallos
- **Métricas Avanzadas**: Prometheus metrics y monitoreo detallado
- **Logging Estructurado**: Logs especializados por tipo de servidor
- **Autenticación JWT**: Seguridad robusta con roles y permisos
- **Rate Limiting**: Control de velocidad de requests
- **API RESTful**: Endpoints REST completos

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Servers Service                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Server    │  │   Server    │  │   Server    │         │
│  │  Manager    │  │  Registry   │  │  Health     │         │
│  │             │  │             │  │  Monitor    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   File      │  │     Git     │  │   Search    │         │
│  │  System     │  │   Server    │  │   Server    │         │
│  │  Server     │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Database   │  │     Web     │  │    Image    │         │
│  │   Server    │  │  Browser    │  │ Generation  │         │
│  │             │  │   Server    │  │   Server    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    TTS      │  │     STT     │  │ Translation │         │
│  │   Server    │  │   Server    │  │   Server    │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Prerrequisitos

- Node.js 18+
- TypeScript 5.3+
- Redis (para caching y métricas)
- PostgreSQL (opcional, para persistencia)
- Docker (opcional)

## Instalación

### Instalación con npm

```bash
# Clonar el repositorio
git clone <repository-url>
cd microservices/mcp-servers

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus configuraciones

# Compilar TypeScript
npm run build

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

### Instalación con Docker

```bash
# Construir imagen
docker build -t eduai-mcp-servers .

# Ejecutar contenedor
docker run -d \
  --name mcp-servers \
  -p 3010:3010 \
  --env-file .env \
  eduai-mcp-servers
```

## Endpoints de la API

### Health Check
```http
GET /health
```

### Gestión de Servidores

#### Obtener todos los servidores
```http
GET /api/mcp-servers/servers
Authorization: Bearer <jwt-token>
```

#### Obtener servidor por ID
```http
GET /api/mcp-servers/servers/{serverId}
Authorization: Bearer <jwt-token>
```

#### Crear nuevo servidor
```http
POST /api/mcp-servers/servers
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "type": "file-system",
  "config": {
    "name": "My File Server",
    "description": "Custom file system server"
  }
}
```

#### Eliminar servidor
```http
DELETE /api/mcp-servers/servers/{serverId}
Authorization: Bearer <jwt-token>
```

### Operaciones de Servidores

#### Ejecutar operación en servidor
```http
POST /api/mcp-servers/servers/{serverId}/request
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "operation": "read",
  "resource": "file:///path/to/file.txt",
  "parameters": {
    "encoding": "utf-8"
  }
}
```

#### Heartbeat del servidor
```http
POST /api/mcp-servers/heartbeat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "serverId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "status": "online",
  "metrics": {
    "cpu": 25.5,
    "memory": 45.2,
    "activeConnections": 10,
    "requestsPerSecond": 5.2
  }
}
```

### Métricas y Monitoreo

#### Obtener todas las métricas
```http
GET /api/mcp-servers/metrics
Authorization: Bearer <jwt-token>
```

#### Obtener métricas de servidor específico
```http
GET /api/mcp-servers/servers/{serverId}/metrics
Authorization: Bearer <jwt-token>
```

#### Obtener errores de servidor
```http
GET /api/mcp-servers/servers/{serverId}/errors
Authorization: Bearer <jwt-token>
```

### Eventos

#### Obtener eventos recientes
```http
GET /api/mcp-servers/events?limit=50
Authorization: Bearer <jwt-token>
```

#### Obtener eventos por servidor
```http
GET /api/mcp-servers/servers/{serverId}/events?limit=25
Authorization: Bearer <jwt-token>
```

## Configuración

### Variables de Entorno Principales

```bash
# Servidor
PORT=3010
NODE_ENV=development
LOG_LEVEL=info

# Seguridad
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000,https://gei.adeptify.es

# Redis
REDIS_URL=redis://localhost:6379

# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/eduai_mcp_servers

# Servidores específicos
FILE_SERVER_BASE_PATH=./data/files
GIT_SERVER_BASE_PATH=./data/repositories
```

### Configuración de Servidores

Cada tipo de servidor tiene sus propias configuraciones específicas. Consulta el archivo `env.example` para ver todas las opciones disponibles.

## Monitoreo

### Health Checks
El servicio expone endpoints de health check para monitoreo:

```bash
# Health check básico
curl http://localhost:3010/health

# Health check detallado
curl http://localhost:3010/api/mcp-servers/health
```

### Métricas Prometheus
Las métricas están disponibles en formato Prometheus:

```bash
curl http://localhost:3010/api/mcp-servers/metrics
```

### Logs
Los logs se escriben en archivos separados por tipo:

- `logs/mcp-servers-combined.log` - Logs generales
- `logs/mcp-servers-error.log` - Errores
- `logs/mcp-servers-server.log` - Operaciones de servidores
- `logs/mcp-servers-file.log` - Operaciones de archivos
- `logs/mcp-servers-git.log` - Operaciones Git
- `logs/mcp-servers-database.log` - Operaciones de BD
- `logs/mcp-servers-web.log` - Operaciones web
- `logs/mcp-servers-ai.log` - Operaciones de IA
- `logs/mcp-servers-metrics.log` - Métricas

## Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Tests de cobertura
npm run test:coverage
```

## Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar TypeScript
npm run start        # Iniciar en producción
npm run lint         # Linting
npm run lint:fix     # Linting con auto-fix
npm run clean        # Limpiar build
```

### Estructura del Proyecto

```
src/
├── types/           # Tipos TypeScript y esquemas Zod
├── services/        # Lógica de negocio
│   ├── server-manager.ts
│   └── file-system-server.ts
├── controllers/     # Controladores de API
├── routes/          # Definición de rutas
├── middleware/      # Middlewares personalizados
├── utils/           # Utilidades y helpers
└── config/          # Configuraciones
```

## Seguridad

- **Autenticación JWT**: Todos los endpoints requieren autenticación
- **Autorización por Roles**: Control de acceso basado en roles
- **Rate Limiting**: Protección contra abuso
- **Input Sanitization**: Prevención de XSS
- **CORS**: Configuración restrictiva
- **Helmet**: Headers de seguridad
- **Non-root User**: Ejecución con usuario no privilegiado

## Troubleshooting

### Problemas Comunes

1. **Servidor no inicia**
   - Verificar variables de entorno
   - Comprobar puerto disponible
   - Revisar logs de error

2. **Errores de autenticación**
   - Verificar JWT_SECRET
   - Comprobar token válido
   - Revisar permisos de usuario

3. **Servidores offline**
   - Verificar heartbeat
   - Comprobar conectividad
   - Revisar logs del servidor

4. **Errores de Redis**
   - Verificar conexión a Redis
   - Comprobar configuración
   - Revisar logs de Redis

### Debugging

```bash
# Logs detallados
LOG_LEVEL=debug npm run dev

# Logs de un servidor específico
tail -f logs/mcp-servers-server.log

# Métricas en tiempo real
watch -n 1 'curl -s http://localhost:3010/api/mcp-servers/metrics | jq'
```

## Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para soporte técnico, contacta al equipo de desarrollo en:
- Email: dev@adeptify.es
- Slack: #eduai-dev
- GitHub Issues: [Crear issue](https://github.com/adeptify/eduai-platform/issues)