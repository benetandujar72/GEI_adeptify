@echo off
REM Script de backup per al Sistema d'Avaluació Automàtica - Adeptify.es
REM Autor: Equip de Desenvolupament Adeptify.es

setlocal enabledelayedexpansion

REM Configuració
set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=n8n_backup_%TIMESTAMP%

echo [INFO] Iniciant procés de backup del Sistema d'Avaluació Automàtica - Adeptify.es

REM Verificar que el directori de backup existeix
if not exist "%BACKUP_DIR%" (
    echo [INFO] Creant directori de backup: %BACKUP_DIR%
    mkdir "%BACKUP_DIR%"
)

REM Backup de la base de dades PostgreSQL
echo [INFO] Iniciant backup de la base de dades...
docker-compose exec -T postgres pg_dump -U n8n -d n8n > "%BACKUP_DIR%\%BACKUP_NAME%_database.sql"

if errorlevel 1 (
    echo [ERROR] Error en el backup de la base de dades
    pause
    exit /b 1
) else (
    echo [INFO] Backup de la base de dades completat: %BACKUP_NAME%_database.sql
)

REM Backup dels workflows
echo [INFO] Iniciant backup dels workflows...
if exist "workflows" (
    powershell -Command "Compress-Archive -Path 'workflows\*' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%_workflows.zip' -Force"
    echo [INFO] Backup dels workflows completat: %BACKUP_NAME%_workflows.zip
) else (
    echo [WARNING] Directori workflows no trobat, saltant backup de workflows
)

REM Backup de la configuració
echo [INFO] Iniciant backup de la configuració...
if exist "config" (
    powershell -Command "Compress-Archive -Path 'config\*' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%_config.zip' -Force"
    echo [INFO] Backup de la configuració completat: %BACKUP_NAME%_config.zip
) else (
    echo [WARNING] Directori config no trobat, saltant backup de configuració
)

REM Backup dels logs
echo [INFO] Iniciant backup dels logs...
if exist "logs" (
    powershell -Command "Compress-Archive -Path 'logs\*' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%_logs.zip' -Force"
    echo [INFO] Backup dels logs completat: %BACKUP_NAME%_logs.zip
) else (
    echo [WARNING] Directori logs no trobat, saltant backup de logs
)

REM Crear fitxer de metadades del backup
echo [INFO] Creant metadades del backup...
(
echo {
echo     "backup_name": "%BACKUP_NAME%",
echo     "timestamp": "%date% %time%",
echo     "version": "1.0",
echo     "components": {
echo         "database": true,
echo         "workflows": true,
echo         "config": true,
echo         "logs": true
echo     },
echo     "system_info": {
echo         "hostname": "%COMPUTERNAME%",
echo         "docker_version": "check manually",
echo         "docker_compose_version": "check manually"
echo     }
echo }
) > "%BACKUP_DIR%\%BACKUP_NAME%_metadata.json"

echo [INFO] Metadades del backup creades: %BACKUP_NAME%_metadata.json

REM Netejar backups antics (més de 7 dies)
echo [INFO] Netejant backups antics (més de 7 dies)...
forfiles /p "%BACKUP_DIR%" /s /m n8n_backup_* /d -7 /c "cmd /c del @path" 2>nul
echo [INFO] Neteja de backups antics completada

REM Verificar integritat del backup
echo [INFO] Verificant integritat del backup...
if exist "%BACKUP_DIR%\%BACKUP_NAME%_database.sql" (
    echo [INFO] ✓ Backup de la base de dades verificat
) else (
    echo [ERROR] ✗ Backup de la base de dades no trobat
    pause
    exit /b 1
)

if exist "%BACKUP_DIR%\%BACKUP_NAME%_workflows.zip" (
    echo [INFO] ✓ Backup dels workflows verificat
)

if exist "%BACKUP_DIR%\%BACKUP_NAME%_config.zip" (
    echo [INFO] ✓ Backup de la configuració verificat
)

if exist "%BACKUP_DIR%\%BACKUP_NAME%_metadata.json" (
    echo [INFO] ✓ Metadades del backup verificades
)

REM Mostrar resum del backup
echo [INFO] Resum del backup completat:
echo ==================================
echo Backup Name: %BACKUP_NAME%
echo Timestamp: %date% %time%
echo Location: %BACKUP_DIR%
echo.
echo Fitxers creats:
dir "%BACKUP_DIR%\%BACKUP_NAME%*" /b
echo.
echo Mida total:
for %%f in ("%BACKUP_DIR%\%BACKUP_NAME%*") do echo %%~zf bytes - %%~nxf
echo ==================================

echo [INFO] Backup completat amb èxit!
pause
