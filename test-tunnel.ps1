# Test tunnel connection
Write-Host "Iniciando tunnel..." -ForegroundColor Cyan
ssh -N -i "$HOME\.ssh\id_rsa_douttoroculos" -L 3307:10.100.48.197:3306 -p 3022 254240-8187@gate.paas.saveincloud.net.br &
$tunnelPID = $?

Start-Sleep 3

Write-Host "Testando porta 3307..." -ForegroundColor Yellow
$socket = New-Object System.Net.Sockets.TcpClient
try {
    $socket.Connect("127.0.0.1", 3307)
    Write-Host "SUCESSO: Porta 3307 respondeu!" -ForegroundColor Green
    $socket.Close()
}
catch {
    Write-Host "FALHA: Nao conseguiu conectar" -ForegroundColor Red
}

Write-Host "Tunnel rodando em background. Pressione CTRL+C para parar."
