# Script para iniciar backend em modo APK - BolaoVip
# Execute: .\start-backend-apk.ps1

Write-Host "🚀 Iniciando Backend BolaoVip para APK..." -ForegroundColor Green
Write-Host ""

# Verificar se MySQL está rodando
Write-Host "🔍 Verificando MySQL..." -ForegroundColor Yellow
$mysqlProcess = Get-Process mysqld -ErrorAction SilentlyContinue

if ($null -eq $mysqlProcess) {
    Write-Host "⚠️  MySQL não está rodando!" -ForegroundColor Red
    Write-Host "   Inicie o MySQL primeiro (XAMPP, WAMP, ou serviço MySQL)"
    Write-Host ""
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne 's') {
        exit 1
    }
} else {
    Write-Host "✅ MySQL rodando" -ForegroundColor Green
}

Write-Host ""

# Obter IP da máquina
Write-Host "🌐 Detectando IP da máquina..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Ethernet*'} | Select-Object -First 1).IPAddress

Write-Host "   IP detectado: $ip" -ForegroundColor Cyan
Write-Host "   IP configurado no .env: 192.168.1.23" -ForegroundColor Cyan
Write-Host ""

if ($ip -ne "192.168.1.23") {
    Write-Host "⚠️  ATENÇÃO: IP atual ($ip) diferente do configurado!" -ForegroundColor Yellow
    Write-Host "   Você pode precisar atualizar:" -ForegroundColor Yellow
    Write-Host "   1. backend\.env (IP_HOST_DEV)" -ForegroundColor Yellow
    Write-Host "   2. frontend\bolao-vip\src\config.js (LOCAL_API)" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar porta 3001
Write-Host "🔍 Verificando porta 3001..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($null -ne $port3001) {
    Write-Host "⚠️  Porta 3001 já está em uso!" -ForegroundColor Red
    Write-Host "   Encerrando processo anterior..."
    $processId = $port3001.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Processo anterior encerrado" -ForegroundColor Green
} else {
    Write-Host "✅ Porta 3001 disponível" -ForegroundColor Green
}

Write-Host ""
Write-Host "📡 Configuração de Rede:" -ForegroundColor Cyan
Write-Host "   Backend: http://192.168.1.23:3001" -ForegroundColor White
Write-Host "   Banco: localhost:3306 (bolaovip)" -ForegroundColor White
Write-Host ""
Write-Host "📱 No celular, acesse:" -ForegroundColor Cyan
Write-Host "   http://192.168.1.23:3001 (deve estar na mesma WiFi)" -ForegroundColor White
Write-Host ""

# Iniciar backend
Write-Host "🟢 Iniciando servidor backend..." -ForegroundColor Green
Write-Host "   Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

cd C:\BolaoVIP\backend
node server.js
