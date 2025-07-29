#!/bin/sh

# Script de debug para verificar el estado del despliegue paso a paso
echo "🔍 === DEBUG DEL DESPLIEGUE - GEI UNIFIED PLATFORM ==="
echo "📅 Timestamp: $(date)"
echo "🔧 Versión del script: 1.0"

# Función para mostrar secciones
show_section() {
    echo ""
    echo "=========================================="
    echo "🔍 $1"
    echo "=========================================="
}

# Función para verificar archivo
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 - EXISTE"
        echo "   📄 Tamaño: $(ls -lh "$1" | awk '{print $5}')"
        echo "   📅 Modificado: $(ls -la "$1" | awk '{print $6, $7, $8}')"
    else
        echo "❌ $1 - NO EXISTE"
    fi
}

# Función para verificar directorio
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1 - EXISTE"
        echo "   📁 Contenido:"
        ls -la "$1" | head -5
        if [ "$(ls -A "$1" 2>/dev/null)" ]; then
            echo "   📊 Total archivos: $(ls "$1" | wc -l)"
        else
            echo "   ⚠️  Directorio vacío"
        fi
    else
        echo "❌ $1 - NO EXISTE"
    fi
}

show_section "INFORMACIÓN DEL SISTEMA"
echo "🐧 Sistema operativo: $(uname -a)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo "📁 Directorio actual: $(pwd)"
echo "👤 Usuario: $(whoami)"
echo "👥 Grupo: $(id -gn)"

show_section "VARIABLES DE ENTORNO"
echo "🌍 NODE_ENV: $NODE_ENV"
echo "🔌 PORT: $PORT"
echo "🗄️ DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "🔧 Otras variables importantes:"
env | grep -E "(NODE|PORT|DB|DATABASE)" | head -10

show_section "ESTRUCTURA DEL PROYECTO"
echo "📂 Contenido del directorio actual:"
ls -la

show_section "ARCHIVOS DE CONFIGURACIÓN"
check_file "package.json"
check_file "tsconfig.json"
check_file "esbuild.config.js"
check_file "vite.config.ts"
check_file "drizzle.config.ts"

show_section "DIRECTORIOS CRÍTICOS"
check_dir "dist"
check_dir "client"
check_dir "server"
check_dir "shared"
check_dir "scripts"
check_dir "node_modules"

show_section "ARCHIVOS DE BUILD"
check_file "dist/index.js"
check_file "dist/client/index.html"
check_file "client/dist/index.html"

show_section "CONFIGURACIÓN DEL SERVIDOR"
check_file "server/index.ts"
check_file "server/src/index.ts"
check_file "server/package.json"

show_section "CONFIGURACIÓN DEL CLIENTE"
check_file "client/package.json"
check_file "client/vite.config.ts"
check_file "client/index.html"

show_section "DEPENDENCIAS"
if [ -f "package.json" ]; then
    echo "📦 Dependencias principales:"
    node -p "Object.keys(require('./package.json').dependencies || {}).slice(0, 10).join('\n')"
    echo ""
    echo "📦 Dependencias de desarrollo:"
    node -p "Object.keys(require('./package.json').devDependencies || {}).slice(0, 10).join('\n')"
fi

show_section "SCRIPTS DISPONIBLES"
if [ -f "package.json" ]; then
    echo "📜 Scripts en package.json:"
    node -p "Object.keys(require('./package.json').scripts || {}).join('\n')"
fi

show_section "VERIFICACIÓN DE ESBUILD"
if command -v node >/dev/null 2>&1; then
    echo "🔧 Verificando esbuild:"
    node -e "
        try {
            const esbuild = require('esbuild');
            console.log('✅ esbuild disponible');
            console.log('📦 Versión:', esbuild.version);
        } catch (e) {
            console.log('❌ esbuild no disponible:', e.message);
        }
    " 2>/dev/null || echo "❌ Error verificando esbuild"
fi

show_section "VERIFICACIÓN DE VITE"
if command -v node >/dev/null 2>&1; then
    echo "🔧 Verificando Vite:"
    node -e "
        try {
            const { version } = require('vite/package.json');
            console.log('✅ Vite disponible');
            console.log('📦 Versión:', version);
        } catch (e) {
            console.log('❌ Vite no disponible:', e.message);
        }
    " 2>/dev/null || echo "❌ Error verificando Vite"
fi

show_section "PERMISOS DE ARCHIVOS"
echo "🔐 Permisos de archivos críticos:"
ls -la dist/index.js 2>/dev/null || echo "❌ dist/index.js no encontrado"
ls -la scripts/start-production-optimized.sh 2>/dev/null || echo "❌ script de inicio no encontrado"

show_section "CONECTIVIDAD"
echo "🌐 Verificando conectividad local:"
if command -v curl >/dev/null 2>&1; then
    echo "✅ curl disponible"
    echo "🔍 Probando conectividad local:"
    curl -s --max-time 5 http://localhost:$PORT/health 2>/dev/null && echo "✅ Servidor respondiendo" || echo "❌ Servidor no responde"
else
    echo "⚠️  curl no disponible"
fi

show_section "LOGS DEL SISTEMA"
echo "📋 Últimos logs del sistema:"
if [ -f "/tmp/app.log" ]; then
    echo "📄 Logs de la aplicación:"
    tail -20 /tmp/app.log
else
    echo "⚠️  No se encontraron logs de la aplicación"
fi

show_section "ESTADO DE PROCESOS"
echo "🔄 Procesos Node.js en ejecución:"
ps aux | grep node | grep -v grep || echo "❌ No hay procesos Node.js en ejecución"

show_section "USO DE RECURSOS"
echo "💾 Uso de memoria:"
free -h 2>/dev/null || echo "⚠️  Comando free no disponible"
echo ""
echo "💿 Uso de disco:"
df -h . 2>/dev/null || echo "⚠️  Comando df no disponible"

show_section "RECOMENDACIONES"
echo "🔧 Recomendaciones basadas en la verificación:"

# Verificar si faltan archivos críticos
if [ ! -f "dist/index.js" ]; then
    echo "❌ CRÍTICO: Falta el archivo de build dist/index.js"
    echo "   💡 Solución: Ejecutar 'npm run build'"
fi

if [ ! -f "package.json" ]; then
    echo "❌ CRÍTICO: Falta package.json"
    echo "   💡 Solución: Verificar que el archivo se copió correctamente"
fi

if [ ! -d "node_modules" ]; then
    echo "❌ CRÍTICO: Falta node_modules"
    echo "   💡 Solución: Ejecutar 'npm install'"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  ADVERTENCIA: DATABASE_URL no configurada"
    echo "   💡 Solución: Configurar la variable de entorno DATABASE_URL"
fi

echo ""
echo "✅ === DEBUG COMPLETADO ==="
echo "📅 Timestamp final: $(date)" 