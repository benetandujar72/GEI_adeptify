# Guía de Instalación Local - GEI_adeptify

Esta guía te ayudará a configurar el entorno de desarrollo completo para el proyecto GEI_adeptify en tu PC local.

## 📋 Requisitos Previos

- Windows 10/11
- PowerShell (ejecutar como administrador)
- Conexión a internet
- Al menos 8GB de RAM disponible
- 20GB de espacio libre en disco

## 🚀 Instalación Automática (Recomendada)

### Opción 1: Instalación Completa
```powershell
# Ejecutar PowerShell como administrador
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\setup-development-environment.ps1
```

### Opción 2: Instalación por Partes
```powershell
# Solo dependencias del sistema
.\scripts\install-dependencies.ps1

# Solo configuración de bases de datos
.\scripts\setup-local-env.ps1
docker-compose -f docker-compose.local.yml up -d

# Solo dependencias de Python
.\scripts\install-python-deps.ps1
```

## 🔧 Instalación Manual

### 1. Instalar Chocolatey (Gestor de Paquetes)
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Instalar Dependencias Principales
```powershell
# Node.js
choco install nodejs -y

# Python
choco install python -y

# Docker Desktop
choco install docker-desktop -y

# Git
choco install git -y

# VS Code
choco install vscode -y
```

### 3. Instalar Bases de Datos
```powershell
# PostgreSQL
choco install postgresql -y

# MongoDB
choco install mongodb -y

# SQLite
choco install sqlite -y

# Redis
choco install redis-64 -y
```

## 🗄️ Configuración de Bases de Datos

### Usando Docker Compose (Recomendado)
```powershell
# Iniciar servicios
docker-compose -f docker-compose.local.yml up -d

# Verificar servicios
docker ps
```

### Configuración Manual
Si prefieres instalar las bases de datos nativamente:

#### PostgreSQL
```powershell
# Iniciar servicio
net start postgresql-x64-15

# Crear base de datos
psql -U postgres -c "CREATE DATABASE gei_adeptify;"
psql -U postgres -c "CREATE USER adeptify_user WITH PASSWORD 'adeptify_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE gei_adeptify TO adeptify_user;"
```

#### MongoDB
```powershell
# Crear directorio de datos
mkdir C:\data\db

# Iniciar MongoDB
mongod --dbpath C:\data\db
```

## 📦 Instalación de Dependencias del Proyecto

### Node.js Dependencias
```powershell
# Cliente React
cd client
npm install

# Servidor
cd ../server
npm install

# Gateway
cd ../gateway
npm install

# Microservicios
cd ../microservices
Get-ChildItem -Directory | ForEach-Object {
    if (Test-Path "$($_.FullName)/package.json") {
        cd $_.FullName
        npm install
        cd ../..
    }
}
```

### Python Dependencias
```powershell
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Dependencias específicas para AI
pip install numpy pandas scikit-learn tensorflow torch transformers
pip install openai anthropic langchain fastapi uvicorn
```

## ⚙️ Configuración de Variables de Entorno

### Archivos de Configuración
Los scripts crean automáticamente los siguientes archivos:

- `client/.env.local` - Configuración del cliente React
- `server/.env` - Configuración del servidor
- `microservices/.env` - Configuración de microservicios

### Variables Importantes a Configurar
```bash
# Autenticación
JWT_SECRET=tu_clave_secreta_aqui
AUTH0_DOMAIN=adeptify.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret

# APIs Externas
OPENAI_API_KEY=tu_openai_key
ANTHROPIC_API_KEY=tu_anthropic_key
STRIPE_SECRET_KEY=tu_stripe_key

# Bases de Datos
POSTGRES_URL=postgresql://adeptify_user:adeptify_password@localhost:5432/gei_adeptify
MONGODB_URI=mongodb://adeptify_admin:adeptify_password@localhost:27017/gei_adeptify
REDIS_URL=redis://localhost:6379
```

## 🚀 Iniciar el Proyecto

### 1. Iniciar Bases de Datos
```powershell
docker-compose -f docker-compose.local.yml up -d
```

### 2. Iniciar Servidor
```powershell
cd server
npm run dev
```

### 3. Iniciar Cliente
```powershell
cd client
npm start
```

### 4. Iniciar Microservicios (Opcional)
```powershell
# AI Services
cd microservices/ai-services
npm run dev

# Analytics Service
cd ../analytics-service
npm run dev

# Communication Service
cd ../communication-service
npm run dev
```

## 🌐 URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Aplicación | http://localhost:3000 | - |
| API | http://localhost:3001 | - |
| pgAdmin | http://localhost:5050 | admin@adeptify.es / admin123 |
| MongoDB Express | http://localhost:8081 | admin / admin123 |
| Gateway | http://localhost:3000 | - |

## 🔍 Verificación de Instalación

### Comandos de Verificación
```powershell
# Verificar Node.js
node --version
npm --version

# Verificar Python
python --version
pip --version

# Verificar Docker
docker --version
docker-compose --version

# Verificar servicios
docker ps
```

### Script de Verificación Automática
```powershell
.\scripts\setup-development-environment.ps1 -SkipDependencies -SkipDatabases -SkipPython -SkipNode
```

## 🛠️ Solución de Problemas

### Problemas Comunes

#### 1. Error de Permisos
```powershell
# Ejecutar PowerShell como administrador
Set-ExecutionPolicy Bypass -Scope Process -Force
```

#### 2. Puerto en Uso
```powershell
# Verificar puertos en uso
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# Terminar proceso
taskkill /PID <PID> /F
```

#### 3. Docker no Inicia
```powershell
# Reiniciar Docker Desktop
Restart-Service -Name "com.docker.service"
```

#### 4. Problemas con Bases de Datos
```powershell
# Reiniciar servicios
docker-compose -f docker-compose.local.yml restart

# Ver logs
docker-compose -f docker-compose.local.yml logs -f
```

### Limpieza del Sistema
```powershell
# Limpiar Docker
docker system prune -a

# Limpiar npm cache
npm cache clean --force

# Limpiar pip cache
pip cache purge
```

## 📚 Recursos Adicionales

- [Documentación de Node.js](https://nodejs.org/docs/)
- [Documentación de Python](https://docs.python.org/)
- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Documentación de MongoDB](https://docs.mongodb.com/)

## 🤝 Soporte

Si encuentras problemas durante la instalación:

1. Revisa la sección de solución de problemas
2. Verifica que todos los requisitos previos estén cumplidos
3. Ejecuta los scripts de verificación
4. Consulta los logs de error
5. Contacta al equipo de desarrollo

## 📝 Notas Importantes

- **Siempre ejecuta PowerShell como administrador** para la instalación
- **Reinicia tu terminal** después de instalar las dependencias
- **Configura las variables de entorno** antes de iniciar el proyecto
- **Mantén Docker Desktop ejecutándose** para las bases de datos
- **Usa el entorno virtual de Python** para evitar conflictos de dependencias

---

¡Feliz desarrollo! 🎉 