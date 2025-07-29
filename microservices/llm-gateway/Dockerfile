# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copiar dependencias y código construido
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Crear directorio de logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Cambiar al usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3007

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
CMD ["node", "dist/index.js"] 