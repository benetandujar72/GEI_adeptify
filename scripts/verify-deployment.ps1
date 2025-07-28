#!/bin/bash

echo "🔍 Verificando configuración de despliegue..."

# Verificar archivos críticos
files=(
    "server/package.json"
    "server/src/index.ts"
    "server/esbuild.config.js"
    "server/Dockerfile"
    "server/start.sh"
    ".env.production"
    "render.yaml"
)

for file in "\"; do
    if [ -f "" ]; then
        echo "✅  exists"
    else
        echo "❌  missing"
        exit 1
    fi
done

# Verificar configuración de package.json
if grep -q '"build"' server/package.json; then
    echo "✅ Build script found in package.json"
else
    echo "❌ Build script missing in package.json"
    exit 1
fi

# Verificar configuración de start script
if grep -q 'start.sh' render.yaml; then
    echo "✅ Start script configured in render.yaml"
else
    echo "❌ Start script not configured in render.yaml"
    exit 1
fi

echo "✅ All verifications passed!"
echo "🚀 Ready for deployment to Render"
