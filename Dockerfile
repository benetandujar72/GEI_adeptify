# Dockerfile para GEI Unified Platform - Despliegue optimizado en Render
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY vite.config.ts ./
COPY esbuild.config.js ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci --only=production=false

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

# Instalar dependencias del sistema para producción
RUN apk add --no-cache libc6-compat

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY --from=base /app/package*.json ./

# Instalar solo dependencias de producción (incluyendo postgres)
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos construidos
COPY --from=base /app/dist ./dist
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/shared ./shared

# Copiar todos los scripts necesarios
COPY --from=base /app/scripts ./scripts
RUN chmod +x ./scripts/*.sh

# Copiar archivos de configuración necesarios
COPY --from=base /app/drizzle.config.ts ./
COPY --from=base /app/render.yaml ./

# Cambiar propietario de los archivos
RUN chown -R nextjs:nodejs /app

# Cambiar al usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno para Render
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio optimizado para producción
CMD ["./scripts/start-production-optimized.sh"] 