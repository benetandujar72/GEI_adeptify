# EduAI Platform - Producción

## 🚀 Despliegue en Producción

### Requisitos Previos

1. **Docker y Docker Compose** instalados
2. **Dominio configurado** con DNS apuntando a Render
3. **Variables de entorno** configuradas en .env.production
4. **API Keys** configuradas para servicios AI

### Configuración

1. **Editar variables de entorno**:
   `ash
   cp .env.production .env
   # Editar .env con valores reales
   `

2. **Configurar GitHub Secrets**:
   - DOCKER_USERNAME: Usuario de Docker Hub
   - DOCKER_PASSWORD: Contraseña de Docker Hub
   - RENDER_SERVICE_ID: ID del servicio en Render
   - RENDER_API_KEY: API Key de Render

### Despliegue

#### Opción 1: Despliegue Manual
`ash
# Construir y desplegar
./scripts/deploy-production.ps1
`

#### Opción 2: Despliegue Automático (GitHub Actions)
1. Hacer push a la rama main
2. GitHub Actions ejecutará automáticamente:
   - Tests
   - Build de imágenes Docker
   - Push a Docker Hub
   - Despliegue a Render

### URLs de Producción

- **Frontend**: https://eduai-platform.com
- **API**: https://api.eduai-platform.com
- **Dashboard**: https://dashboard.eduai-platform.com
- **Monitoring**: https://monitoring.eduai-platform.com

### Monitoreo

- **Grafana**: https://dashboard.eduai-platform.com (admin/admin123)
- **Prometheus**: https://monitoring.eduai-platform.com
- **Logs**: Accesibles desde Render Dashboard

### Escalabilidad

Los servicios están configurados para escalar automáticamente en Render:

- **Auto-scaling**: Basado en CPU y memoria
- **Load balancing**: Traefik distribuye la carga
- **Health checks**: Verificación automática de servicios

### Seguridad

- **SSL/TLS**: Certificados automáticos con Let's Encrypt
- **JWT**: Autenticación segura
- **Rate limiting**: Protección contra ataques
- **CORS**: Configurado para dominios específicos

### Backup

- **Base de datos**: Backup automático diario
- **Volúmenes**: Persistencia de datos
- **Configuración**: Versionada en GitHub

### Troubleshooting

1. **Verificar logs**:
   `ash
   docker-compose -f docker-compose.prod.yml logs [service-name]
   `

2. **Reiniciar servicio**:
   `ash
   docker-compose -f docker-compose.prod.yml restart [service-name]
   `

3. **Verificar salud**:
   `ash
   ./scripts/health-check.ps1
   `

### Contacto

Para soporte técnico: admin@eduai-platform.com
