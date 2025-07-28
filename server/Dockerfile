# Multi-stage build para optimizar el tamaño de la imagen
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para compilación
RUN apk add --no-cache python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY esbuild.config.js ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

# Instalar dependencias de runtime
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos compilados desde builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Crear directorio de logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
