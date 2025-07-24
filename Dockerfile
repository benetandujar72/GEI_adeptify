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

# Copiar archivos de configuración del cliente
COPY client/postcss.config.js ./client/
COPY client/tailwind.config.js ./client/
COPY client/tsconfig.node.json ./client/
COPY client/tsconfig.json ./client/
COPY client/vite.config.ts ./client/
COPY client/index.html ./client/
COPY client/public ./client/public

# Instalar dependencias con configuración optimizada
RUN npm ci --only=production --ignore-scripts && \
    npm ci --ignore-scripts && \
    npm cache clean --force

# Copiar código fuente del servidor
COPY server ./server

# Copiar código fuente del cliente (incluyendo todas las páginas)
COPY client/src ./client/src

# Verificar que el directorio pages se copió correctamente
RUN echo "=== Verificando copia de client/src ===" && \
    ls -la client/src/ && \
    echo "=== Verificando copia de client/src/pages ===" && \
    ls -la client/src/pages/ && \
    echo "=== Verificando copia de client/src/pages/adeptify ===" && \
    ls -la client/src/pages/adeptify/ || echo "Directorio adeptify no encontrado" && \
    echo "=== Verificando copia de client/src/pages/assistatut ===" && \
    ls -la client/src/pages/assistatut/ || echo "Directorio assistatut no encontrado" && \
    echo "=== Verificando archivos específicos ===" && \
    ls -la client/src/pages/adeptify/Competencies.tsx || echo "Competencies.tsx no encontrado" && \
    ls -la client/src/pages/assistatut/Guards.tsx || echo "Guards.tsx no encontrado"

# Crear directorios si no existen y copiar archivos específicos
RUN echo "=== Creando directorios si no existen ===" && \
    mkdir -p client/src/pages/adeptify && \
    mkdir -p client/src/pages/assistatut && \
    echo "=== Verificando contenido de directorios ===" && \
    ls -la client/src/pages/adeptify/ && \
    ls -la client/src/pages/assistatut/ && \
    echo "=== Copiando archivos específicos si es necesario ===" && \
    if [ ! -f "client/src/pages/adeptify/Competencies.tsx" ]; then \
        echo "Copiando archivos de adeptify..." && \
        find . -name "Competencies.tsx" -exec cp {} client/src/pages/adeptify/ \; 2>/dev/null || echo "No se encontró Competencies.tsx"; \
        find . -name "Settings.tsx" -exec cp {} client/src/pages/adeptify/ \; 2>/dev/null || echo "No se encontró Settings.tsx"; \
        find . -name "Statistics.tsx" -exec cp {} client/src/pages/adeptify/ \; 2>/dev/null || echo "No se encontró Statistics.tsx"; \
        find . -name "Evaluations.tsx" -exec cp {} client/src/pages/adeptify/ \; 2>/dev/null || echo "No se encontró Evaluations.tsx"; \
        find . -name "Criteria.tsx" -exec cp {} client/src/pages/adeptify/ \; 2>/dev/null || echo "No se encontró Criteria.tsx"; \
        echo "=== Verificando archivos copiados de adeptify ===" && \
        ls -la client/src/pages/adeptify/ || echo "Directorio adeptify vacío"; \
    fi && \
    if [ ! -f "client/src/pages/assistatut/Guards.tsx" ]; then \
        echo "Copiando archivos de assistatut..." && \
        find . -name "Guards.tsx" -exec cp {} client/src/pages/assistatut/ \; 2>/dev/null || echo "No se encontró Guards.tsx"; \
        find . -name "Attendance.tsx" -exec cp {} client/src/pages/assistatut/ \; 2>/dev/null || echo "No se encontró Attendance.tsx"; \
        echo "=== Verificando archivos copiados de assistatut ===" && \
        ls -la client/src/pages/assistatut/ || echo "Directorio assistatut vacío"; \
    fi

# Copiar directorio shared
COPY shared ./shared

# Verificar que los archivos críticos estén presentes
RUN echo "=== Verificando archivos críticos ===" && \
    ls -la tsconfig.json && \
    ls -la esbuild.config.js && \
    ls -la vite.config.ts && \
    ls -la tailwind.config.ts && \
    ls -la postcss.config.js && \
    ls -la client/postcss.config.js && \
    ls -la client/tailwind.config.js && \
    ls -la client/tsconfig.node.json && \
    ls -la client/tsconfig.json && \
    ls -la client/vite.config.ts && \
    ls -la client/index.html && \
    ls -la client/public/manifest.json && \
    ls -la client/public/logo.svg && \
    ls -la server/index.ts && \
    ls -la client/src/App.tsx && \
    echo "=== Verificando directorio shared ===" && \
    ls -la shared/ && \
    ls -la shared/schema.ts && \
    echo "=== Verificando directorio client/src/pages/adeptify ===" && \
    ls -la client/src/pages/ && \
    ls -la client/src/pages/adeptify/ && \
    ls -la client/src/pages/adeptify/Competencies.tsx || echo "Competencies.tsx no encontrado en verificación final"

# Construir la aplicación con configuración optimizada
RUN npm run build

# Verificar que el build se completó correctamente
RUN ls -la dist/ && echo "=== Client build ===" && ls -la dist/client/ || echo "Client dist no existe"

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
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copiar archivos construidos
COPY --from=base /app/dist ./dist
COPY --from=base /app/dist/client ./client/dist
COPY --from=base /app/shared ./shared

# Verificar que los archivos se copiaron correctamente
RUN echo "=== Verificando archivos copiados ===" && \
    ls -la dist/ && \
    echo "=== Client files ===" && \
    ls -la client/dist/ || echo "Client dist no existe"

# Copiar todos los scripts necesarios
COPY --from=base /app/scripts ./scripts
RUN chmod +x ./scripts/*.sh

# Copiar archivos de configuración necesarios
COPY --from=base /app/drizzle.config.ts ./
COPY --from=base /app/render.yaml ./

# Copiar archivos de migración
COPY --from=base /app/drizzle ./drizzle

# Cambiar propietario de los archivos
RUN chown -R nextjs:nodejs /app

# Cambiar al usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno para Render
ENV NODE_ENV=production
ENV PORT=3000

# Health check optimizado
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicio optimizado para producción
CMD ["./scripts/start-production-optimized.sh"] 