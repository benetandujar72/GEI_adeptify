# Dockerfile para GEI Unified Platform - Despliegue automático en Render
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

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm install

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

# Instalar solo dependencias de producción
RUN npm install --omit=dev && npm cache clean --force

# Copiar archivos construidos
COPY --from=base /app/dist ./dist
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/shared ./shared

# Cambiar propietario de los archivos
RUN chown -R nextjs:nodejs /app

# Cambiar al usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno para Render
ENV NODE_ENV=production
ENV PORT=3000

# Script de inicio que maneja la inicialización automática
COPY --from=base /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Comando de inicio
CMD ["./start.sh"] 