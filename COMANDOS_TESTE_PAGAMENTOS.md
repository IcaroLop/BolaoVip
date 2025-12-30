# Comandos Úteis para Teste da Feature "Gerar Pagamentos"

## Iniciar Servidores

### Backend (porta 3001)
```powershell
cd C:\BolaoVIP\backend
node server.js
```

### Frontend (porta 3000)
```powershell
cd C:\BolaoVIP\frontend\bolao-vip
npm start
```

## Verificar Status de Rodadas

### Verificar rodada específica
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/ranking/rodada/1/status" | ConvertTo-Json
```

### Buscar todas as rodadas finalizadas
```powershell
for ($i=1; $i -le 38; $i++) {
  $resp = Invoke-RestMethod "http://localhost:3001/ranking/rodada/$i/status" 2>$null
  if ($resp.rodadaFinalizada) {
    Write-Host "Rodada $i - Finalizada: $($resp.rodadaFinalizada), Pagamentos: $($resp.pagamentosGerados)"
  }
}
```

## Gerenciar Processos Node.js

### Listar processos Node rodando
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue
```

### Parar todos os processos Node
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Iniciar backend em background
```powershell
Push-Location "C:\BolaoVIP\backend"
Start-Process node -ArgumentList "server.js" -NoNewWindow
Pop-Location
```

## Testar Endpoints

### GET /ranking/rodada/:rodada/status (público)
```powershell
# Rodada finalizada (deve retornar rodadaFinalizada: true)
Invoke-RestMethod "http://localhost:3001/ranking/rodada/1/status" | ConvertTo-Json

# Rodada em andamento (deve retornar rodadaFinalizada: false)
Invoke-RestMethod "http://localhost:3001/ranking/rodada/17/status" | ConvertTo-Json
```

### POST /ranking/rodada/:rodada/gerar-pagamentos (protegido)

#### Sem token (deve retornar erro 401)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3001/ranking/rodada/1/gerar-pagamentos" -Method POST
} catch {
  $_.ErrorDetails.Message
}
```

#### Com token (substitua SEU_TOKEN_AQUI)
```powershell
$token = "SEU_TOKEN_AQUI"
$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Uri "http://localhost:3001/ranking/rodada/1/gerar-pagamentos" `
  -Method POST `
  -Headers $headers | ConvertTo-Json
```

## Consultas SQL Úteis

### Verificar colunas na tabela rodadas
```sql
DESCRIBE rodadas;
```

### Ver status de todas as rodadas
```sql
SELECT 
  numero,
  pagamentos_gerados,
  pagamentos_gerados_em
FROM rodadas
ORDER BY numero;
```

### Ver rodadas que já tiveram pagamentos gerados
```sql
SELECT 
  numero,
  pagamentos_gerados_em
FROM rodadas
WHERE pagamentos_gerados = 1
ORDER BY numero;
```

### Resetar flag de uma rodada (APENAS DESENVOLVIMENTO!)
```sql
UPDATE rodadas 
SET pagamentos_gerados = 0, 
    pagamentos_gerados_em = NULL 
WHERE numero = 1;
```

### Ver último jogo de uma rodada
```sql
SELECT 
  id,
  time_casa,
  time_fora,
  placar_mandante,
  placar_visitante,
  status,
  data
FROM jogos 
WHERE rodada = 1 
ORDER BY data DESC 
LIMIT 1;
```

### Ver perfis de um usuário
```sql
SELECT 
  u.id,
  u.nome,
  p.nome as perfil
FROM usuarios u
JOIN usuario_perfis up ON u.id = up.usuario_id
JOIN perfis p ON p.id = up.perfil_id
WHERE u.id = 1;
```

### Ver pagamentos pendentes de uma rodada
```sql
SELECT 
  usuario_id,
  tipo,
  valor,
  status,
  rodada,
  created_at
FROM pagamentos
WHERE rodada = 1 
  AND status = 'pendente'
ORDER BY usuario_id;
```

## Simular Cenários de Teste

### Cenário 1: Rodada finalizada SEM pagamentos gerados
```sql
-- 1. Garantir que rodada 1 está finalizada
UPDATE jogos SET status = 'finalizado', placar_mandante = 2, placar_visitante = 1 WHERE rodada = 1;

