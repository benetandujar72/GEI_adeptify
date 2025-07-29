# Dockerfile para Resource Service
# EduAI Platform - Microservicios con MCP

# Usar imagen base de Node.js
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Etapa de desarrollo
FROM base AS development

# Instalar dependencias de desarrollo
RUN npm ci

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3004

# Comando para desarrollo
CMD ["npm", "run", "dev"]

# Etapa de construcción
FROM base AS builder

# Instalar dependencias de desarrollo para construcción
RUN npm ci

# Copiar código fuente
COPY . .

# Construir aplicación
RUN npm run build

# Etapa de producción
FROM base AS production

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copiar archivos construidos
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Crear directorio de logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 3004

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Comando para producción
CMD ["npm", "start"]