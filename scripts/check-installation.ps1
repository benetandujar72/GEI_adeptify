# Script de verificación rápida de instalación
# Ejecutar para verificar que todo esté funcionando correctamente

Write-Host "=== Verificación de Instalación GEI_adeptify ===" -ForegroundColor Green
Write-Host "Fecha: $(Get-Date)" -ForegroundColor Gray

$allChecks = @()

# Verificar herramientas principales
Write-Host "`n🔧 Verificando herramientas principales..." -ForegroundColor Cyan

$mainTools = @(
    @{Name="Node.js"; Command="node --version"; Required=$true},
    @{Name="npm"; Command="npm --version"; Required=$true},
    @{Name="Python"; Command="python --version"; Required=$true},
    @{Name="pip"; Command="pip --version"; Required=$true},
    @{Name="Docker"; Command="docker --version"; Required=$true},
    @{Name="Docker Compose"; Command="docker-compose --version"; Required=$true},
    @{Name="Git"; Command="git --version"; Required=$false},
    @{Name="VS Code"; Command="code --version"; Required=$false}
)

foreach ($tool in $mainTools) {
    try {
        $version = Invoke-Expression $tool.Command 2>$null
        if ($version -and $version -notlike "*error*") {
            Write-Host "✓ $($tool.Name): $version" -ForegroundColor Green
            $allChecks += @{Name=$tool.Name; Status="OK"; Version=$version}
        } else {
            Write-Host "✗ $($tool.Name): No encontrado" -ForegroundColor Red
            if ($tool.Required) {
                $allChecks += @{Name=$tool.Name; Status="ERROR"; Version="No encontrado"}
            } else {
                $allChecks += @{Name=$tool.Name; Status="WARNING"; Version="No encontrado"}
            }
        }
    } catch {
        Write-Host "✗ $($tool.Name): Error" -ForegroundColor Red
        if ($tool.Required) {
            $allChecks += @{Name=$tool.Name; Status="ERROR"; Version="Error"}
        } else {
            $allChecks += @{Name=$tool.Name; Status="WARNING"; Version="Error"}
        }
    }
}

# Verificar servicios de Docker
Write-Host "`n🐳 Verificando servicios de Docker..." -ForegroundColor Cyan

$dockerServices = @(
    @{Name="PostgreSQL"; Container="gei_postgres"; Port="5432"},
    @{Name="MongoDB"; Container="gei_mongodb"; Port="27017"},
    @{Name="Redis"; Container="gei_redis"; Port="6379"},
    @{Name="pgAdmin"; Container="gei_pgadmin"; Port="5050"},
    @{Name="MongoDB Express"; Container="gei_mongo_express"; Port="8081"}
)

foreach ($service in $dockerServices) {
    try {
        $status = docker ps --filter "name=$($service.Container)" --format "{{.Status}}" 2>$null
        if ($status -and $status -like "*Up*") {
            Write-Host "✓ $($service.Name): Funcionando (Puerto $($service.Port))" -ForegroundColor Green
            $allChecks += @{Name=$service.Name; Status="OK"; Version="Puerto $($service.Port)"}
        } else {
            Write-Host "✗ $($service.Name): No está funcionando" -ForegroundColor Red
            $allChecks += @{Name=$service.Name; Status="ERROR"; Version="No funcionando"}
        }
    } catch {
        Write-Host "✗ $($service.Name): Error al verificar" -ForegroundColor Red
        $allChecks += @{Name=$service.Name; Status="ERROR"; Version="Error"}
    }
}

# Verificar archivos de configuración
Write-Host "`n📁 Verificando archivos de configuración..." -ForegroundColor Cyan

$configFiles = @(
    @{Name="Client .env.local"; Path="client/.env.local"; Required=$true},
    @{Name="Server .env"; Path="server/.env"; Required=$true},
    @{Name="Microservices .env"; Path="microservices/.env"; Required=$false},
    @{Name="Docker Compose Local"; Path="docker-compose.local.yml"; Required=$true}
)

foreach ($file in $configFiles) {
    if (Test-Path $file.Path) {
        Write-Host "✓ $($file.Name): Existe" -ForegroundColor Green
        $allChecks += @{Name=$file.Name; Status="OK"; Version="Existe"}
    } else {
        Write-Host "✗ $($file.Name): No existe" -ForegroundColor Red
        if ($file.Required) {
            $allChecks += @{Name=$file.Name; Status="ERROR"; Version="No existe"}
        } else {
            $allChecks += @{Name=$file.Name; Status="WARNING"; Version="No existe"}
        }
    }
}

# Verificar directorios del proyecto
Write-Host "`n📂 Verificando estructura del proyecto..." -ForegroundColor Cyan

