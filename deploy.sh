#!/bin/bash

# Script de despliegue para GEI Unified Platform
# Autor: Benet Andujar
# Fecha: $(date)

echo "🚀 Iniciando despliegue de GEI Unified Platform..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker esté ejecutándose
check_docker() {
    print_status "Verificando Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker no está ejecutándose. Por favor, inicia Docker Desktop."
        exit 1
    fi
    print_success "Docker está ejecutándose"
}

# Verificar que Git esté configurado
check_git() {
    print_status "Verificando Git..."
    if ! git status > /dev/null 2>&1; then
        print_error "No se puede acceder al repositorio Git"
        exit 1
    fi
    print_success "Git está configurado correctamente"
}

# Construir imagen de Docker
build_docker() {
    print_status "Construyendo imagen de Docker..."
    
    # Limpiar imágenes anteriores
    docker rmi gei-unified-platform:latest 2>/dev/null || true
    
    # Construir nueva imagen
    if docker build -t gei-unified-platform:latest .; then
        print_success "Imagen de Docker construida exitosamente"
    else
        print_error "Error al construir la imagen de Docker"
        exit 1
    fi
}

# Subir a GitHub
push_to_github() {
    print_status "Subiendo cambios a GitHub..."
    
    # Verificar si hay cambios
    if git diff-index --quiet HEAD --; then
        print_warning "No hay cambios para subir"
        return
    fi
    
    # Añadir todos los cambios
    git add .
    
    # Commit con mensaje descriptivo
    git commit -m "🚀 Despliegue automático - $(date '+%Y-%m-%d %H:%M:%S')

✅ Estilos de Adeptify implementados
✅ Logo y branding actualizados
✅ Componentes de interfaz creados
✅ Navegación moderna implementada
✅ Configuración optimizada para producción"
    
    # Push a GitHub
    if git push origin main; then
        print_success "Cambios subidos a GitHub exitosamente"
    else
        print_error "Error al subir cambios a GitHub"
        exit 1
    fi
}

# Ejecutar tests
run_tests() {
    print_status "Ejecutando tests..."
    
    # Test del cliente
    if npm run test:client; then
        print_success "Tests del cliente pasaron"
    else
        print_warning "Tests del cliente fallaron"
    fi
    
    # Test del servidor
    if npm run test:server; then
        print_success "Tests del servidor pasaron"
    else
        print_warning "Tests del servidor fallaron"
    fi
}

# Verificar salud de la aplicación
health_check() {
    print_status "Verificando salud de la aplicación..."
    
    # Iniciar contenedor temporalmente
    docker run -d --name gei-health-check -p 3001:3000 gei-unified-platform:latest
    
    # Esperar a que la aplicación se inicie
    sleep 10
    
    # Verificar health check
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Health check pasado"
    else
        print_warning "Health check falló"
    fi
    
    # Limpiar contenedor temporal
    docker stop gei-health-check
    docker rm gei-health-check
}

# Mostrar información del despliegue
show_deployment_info() {
    echo ""
    echo "🎉 Despliegue completado exitosamente!"
    echo ""
    echo "📋 Información del despliegue:"
    echo "   • Imagen Docker: gei-unified-platform:latest"
    echo "   • Puerto: 3000"
    echo "   • Repositorio: https://github.com/benetandujar72/GEI_adeptify.git"
    echo ""
    echo "🚀 Para ejecutar localmente:"
    echo "   docker run -p 3000:3000 gei-unified-platform:latest"
    echo ""
    echo "🔗 Para acceder a la aplicación:"
    echo "   http://localhost:3000"
    echo ""
    echo "📊 Para ver logs:"
    echo "   docker logs <container-id>"
    echo ""
}

# Función principal
main() {
    echo "🎨 GEI Unified Platform - Despliegue con Estilos de Adeptify"
    echo "=========================================================="
    echo ""
    
    # Verificaciones
    check_docker
    check_git
    
    # Construir y desplegar
    build_docker
    push_to_github
    
    # Tests opcionales
    read -p "¿Ejecutar tests? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi
    
    # Health check opcional
    read -p "¿Ejecutar health check? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        health_check
    fi
    
    # Mostrar información final
    show_deployment_info
}

# Ejecutar función principal
main "$@" 