#!/bin/bash

# GEI Unified Platform - Script de Instalación Rápida
# Este script configura automáticamente el entorno de desarrollo

set -e

echo "🚀 GEI Unified Platform - Instalación Automática"
echo "=================================================="

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

# Verificar si Node.js está instalado
check_node() {
    print_status "Verificando Node.js..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado. Por favor, instala Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js versión 18+ es requerida. Versión actual: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) detectado"
}

# Verificar si Docker está instalado
check_docker() {
    print_status "Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        print_warning "Docker no está instalado. Algunas funcionalidades pueden no estar disponibles"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        print_warning "Docker no está ejecutándose. Inicia Docker Desktop"
        return 1
    fi
    
    print_success "Docker $(docker --version) detectado"
    return 0
}

# Instalar dependencias
install_dependencies() {
    print_status "Instalando dependencias..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencias instaladas correctamente"
}

# Configurar variables de entorno
setup_environment() {
    print_status "Configurando variables de entorno..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Archivo .env creado desde env.example"
        else
            print_warning "No se encontró env.example. Crea manualmente el archivo .env"
        fi
    else
        print_warning "El archivo .env ya existe. Verifica la configuración"
    fi
}

# Inicializar base de datos
init_database() {
    print_status "Inicializando base de datos..."
    
    if check_docker; then
        print_status "Iniciando servicios con Docker..."
        docker-compose up -d postgres redis
        
        # Esperar a que PostgreSQL esté listo
        print_status "Esperando a que PostgreSQL esté listo..."
        sleep 10
        
        # Ejecutar migraciones
        print_status "Ejecutando migraciones..."
        npm run db:push
        
        print_success "Base de datos inicializada correctamente"
    else
        print_warning "Docker no está disponible. Configura manualmente la base de datos"
    fi
}

# Construir la aplicación
build_application() {
    print_status "Construyendo la aplicación..."
    
    npm run build
    
    print_success "Aplicación construida correctamente"
}

# Verificar la instalación
verify_installation() {
    print_status "Verificando la instalación..."
    
    # Verificar archivos críticos
    FILES=("package.json" "tsconfig.json" "tailwind.config.ts" "vite.config.ts")
    for file in "${FILES[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Archivo crítico faltante: $file"
            exit 1
        fi
    done
    
    # Verificar directorios críticos
    DIRS=("client/src" "server" "shared" "scripts")
    for dir in "${DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            print_error "Directorio crítico faltante: $dir"
            exit 1
        fi
    done
    
    print_success "Instalación verificada correctamente"
}

# Mostrar información final
show_final_info() {
    echo ""
    echo "🎉 ¡Instalación completada exitosamente!"
    echo "=================================================="
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Configura las variables de entorno en .env"
    echo "2. Ejecuta: npm run dev"
    echo "3. Abre: http://localhost:3001"
    echo ""
    echo "🐳 Con Docker:"
    echo "1. docker-compose up -d"
    echo "2. Abre: http://localhost:3000"
    echo ""
    echo "📚 Documentación:"
    echo "- README.md para más información"
    echo "- env.example para configuración de variables"
    echo ""
    echo "🚀 ¡Disfruta de GEI Unified Platform!"
}

# Función principal
main() {
    echo "Iniciando instalación automática..."
    echo ""
    
    check_node
    install_dependencies
    setup_environment
    init_database
    build_application
    verify_installation
    show_final_info
}

# Ejecutar función principal
main "$@" 