-- 2. Resetar flag de pagamentos
UPDATE rodadas SET pagamentos_gerados = 0, pagamentos_gerados_em = NULL WHERE numero = 1;

-- 3. Verificar via API
# Invoke-RestMethod "http://localhost:3001/ranking/rodada/1/status" | ConvertTo-Json
# Deve retornar: rodadaFinalizada: true, pagamentosGerados: 0
```

### Cenário 2: Rodada finalizada COM pagamentos gerados
```sql
-- 1. Garantir que rodada 2 está finalizada
UPDATE jogos SET status = 'finalizado', placar_mandante = 1, placar_visitante = 1 WHERE rodada = 2;

-- 2. Setar flag de pagamentos gerados
UPDATE rodadas SET pagamentos_gerados = 1, pagamentos_gerados_em = NOW() WHERE numero = 2;

-- 3. Verificar via API
# Invoke-RestMethod "http://localhost:3001/ranking/rodada/2/status" | ConvertTo-Json
# Deve retornar: rodadaFinalizada: true, pagamentosGerados: 1
```

### Cenário 3: Rodada NÃO finalizada
```sql
-- 1. Garantir que rodada 17 NÃO está finalizada
UPDATE jogos SET status = 'agendado', placar_mandante = NULL, placar_visitante = NULL WHERE rodada = 17;

-- 2. Verificar via API
# Invoke-RestMethod "http://localhost:3001/ranking/rodada/17/status" | ConvertTo-Json
# Deve retornar: rodadaFinalizada: false
```

## Obter Token JWT via Login

### 1. Login via API
```powershell
$loginData = @{
  email = "admin@bolao.com"
  senha = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:3001/auth/login" `
  -Method POST `
  -Body $loginData `
  -ContentType "application/json"

$token = $response.token
Write-Host "Token: $token"
```

### 2. Usar token para gerar pagamentos
```powershell
$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Uri "http://localhost:3001/ranking/rodada/1/gerar-pagamentos" `
  -Method POST `
  -Headers $headers
```

## Verificar Logs

### Backend logs em tempo real
```powershell
# Iniciar backend e ver logs
cd C:\BolaoVIP\backend
node server.js
```

### Frontend logs (console do navegador)
1. Abrir DevTools (F12)
2. Aba Console
3. Procurar por mensagens:
   - "✅ Status da rodada carregado..."
   - "✅ Pagamentos gerados..."
   - Erros em vermelho

## Troubleshooting

### Backend não inicia
```powershell
# Verificar se porta 3001 está ocupada
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

# Liberar porta (matar processo)
$processId = (Get-NetTCPConnection -LocalPort 3001).OwningProcess
Stop-Process -Id $processId -Force
```

### Frontend não compila
```powershell
# Reinstalar dependências
cd C:\BolaoVIP\frontend\bolao-vip
Remove-Item -Recurse -Force node_modules
npm install
npm start
```

### Erro de conexão MySQL
```powershell
# Verificar se MySQL está rodando
Get-Service -Name "*mysql*"

# Iniciar MySQL
Start-Service MySQL80
```

## Atalhos

### Reiniciar tudo
```powershell
# Parar processos
Get-Process node | Stop-Process -Force

# Iniciar backend
Push-Location "C:\BolaoVIP\backend"
Start-Process node -ArgumentList "server.js" -NoNewWindow
Pop-Location

# Aguardar 3 segundos
Start-Sleep 3

# Verificar se backend respondeu
Invoke-RestMethod "http://localhost:3001/ranking/rodada/1/status"

# Iniciar frontend
cd C:\BolaoVIP\frontend\bolao-vip
npm start
```

### Status rápido
```powershell
# Verificar processos Node
Get-Process node -ErrorAction SilentlyContinue | Format-Table Id, ProcessName

# Testar backend
Invoke-RestMethod "http://localhost:3001/ranking/rodada/1/status" | ConvertTo-Json

# Testar frontend (abrir navegador)
Start-Process "http://localhost:3000"
```
