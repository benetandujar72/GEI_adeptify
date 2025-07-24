# Dockerfile para GEI Unified Platform - Despliegue optimizado en Render
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración en una sola capa
COPY package*.json tsconfig.json drizzle.config.ts tailwind.config.ts postcss.config.js vite.config.ts esbuild.config.js ./

# Copiar archivos de configuración del cliente en una sola capa
COPY client/postcss.config.js client/tailwind.config.js client/tsconfig.node.json client/tsconfig.json client/vite.config.ts client/index.html ./client/
COPY client/public ./client/public

# Instalar dependencias con configuración optimizada
RUN npm ci --only=production --ignore-scripts && \
    npm ci --ignore-scripts && \
    npm cache clean --force

# Copiar código fuente del servidor
COPY server ./server

# Copiar código fuente del cliente
COPY client/src ./client/src

# Crear directorios necesarios y copiar archivos específicos en una sola capa
RUN mkdir -p client/src/pages/adeptify client/src/pages/assistatut && \
    echo "=== Directorios creados ===" && \
    ls -la client/src/pages/

# Copiar archivos desde adeptify y Assistatut en una sola capa
COPY adeptify/client/src/pages/CompetencySelector.tsx ./client/src/pages/adeptify/Competencies.tsx
COPY adeptify/client/src/pages/Statistics.tsx ./client/src/pages/adeptify/Statistics.tsx
COPY adeptify/client/src/pages/EvaluationGrid.tsx ./client/src/pages/adeptify/Evaluations.tsx
COPY adeptify/client/src/pages/Settings.tsx ./client/src/pages/adeptify/Settings.tsx
COPY adeptify/client/src/pages/Criteria.tsx ./client/src/pages/adeptify/Criteria.tsx
COPY Assistatut/client/src/pages/guard-duties.tsx ./client/src/pages/assistatut/Guards.tsx
COPY Assistatut/client/src/pages/hourly-attendance.tsx ./client/src/pages/assistatut/Attendance.tsx

# Verificar que todos los archivos críticos están presentes
RUN echo "=== Verificación completa de archivos críticos ===" && \
    echo "✅ Páginas principales:" && \
    ls -la client/src/pages/Dashboard.tsx client/src/pages/Login.tsx && \
    echo "✅ Directorio adeptify:" && \
    ls -la client/src/pages/adeptify/ && \
    echo "✅ Directorio assistatut:" && \
    ls -la client/src/pages/assistatut/ && \
    echo "✅ Componentes:" && \
    ls -la client/src/components/Navigation.tsx client/src/components/ProtectedRoute.tsx && \
    echo "✅ Hooks:" && \
    ls -la client/src/hooks/useAuth.tsx && \
    echo "✅ Archivos de estilo:" && \
    ls -la client/src/App.css && \
    echo "✅ Todos los archivos críticos verificados correctamente"

# Copiar directorio shared
COPY shared ./shared

# Verificar archivos de configuración críticos
RUN echo "=== Verificando archivos de configuración ===" && \
    ls -la tsconfig.json esbuild.config.js vite.config.ts tailwind.config.ts postcss.config.js && \
    ls -la client/postcss.config.js client/tailwind.config.js client/tsconfig.node.json client/tsconfig.json client/vite.config.ts client/index.html && \
    ls -la client/public/manifest.json client/public/logo.svg server/index.ts client/src/App.tsx && \
    ls -la shared/schema.ts && \
    echo "✅ Todos los archivos de configuración verificados"

# Construir la aplicación
RUN echo "=== Iniciando build de la aplicación ===" && \
    npm run build && \
    echo "✅ Build completado exitosamente"

# Verificar que el build se completó correctamente
RUN echo "=== Verificando resultados del build ===" && \
    ls -la dist/ && \
    ls -la dist/client/ && \
    echo "✅ Build verificado correctamente"

# Imagen de producción
FROM node:18-alpine AS production

# Instalar dependencias del sistema para producción
RUN apk add --no-cache libc6-compat

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

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

# Copiar scripts y archivos de configuración necesarios
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/drizzle.config.ts ./
COPY --from=base /app/render.yaml ./
COPY --from=base /app/drizzle ./drizzle

# Configurar permisos
RUN chmod +x ./scripts/*.sh && \
    chown -R nextjs:nodejs /app

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