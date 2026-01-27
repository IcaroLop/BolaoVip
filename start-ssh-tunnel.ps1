# Script: Inicia SSH Tunnel para banco MySQL em produção (SaveInCloud)
# Descrição: Cria túnel localhost:3307 -> 10.100.48.197:3306

Write-Host "Iniciando SSH Tunnel para banco de produção..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Local:  127.0.0.1:3307" -ForegroundColor Green
Write-Host "Remoto: 10.100.48.197:3306 (MySQL Interno)" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "MANTENHA ESTA JANELA ABERTA enquanto desenvolve" -ForegroundColor Yellow
Write-Host ""

# Comando SSH com tunnel (sem shell remoto)
ssh -N -T -o ExitOnForwardFailure=yes `
    -i "$HOME\.ssh\id_rsa_douttoroculos" `
    -L 3307:10.100.48.197:3306 `
    -p 3022 `
    254240-8187@gate.paas.saveincloud.net.br

Write-Host ""
Write-Host "Tunnel encerrado." -ForegroundColor Red
