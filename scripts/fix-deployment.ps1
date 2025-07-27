# Script de PowerShell para solucionar problemas de despliegue
Write-Host "🔧 Solucionando problemas de despliegue..." -ForegroundColor Green

# Verificar archivos críticos
Write-Host "`n📋 Verificando archivos críticos..." -ForegroundColor Yellow
$criticalFiles = @(
    "package.json",
    "server/index.ts",
    "client/index.html",
    "docker-compose.yml",
    "Dockerfile"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $file NO existe" -ForegroundColor Red
    }
}

# Verificar estructura de directorios
Write-Host "`n📁 Verificando estructura de directorios..." -ForegroundColor Yellow
$criticalDirs = @(
    "server",
    "client",
    "shared",
    "scripts"
)

foreach ($dir in $criticalDirs) {
    if (Test-Path $dir -PathType Container) {
        Write-Host "✅ $dir/ existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $dir/ NO existe" -ForegroundColor Red
    }
}

# Verificar variables de entorno
Write-Host "`n🌍 Verificando variables de entorno..." -ForegroundColor Yellow
$requiredEnvVars = @(
    "DATABASE_URL",
    "NODE_ENV",
    "PORT"
)

foreach ($envVar in $requiredEnvVars) {
    if ($env:$envVar) {
        Write-Host "✅ $envVar configurada" -ForegroundColor Green
    } else {
        Write-Host "❌ $envVar NO configurada" -ForegroundColor Red
    }
}

# Verificar build
Write-Host "`n🔨 Verificando build..." -ForegroundColor Yellow
$buildFiles = @(
    "dist/index.js",
    "client/dist"
)

foreach ($file in $buildFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $file NO existe" -ForegroundColor Red
    }
}

# Crear .gitignore si no existe
Write-Host "`n📝 Verificando .gitignore..." -ForegroundColor Yellow
if (-not (Test-Path ".gitignore")) {
    Write-Host "📝 Creando .gitignore..." -ForegroundColor Yellow
    $gitignoreContent = @"
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp

# Database files
*.db
*.sqlite
*.sqlite3

# Docker
.dockerignore

# Render
.render-buildlogs/
"@
    
    $gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "✅ .gitignore creado" -ForegroundColor Green
} else {
    Write-Host "✅ .gitignore ya existe" -ForegroundColor Green
}

# Limpiar archivos temporales
Write-Host "`n🧹 Limpiando archivos temporales..." -ForegroundColor Yellow
$tempFiles = @(
    "npm-debug.log",
    "yarn-error.log",
    "package-lock.json.tmp"
)

foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "🗑️ Eliminado: $file" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ No se pudo eliminar: $file" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🎉 Diagnóstico completado" -ForegroundColor Green 