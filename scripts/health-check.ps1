# Script para verificar salud de los servicios

Write-Host "🔍 Verificando salud de los servicios..." -ForegroundColor Yellow

$Services = @(
    "postgres:5432",
    "redis:6379",
    "mcp-orchestrator:3008",
    "user-service:3001",
    "student-service:3002",
    "course-service:3003",
    "llm-gateway:3004",
    "content-generation:3005",
    "chatbot:3006",
    "predictive-analytics:3007",
    "prometheus:9090",
    "grafana:3000"
)

foreach ($service in $Services) {
    $host, $port = $service.Split(":")
    
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($host, $port).Wait(1000) | Out-Null
        if ($tcp.Connected) {
            Write-Host "✅ $host:$port - OK" -ForegroundColor Green
            $tcp.Close()
        }
        else {
            Write-Host "❌ $host:$port - ERROR" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ $host:$port - ERROR" -ForegroundColor Red
    }
}

Write-Host "🏁 Verificación completada" -ForegroundColor Green
