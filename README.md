# 🎓 GEI_adeptify - Ecosistema Educativo Inteligente Unificado

[![Node.js](https://img.shields.io/badge/Node.js-24.5.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11.9-blue.svg)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-28.3.2-blue.svg)](https://docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Descripción

GEI_adeptify es una plataforma educativa inteligente unificada que integra múltiples servicios y tecnologías para crear un ecosistema completo de aprendizaje adaptativo.

## 🚀 Características Principales

- **Frontend React** con TypeScript y Tailwind CSS
- **Backend Node.js** con Express y microservicios
- **Inteligencia Artificial** integrada con OpenAI, Anthropic y Google AI
- **Bases de datos múltiples**: PostgreSQL, MongoDB, Redis
- **Sistema de autenticación** con Passport.js
- **Interfaz de usuario moderna** con Radix UI
- **Calendario interactivo** con FullCalendar
- **Sistema de notificaciones** en tiempo real
- **Análisis predictivo** y personalización

## 🛠️ Tecnologías Utilizadas

### Frontend
- React 18.3.1
- TypeScript 5.6.3
- Tailwind CSS 3.4.17
- Radix UI Components
- React Query (TanStack)
- React Router DOM
- Framer Motion

### Backend
- Node.js 24.5.0
- Express.js 4.21.2
- TypeScript
- Drizzle ORM
- Passport.js
- Socket.io

### Inteligencia Artificial
- OpenAI API
- Anthropic Claude API
- Google Generative AI
- TensorFlow
- PyTorch
- scikit-learn

### Bases de Datos
- PostgreSQL 15
- MongoDB 7
- Redis 7
- SQLite (desarrollo)

### DevOps & Herramientas
- Docker & Docker Compose
- Vite
- ESLint & Prettier
- Vitest
- GitHub Actions

## 📦 Instalación Rápida

### Prerrequisitos

- Windows 10/11
- PowerShell (ejecutar como administrador)
- Conexión a internet
- Al menos 8GB de RAM
- 20GB de espacio libre

### 1. Clonar el Repositorio

```bash
git clone https://github.com/benetandujar72/GEI_adeptify.git
cd GEI_adeptify
```

### 2. Instalación Automática (Recomendada)

```powershell
# Ejecutar PowerShell como administrador
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\setup-development-environment.ps1
```

### 3. Instalación Manual

#### Verificar Herramientas Instaladas
```powershell
.\scripts\check-deps.ps1
```

#### Instalar Dependencias Node.js
```bash
npm install
```

#### Instalar Dependencias Python
```bash
pip install -r requirements.txt
```

#### Iniciar Bases de Datos
```bash
docker-compose -f docker-compose.local.yml up -d
```

## 🔧 Scripts Disponibles

### Verificación y Diagnóstico
- `scripts/check-deps.ps1` - Verificación rápida de dependencias
- `scripts/verify-dependencies.ps1` - Verificación detallada
- `scripts/check-installation.ps1` - Verificación completa de instalación

### Instalación
- `scripts/install-dependencies.ps1` - Instalación completa
- `scripts/install-python-deps.ps1` - Solo dependencias Python
- `scripts/setup-local-env.ps1` - Configuración de entorno

### Desarrollo
- `scripts/setup-development-environment.ps1` - Configuración completa

## 🗄️ Configuración de Bases de Datos

### Servicios Disponibles
- **PostgreSQL**: `localhost:5432`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
- **pgAdmin**: `http://localhost:5050`
- **Mongo Express**: `http://localhost:8081`

### Credenciales por Defecto
```yaml
PostgreSQL:
  Usuario: adeptify_user
  Contraseña: adeptify_password
  Base de datos: gei_adeptify

MongoDB:
  Usuario: adeptify_admin
  Contraseña: adeptify_password
  Base de datos: gei_adeptify

pgAdmin:
  Email: admin@adeptify.es
  Contraseña: admin123

Mongo Express:
  Usuario: admin
  Contraseña: admin123
```

## 📁 Estructura del Proyecto

```
GEI_adeptify/
├── client/                 # Frontend React
├── server/                 # Backend Node.js
├── gateway/                # API Gateway
├── microservices/          # Microservicios
│   ├── ai-services/        # Servicios de IA
│   ├── analytics-service/  # Análisis
│   ├── user-service/       # Usuarios
│   └── ...
├── scripts/                # Scripts de instalación
├── docs/                   # Documentación
├── database/               # Scripts de base de datos
├── docker-compose.local.yml # Configuración Docker
└── requirements.txt        # Dependencias Python
```

## 🚀 Comandos de Desarrollo

### Iniciar Servicios
```bash
# Desarrollo completo
npm run dev

# Solo servidor
npm run dev:server

# Solo cliente
npm run dev:client

# Solo gateway
npm run dev:gateway
```

### Testing
```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

### Build y Deploy
```bash
# Build completo
npm run build

# Build de producción
npm run build:prod

# Docker
docker-compose build
docker-compose up -d
```

## 📚 Documentación

- [📖 Guía de Instalación Local](docs/INSTALACION_LOCAL.md)
- [🔍 Revisión de Dependencias](docs/REVISION_DEPENDENCIAS.md)
- [🏗️ Arquitectura del Sistema](arquitectura_unificada.md)
- [🔧 API Documentation](docs/API.md)
- [🤖 AI Services](docs/AI_API.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Benet Andújar** - *Desarrollo inicial* - [benetandujar72](https://github.com/benetandujar72)

## 🙏 Agradecimientos

- OpenAI por las APIs de inteligencia artificial
- Anthropic por Claude API
- Google por Generative AI
- La comunidad de desarrolladores de código abierto

## 📞 Soporte

Si tienes problemas con la instalación o configuración:

1. Revisa la [documentación de instalación](docs/INSTALACION_LOCAL.md)
2. Ejecuta `.\scripts\check-deps.ps1` para verificar dependencias
3. Abre un issue en GitHub con los detalles del problema

---

⭐ **¡No olvides dar una estrella al proyecto si te resulta útil!** 