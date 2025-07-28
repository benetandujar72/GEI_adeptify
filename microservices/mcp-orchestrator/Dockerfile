# Dockerfile para MCP Orchestrator Service
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++ && rm -rf /var/cache/apk/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# ===== ETAPA DE CONSTRUCCIÓN =====
FROM base AS builder

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Construir la aplicación
RUN npm run build

# ===== ETAPA DE PRODUCCIÓN =====
FROM node:18-alpine AS production

# Instalar dumb-init para manejo de señales
RUN apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos construidos desde la etapa de builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Crear directorio de logs y establecer permisos
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3008

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Usar dumb-init como entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Comando para ejecutar la aplicación
CMD ["node", "dist/index.js"] 