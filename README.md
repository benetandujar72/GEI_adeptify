# 🎓 GEI Platform - Sistema de Gestión Educativa Integral

## 📋 Descripción

**GEI Platform** es un sistema modular de gestión educativa integral diseñado para instituciones educativas. Proporciona una solución completa para la administración académica, control de asistencia, gestión de recursos y análisis educativo.

## ✨ Características Principales

### 🏗️ Arquitectura Modular
- **Monolito Modular**: Arquitectura escalable con módulos independientes
- **Multi-Instituto**: Soporte para múltiples instituciones educativas
- **Multi-Usuario**: Sistema de roles y permisos granular
- **Multi-Idioma**: Soporte para Español, Catalán e Inglés

### 📊 Módulos Implementados

#### 1. **Evaluación** 📝
- Gestión completa de evaluaciones y competencias
- Tipos: Examen, proyecto, presentación, participación
- Estadísticas avanzadas y reportes
- Seguimiento de progreso estudiantil

#### 2. **Asistencia** ✅
- Control de asistencia en tiempo real
- Estados: Presente, ausente, tardanza, justificada
- Reportes automáticos y análisis de tendencias
- Integración con calendario académico

#### 3. **Guardias** 🛡️
- Asignación automática de guardias docentes
- Gestión de disponibilidad y horarios
- Tipos: Recreo, comida, entrada, salida, especial
- Optimización de recursos humanos

#### 4. **Encuestas** 📋
- Creación de encuestas personalizadas
- Múltiples tipos de preguntas
- Análisis de respuestas y reportes
- Distribución masiva con enlaces

#### 5. **Recursos** 🏢
- Gestión de espacios y equipamiento
- Sistema de reservas inteligente
- Calendario de utilización
- Optimización de recursos

#### 6. **Analíticas** 📈
- Dashboard interactivo con métricas clave
- Gráficos y visualizaciones avanzadas
- Reportes personalizables
- Exportación de datos

### 🤖 Integración AI
- **Chatbot Contextual**: Asistente AI por módulo
- **Múltiples Proveedores**: OpenAI, Google Gemini, Anthropic Claude
- **Análisis Inteligente**: Insights automáticos
- **Optimización de Costos**: Gestión eficiente de APIs

## 🚀 Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Vite** para build y desarrollo
- **Tailwind CSS** para estilos
- **Radix UI** para componentes accesibles
- **React Router** para navegación
- **React Query** para gestión de estado
- **i18next** para internacionalización

### Backend
- **Node.js** con TypeScript
- **Express.js** para API REST
- **PostgreSQL** con Drizzle ORM
- **Passport.js** para autenticación
- **JWT** para sesiones seguras

### DevOps
- **Docker** para containerización
- **Render** para deployment automático
- **GitHub Actions** para CI/CD

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 14+
- Docker (opcional)

### Instalación Local

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/gei-platform.git
cd gei-platform
```

2. **Instalar dependencias**
```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

3. **Configurar variables de entorno**
```bash
# Frontend (.env)
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=GEI Platform

# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/gei_platform
JWT_SECRET=your-secret-key
PORT=3001
```

4. **Configurar base de datos**
```bash
# Crear base de datos
createdb gei_platform

# Ejecutar migraciones
cd server
npm run migrate
```

5. **Iniciar desarrollo**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Docker Deployment

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:coverage

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e
```

### Cobertura de Tests
- **Unit Tests**: 85%+
- **Integration Tests**: 75%+
- **E2E Tests**: 70%+

## 📚 Documentación de API

### Autenticación
```typescript
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Verificar token
GET /api/auth/me
Authorization: Bearer <token>
```

### Evaluaciones
```typescript
// Obtener evaluaciones
GET /api/evaluations

// Crear evaluación
POST /api/evaluations
{
  "name": "Examen Final",
  "subject": "Matemáticas",
  "type": "exam",
  "date": "2024-01-15",
  "weight": 30
}
```

### Asistencia
```typescript
// Registrar asistencia
POST /api/attendance/register
{
  "date": "2024-01-15",
  "class": "1A",
  "students": [
    { "id": "1", "status": "present" },
    { "id": "2", "status": "absent" }
  ]
}
```

## 🎨 Guía de Estilos

### Componentes
```typescript
// Ejemplo de componente
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}) => {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        buttonVariants({ variant, size })
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Hooks Personalizados
```typescript
// Ejemplo de hook
export const useApi = <T>(endpoint: string) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: [endpoint],
    queryFn: () => apiClient.get(endpoint),
    staleTime: 5 * 60 * 1000,
  });
};
```

## 🔧 Configuración de Desarrollo

### Estructura de Archivos
```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes base
│   ├── forms/          # Formularios
│   └── layout/         # Componentes de layout
├── pages/              # Páginas de la aplicación
├── hooks/              # Hooks personalizados
├── context/            # Contextos de React
├── lib/                # Utilidades y configuraciones
├── types/              # Definiciones de tipos
└── tests/              # Tests
```

### Scripts Disponibles
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix"
  }
}
```

## 🚀 Deployment

### Render (Recomendado)
1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automático en push

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Subir carpeta dist a Netlify
```

## 📊 Métricas y Monitoreo

### Performance
- **Lighthouse Score**: 95+
- **Bundle Size**: < 500KB
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s

### Seguridad
- **OWASP Top 10**: Implementado
- **CORS**: Configurado
- **Rate Limiting**: Activado
- **Input Validation**: Completo

## 🤝 Contribución

### Guías de Contribución
1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Estándares de Código
- **TypeScript**: Strict mode
- **ESLint**: Configuración Airbnb
- **Prettier**: Formateo automático
- **Conventional Commits**: Estándar de commits

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

### Canales de Soporte
- **Issues**: GitHub Issues
- **Documentación**: Wiki del proyecto
- **Email**: soporte@gei-platform.com

### FAQ
**Q: ¿Cómo cambio el idioma de la aplicación?**
A: Usa el selector de idioma en la barra superior.

**Q: ¿Cómo agrego un nuevo módulo?**
A: Sigue la guía de desarrollo en `/docs/module-development.md`

**Q: ¿Cómo configuro la base de datos?**
A: Consulta la documentación en `/docs/database-setup.md`

## 🏆 Roadmap

### Fase 7 - Optimizaciones Avanzadas
- [ ] PWA (Progressive Web App)
- [ ] Offline Mode
- [ ] Push Notifications
- [ ] Advanced Analytics
- [ ] Machine Learning Integration

### Fase 8 - Expansión
- [ ] Mobile App (React Native)
- [ ] API GraphQL
- [ ] Microservices Architecture
- [ ] Multi-tenant SaaS

---

**Desarrollado con ❤️ para la comunidad educativa** 