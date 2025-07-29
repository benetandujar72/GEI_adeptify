#!/bin/sh

# Script para verificar el proceso de build paso a paso
echo "🔍 === VERIFICACIÓN DEL BUILD - GEI UNIFIED PLATFORM ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 1.0"

# Función para mostrar secciones
show_section() {
    echo ""
    echo "=========================================="
    echo "🔍 $1"
    echo "=========================================="
}

# Función para verificar comando
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        echo "✅ $1 - DISPONIBLE"
        echo "   📦 Versión: $($1 --version 2>/dev/null || echo 'No disponible')"
    else
        echo "❌ $1 - NO DISPONIBLE"
    fi
}

show_section "VERIFICACIÓN DE HERRAMIENTAS"
check_command "node"
check_command "npm"
check_command "npx"

show_section "VERIFICACIÓN DE DEPENDENCIAS"
echo "📦 Verificando dependencias instaladas:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules existe"
    echo "📊 Número de dependencias: $(ls node_modules | wc -l)"
    
    # Verificar dependencias críticas
    echo "🔍 Verificando dependencias críticas:"
    for dep in "esbuild" "vite" "typescript" "express"; do
        if [ -d "node_modules/$dep" ]; then
            echo "✅ $dep - INSTALADO"
        else
            echo "❌ $dep - NO INSTALADO"
        fi
    done
    
    # Verificar dependencias opcionales de esbuild
    echo "🔍 Verificando dependencias opcionales de esbuild:"
    if [ -d "node_modules/@esbuild" ]; then
        echo "✅ @esbuild - INSTALADO"
        ls node_modules/@esbuild/
    else
        echo "❌ @esbuild - NO INSTALADO"
    fi
else
    echo "❌ node_modules no existe"
fi

show_section "VERIFICACIÓN DE ARCHIVOS DE CONFIGURACIÓN"
echo "📄 Verificando archivos de configuración:"
for config in "package.json" "tsconfig.json" "esbuild.config.js" "vite.config.ts"; do
    if [ -f "$config" ]; then
        echo "✅ $config - EXISTE"
        echo "   📄 Tamaño: $(ls -lh "$config" | awk '{print $5}')"
    else
        echo "❌ $config - NO EXISTE"
    fi
done

show_section "VERIFICACIÓN DE CÓDIGO FUENTE"
echo "📁 Verificando estructura del código fuente:"
for dir in "server" "client/src" "shared"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir - EXISTE"
        echo "   📊 Archivos: $(find "$dir" -type f | wc -l)"
    else
        echo "❌ $dir - NO EXISTE"
    fi
done

show_section "VERIFICACIÓN DE ARCHIVOS CRÍTICOS"
echo "📄 Verificando archivos críticos:"
critical_files=(
    "server/index.ts"
    "server/src/index.ts"
    "client/src/App.tsx"
    "shared/schema.ts"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - EXISTE"
        echo "   📄 Tamaño: $(ls -lh "$file" | awk '{print $5}')"
    else
        echo "❌ $file - NO EXISTE"
    fi
done

show_section "VERIFICACIÓN DE SCRIPTS"
echo "📜 Verificando scripts en package.json:"
if [ -f "package.json" ]; then
    echo "📦 Scripts disponibles:"
    node -p "Object.keys(require('./package.json').scripts || {}).join('\n')"
else
    echo "❌ package.json no encontrado"
fi

show_section "PRUEBA DE BUILD DEL SERVIDOR"
echo "🔧 Probando build del servidor:"
if [ -f "esbuild.config.js" ]; then
    echo "✅ esbuild.config.js encontrado"
    echo "🔍 Ejecutando build del servidor..."
    
    # Limpiar build anterior
    rm -rf dist/
    
    # Ejecutar build del servidor
    if npm run build:server; then
        echo "✅ Build del servidor completado"
        if [ -f "dist/index.js" ]; then
            echo "✅ dist/index.js generado"
            echo "   📄 Tamaño: $(ls -lh dist/index.js | awk '{print $5}')"
        else
            echo "❌ dist/index.js no generado"
        fi
    else
        echo "❌ Build del servidor falló"
    fi
else
    echo "❌ esbuild.config.js no encontrado"
fi

show_section "PRUEBA DE BUILD DEL CLIENTE"
echo "🔧 Probando build del cliente:"
if [ -f "vite.config.ts" ]; then
    echo "✅ vite.config.ts encontrado"
    echo "🔍 Ejecutando build del cliente..."
    
    # Limpiar build anterior del cliente
    rm -rf client/dist/
    
    # Ejecutar build del cliente
    if npm run build:client; then
        echo "✅ Build del cliente completado"
        if [ -f "dist/client/index.html" ]; then
            echo "✅ dist/client/index.html generado"
            echo "   📄 Tamaño: $(ls -lh dist/client/index.html | awk '{print $5}')"
        else
            echo "❌ dist/client/index.html no generado"
        fi
    else
        echo "❌ Build del cliente falló"
    fi
else
    echo "❌ vite.config.ts no encontrado"
fi

show_section "VERIFICACIÓN FINAL DEL BUILD"
echo "🔍 Verificando resultados del build:"
if [ -d "dist" ]; then
    echo "✅ Directorio dist existe"
    echo "📁 Contenido de dist:"
    ls -la dist/
    
    if [ -d "dist/client" ]; then
        echo "✅ Directorio dist/client existe"
        echo "📁 Contenido de dist/client:"
        ls -la dist/client/
    else
        echo "❌ Directorio dist/client no existe"
    fi
else
    echo "❌ Directorio dist no existe"
fi

show_section "VERIFICACIÓN DE DEPENDENCIAS DE PRODUCCIÓN"
echo "📦 Verificando dependencias de producción:"
if [ -f "package.json" ]; then
    echo "📦 Dependencias de producción:"
    node -p "Object.keys(require('./package.json').dependencies || {}).join('\n')" | head -10
    
    echo ""
    echo "📦 Dependencias de desarrollo:"
    node -p "Object.keys(require('./package.json').devDependencies || {}).join('\n')" | head -10
fi

show_section "RECOMENDACIONES"
echo "🔧 Recomendaciones basadas en la verificación:"

# Verificar si el build fue exitoso
if [ ! -f "dist/index.js" ]; then
    echo "❌ CRÍTICO: El build del servidor falló"
    echo "   💡 Solución: Revisar errores en esbuild.config.js"
fi

if [ ! -f "dist/client/index.html" ]; then
    echo "❌ CRÍTICO: El build del cliente falló"
    echo "   💡 Solución: Revisar errores en vite.config.ts"
fi

# Verificar dependencias opcionales de esbuild
if [ ! -d "node_modules/@esbuild" ]; then
    echo "⚠️  ADVERTENCIA: Dependencias opcionales de esbuild no instaladas"
    echo "   💡 Solución: Ejecutar 'npm install --include=optional'"
fi

echo ""
echo "✅ === VERIFICACIÓN DEL BUILD COMPLETADA ==="
echo "📅 Timestamp final: $(date)" 