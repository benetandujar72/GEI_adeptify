# Script para testing de MCP

Write-Host "🧪 Iniciando tests de MCP..." -ForegroundColor Yellow

# Test MCP Orchestrator
Write-Host "
🎯 Testing MCP Orchestrator..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3008/api/mcp/health" -Method GET
    Write-Host "✅ MCP Orchestrator: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ MCP Orchestrator: ERROR" -ForegroundColor Red
}

# Test MCP Servers
$mcpServers = @(
    "academic-data-server",
    "resource-management-server", 
    "communication-server",
    "analytics-server"
)

foreach ($server in $mcpServers) {
    Write-Host "
🔧 Testing $server..." -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3008/api/mcp/$server/tools" -Method GET
        Write-Host "✅ $server: OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ $server: ERROR" -ForegroundColor Red
    }
}

# Test AI Services
$aiServices = @(
    "personalization-engine:3012",
    "ml-pipeline:3013"
)

foreach ($service in $aiServices) {
    $name, $port = $service.Split(":")
    Write-Host "
🤖 Testing $name..." -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/health" -Method GET
        Write-Host "✅ $name: OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ $name: ERROR" -ForegroundColor Red
    }
}

Write-Host "
🏁 Tests completados" -ForegroundColor Green