$directories = @(
    @{Name="Client"; Path="client"; Required=$true},
    @{Name="Server"; Path="server"; Required=$true},
    @{Name="Gateway"; Path="gateway"; Required=$true},
    @{Name="Microservices"; Path="microservices"; Required=$true},
    @{Name="Database"; Path="database"; Required=$true},
    @{Name="Scripts"; Path="scripts"; Required=$true}
)

foreach ($dir in $directories) {
    if (Test-Path $dir.Path) {
        Write-Host "✓ $($dir.Name): Existe" -ForegroundColor Green
        $allChecks += @{Name=$dir.Name; Status="OK"; Version="Existe"}
    } else {
        Write-Host "✗ $($dir.Name): No existe" -ForegroundColor Red
        if ($dir.Required) {
            $allChecks += @{Name=$dir.Name; Status="ERROR"; Version="No existe"}
        } else {
            $allChecks += @{Name=$dir.Name; Status="WARNING"; Version="No existe"}
        }
    }
}

# Verificar puertos disponibles
Write-Host "`n🔌 Verificando puertos disponibles..." -ForegroundColor Cyan

$ports = @(
    @{Port="3000"; Service="Cliente React"; Required=$true},
    @{Port="3001"; Service="Servidor API"; Required=$true},
    @{Port="5432"; Service="PostgreSQL"; Required=$true},
    @{Port="27017"; Service="MongoDB"; Required=$true},
    @{Port="6379"; Service="Redis"; Required=$true}
)

foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port.Port -InformationLevel Quiet 2>$null
        if ($connection) {
            Write-Host "✓ Puerto $($port.Port) ($($port.Service)): En uso" -ForegroundColor Green
            $allChecks += @{Name="Puerto $($port.Port)"; Status="OK"; Version=$port.Service}
        } else {
            Write-Host "✗ Puerto $($port.Port) ($($port.Service)): Libre" -ForegroundColor Yellow
            if ($port.Required) {
                $allChecks += @{Name="Puerto $($port.Port)"; Status="WARNING"; Version="Libre"}
            } else {
                $allChecks += @{Name="Puerto $($port.Port)"; Status="OK"; Version="Libre"}
            }
        }
    } catch {
        Write-Host "✗ Puerto $($port.Port) ($($port.Service)): Error al verificar" -ForegroundColor Red
        $allChecks += @{Name="Puerto $($port.Port)"; Status="ERROR"; Version="Error"}
    }
}

# Resumen final
Write-Host "`n=== RESUMEN DE VERIFICACIÓN ===" -ForegroundColor Green

$errors = $allChecks | Where-Object { $_.Status -eq "ERROR" }
$warnings = $allChecks | Where-Object { $_.Status -eq "WARNING" }
$oks = $allChecks | Where-Object { $_.Status -eq "OK" }

Write-Host "✅ Correctos: $($oks.Count)" -ForegroundColor Green
Write-Host "⚠️  Advertencias: $($warnings.Count)" -ForegroundColor Yellow
Write-Host "❌ Errores: $($errors.Count)" -ForegroundColor Red

if ($errors.Count -gt 0) {
    Write-Host "`n❌ PROBLEMAS ENCONTRADOS:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $($error.Name): $($error.Version)" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  ADVERTENCIAS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $($warning.Name): $($warning.Version)" -ForegroundColor Yellow
    }
}

# Recomendaciones
Write-Host "`n=== RECOMENDACIONES ===" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "🎉 ¡Todo está funcionando correctamente!" -ForegroundColor Green
    Write-Host "Puedes proceder a iniciar el proyecto:" -ForegroundColor White
    Write-Host "  1. docker-compose -f docker-compose.local.yml up -d" -ForegroundColor Yellow
    Write-Host "  2. cd server && npm run dev" -ForegroundColor Yellow
    Write-Host "  3. cd client && npm start" -ForegroundColor Yellow
} else {
    Write-Host "🔧 Necesitas resolver los problemas antes de continuar:" -ForegroundColor Red
    Write-Host "  1. Ejecuta: .\scripts\setup-development-environment.ps1" -ForegroundColor Yellow
    Write-Host "  2. Verifica que Docker Desktop esté ejecutándose" -ForegroundColor Yellow
    Write-Host "  3. Revisa los logs de error" -ForegroundColor Yellow
}

Write-Host "`n📊 URLs de administración:" -ForegroundColor Cyan
Write-Host "  - pgAdmin: http://localhost:5050" -ForegroundColor White
Write-Host "  - MongoDB Express: http://localhost:8081" -ForegroundColor White
Write-Host "  - Aplicación: http://localhost:3000" -ForegroundColor White

Write-Host "`nFecha de verificación: $(Get-Date)" -ForegroundColor Gray 