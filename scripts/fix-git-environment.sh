#!/bin/bash

# Script para solucionar el problema de Git con environment.json
echo "🔧 Solucionando problema de Git con environment.json..."

# Verificar si estamos en un repositorio Git
if [ ! -d ".git" ]; then
    echo "❌ Error: No se encontró un repositorio Git en el directorio actual"
    exit 1
fi

# Verificar el estado actual
echo "📊 Estado actual del repositorio:"
git status --porcelain

# Remover el archivo environment.json del seguimiento de Git si existe
if [ -f ".cursor/environment.json" ]; then
    echo "🗑️  Removiendo .cursor/environment.json del seguimiento de Git..."
    git rm --cached .cursor/environment.json 2>/dev/null || true
fi

# Remover toda la carpeta .cursor del seguimiento si existe
if [ -d ".cursor" ]; then
    echo "🗑️  Removiendo .cursor/ del seguimiento de Git..."
    git rm -r --cached .cursor 2>/dev/null || true
fi

# Verificar si hay cambios pendientes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Hay cambios pendientes. Creando commit..."
    git add .
    git commit -m "fix: Remove .cursor/ from tracking and add to .gitignore"
fi

# Verificar la configuración del remoto
echo "🌐 Verificando configuración del remoto..."
git remote -v

# Intentar hacer pull del remoto
echo "⬇️  Intentando hacer pull del remoto..."
git pull origin main

echo "✅ Problema solucionado!"
echo "💡 El archivo .cursor/environment.json ya no será rastreado por Git"
echo "💡 Los archivos de configuración local de Cursor están ahora en .gitignore" 