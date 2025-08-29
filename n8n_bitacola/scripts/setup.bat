@echo off
REM Script d'instal·lació per al Sistema d'Avaluació Automàtica - Adeptify.es
REM Autor: Equip de Desenvolupament Adeptify.es

echo [INFO] Iniciant instal·lació del Sistema d'Avaluació Automàtica - Adeptify.es

REM Verificar que Docker està instal·lat
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no està instal·lat. Si us plau, instal·la Docker primer.
    pause
    exit /b 1
)

REM Verificar que Docker Compose està instal·lat
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose no està instal·lat. Si us plau, instal·la Docker Compose primer.
    pause
    exit /b 1
)

REM Verificar que Docker està executant-se
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no està executant-se. Si us plau, inicia Docker primer.
    pause
    exit /b 1
)

echo [INFO] Tots els prerequisits estan satisfets!

REM Crear directoris necessaris
echo [INFO] Creant directoris necessaris...
if not exist "workflows" mkdir workflows
if not exist "config" mkdir config
if not exist "scripts" mkdir scripts
if not exist "docs" mkdir docs
if not exist "backups" mkdir backups
if not exist "logs" mkdir logs
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "nginx\sites-enabled" mkdir nginx\sites-enabled
if not exist "traefik\letsencrypt" mkdir traefik\letsencrypt

echo [INFO] Directoris creats correctament!

REM Configurar variables d'entorn
echo [INFO] Configurant variables d'entorn...
if not exist ".env" (
    copy "config\n8n.env" ".env"
    echo [WARNING] Fitxer .env creat. Si us plau, edita les variables d'entorn segons les teves necessitats.
) else (
    echo [INFO] Fitxer .env ja existeix.
)

REM Iniciar serveis
echo [INFO] Iniciant serveis...
docker-compose up -d

if errorlevel 1 (
    echo [ERROR] Error en iniciar els serveis. Revisa els logs amb 'docker-compose logs'
    pause
    exit /b 1
)

echo [INFO] Serveis iniciats correctament!
echo [INFO] n8n està disponible a: https://n8n.adeptify.es
echo [INFO] Credencials per defecte: admin / adeptify2024

REM Esperar un moment per a que els serveis s'iniciïn
echo [INFO] Esperant que els serveis s'iniciïn...
timeout /t 10 /nobreak >nul

REM Verificar estat dels serveis
echo [INFO] Verificant estat dels serveis...
docker-compose ps

echo [INFO] Instal·lació completada amb èxit!
echo.
echo Pròxims passos:
echo 1. Edita el fitxer .env amb les teves credencials
echo 2. Accedeix a https://n8n.adeptify.es
echo 3. Importa els workflows des de la carpeta workflows/
echo 4. Configura les credencials d'API per a IA
echo.
pause
