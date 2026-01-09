# Sistema de Fallback PIX - Verificação Automática de Pagamentos

## 📋 Visão Geral

Sistema de **polling fallback** que verifica automaticamente o status de cobranças PIX pendentes na EFI, garantindo que pagamentos sejam confirmados mesmo se o webhook falhar.

## 🎯 Problema Resolvido

**Cenário:** Webhook PIX pode falhar por diversos motivos:
- Firewall bloqueando requisições da EFI
- Instabilidade de rede
- Servidor temporariamente indisponível
- URL webhook incorreta ou não registrada

**Solução:** Sistema de verificação ativa que consulta a API da EFI a cada 5 minutos procurando por cobranças pagas.

## 🏗️ Arquitetura

### Componentes Criados

```
backend/
├── services/
│   └── pixConsultaService.js      # Service de consulta à API EFI
├── jobs/
│   └── verificarCobrancasPendentesJob.js  # Cron job (5 min)
└── scripts/
    └── testarPixFallback.js       # Script de teste manual
```

### Fluxo de Operação

```
┌─────────────────────────────────────────────────────────────┐
│  CRON JOB (a cada 5 minutos)                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Buscar cobranças pendentes (> 2 minutos, max 20)       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Para cada cobrança:                                     │
│     ├── Obter token OAuth2 da EFI                          │
│     ├── Consultar status via GET /v2/cob/{txid}           │
│     └── Verificar se status = CONCLUIDA                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Se PAGO:                                                │
│     ├── UPDATE pix_cobrancas (status_pagamento = PAGO)    │
│     ├── UPDATE palpites (data_pagamento = NOW())          │
│     └── Enviar notificação ao usuário                      │
└─────────────────────────────────────────────────────────────┘
```

## 📂 Código-Fonte

### pixConsultaService.js

**Funções principais:**

1. **`consultarCobrancaEfi(txid)`**
   - Obtém token OAuth2 da EFI
   - Consulta status da cobrança via API
   - Retorna dados completos da transação

2. **`verificarEAtualizarCobranca(cobranca)`**
   - Verifica uma cobrança individual
   - Se paga, atualiza banco de dados
   - Envia notificação ao usuário
   - Retorna `true` se foi atualizada

3. **`verificarCobrancasPendentes()`**
   - Busca até 20 cobranças pendentes antigas (> 2 min)
   - Processa cada uma com delay de 500ms (rate limiting)
   - Retorna estatísticas: `{ total, verificadas, atualizadas }`

### verificarCobrancasPendentesJob.js

**Configuração do Cron:**
- **Intervalo:** `*/5 * * * *` (a cada 5 minutos)
- **Timezone:** America/Manaus
- **Lock:** Previne execuções simultâneas com `isVerificando`
- **Startup:** Execução inicial após 30 segundos

**Funções:**
- `iniciarJob()` - Inicia o cron (chamado no server.js)
- `pararJob()` - Para o cron
- `executarManual()` - Executa verificação única (para testes)

## 🚀 Como Usar

### 1. Inicialização Automática

O job é **iniciado automaticamente** quando o backend sobe:

```javascript
// server.js (já implementado)
const { iniciarJob: iniciarPixFallback } = require('./jobs/verificarCobrancasPendentesJob');
iniciarPixFallback();
```

### 2. Teste Manual

Execute verificação única para testar:

```powershell
# Teste manual
node backend/scripts/testarPixFallback.js
```

**Saída esperada:**
```
======================================================================
TESTE MANUAL: Verificação de Cobranças PIX Pendentes (Fallback)
======================================================================
[Cron PIX Fallback] 🔧 Execução manual solicitada
[Cron PIX Fallback] 🚀 Iniciando verificação de cobranças pendentes...
[PIX Fallback] 🔍 Iniciando verificação de cobranças pendentes...
[PIX Fallback] 📋 Encontradas 3 cobranças pendentes para verificar
[PIX Consulta] Consultando txid: abc123...
[PIX Consulta] Status: CONCLUIDA
[PIX Fallback] ✅ Cobrança 123 (txid: abc123) PAGA! Atualizando...
[PIX Fallback] ✅ Cobrança 123 atualizada com sucesso (via polling)
...
[PIX Fallback] ✅ Verificação concluída: { total: 3, verificadas: 3, atualizadas: 1 }
======================================================================
✅ TESTE CONCLUÍDO COM SUCESSO!
======================================================================
Resultado: { total: 3, verificadas: 3, atualizadas: 1 }
```

### 3. Monitoramento em Produção

Logs do cron aparecem no console do backend:

```
[Cron PIX Fallback] 🚀 Iniciando verificação de cobranças pendentes...
[PIX Fallback] 📋 Encontradas 5 cobranças pendentes para verificar
[PIX Fallback] ✅ Cobrança 916 atualizada com sucesso (via polling)
[Cron PIX Fallback] ✅ Verificação concluída: { total: 5, verificadas: 5, atualizadas: 1 }
```

## ⚙️ Configuração

### Variáveis .env Necessárias

```env
# EFI PIX Credentials
EFI_CLIENT_ID=Client_Id_***
EFI_CLIENT_SECRET=Client_Secret_***
EFI_PIX_KEY=4eec943a-f83b-4b53-85ab-13430bbd44b6

# Certificados
EFI_PIX_CERT_PATH=./pix/certificados/producao.pem
EFI_PIX_KEY_PATH=./pix/certificados/producao-key.pem

# Ambiente (sandbox ou produção)
EFI_PIX_SANDBOX=false  # false = produção, true = sandbox
```

### Ajuste de Intervalo

Para alterar o intervalo do cron:

```javascript
// verificarCobrancasPendentesJob.js, linha 46
cronTask = cron.schedule('*/5 * * * *', executarVerificacao, {
  //                       ↑↑↑
  //                       Altere aqui (*/5 = 5 min, */10 = 10 min, etc)
```

### Ajuste de Limite de Cobranças

Para verificar mais/menos cobranças por execução:

```javascript
// pixConsultaService.js, linha 112
LIMIT 20  // ← Altere este valor (padrão: 20)
```

### Ajuste de Delay entre Consultas

Para evitar rate limiting da EFI:

```javascript
// pixConsultaService.js, linha 133
await new Promise(resolve => setTimeout(resolve, 500));
//                                                 ↑↑↑
//                                                 500ms = 0.5 segundos
```

## 🔍 Critérios de Seleção

Cobranças verificadas devem atender:

1. ✅ `status_pagamento = 'PENDENTE'`
2. ✅ `webhook_recebido = false` (webhook não chegou)
3. ✅ `created_at < NOW() - 2 minutes` (criada há mais de 2 minutos)
4. ✅ Ordem: mais antigas primeiro (`ORDER BY created_at DESC`)
5. ✅ Limite: máximo 20 por execução

**Por que 2 minutos?**
- Evita consultar cobranças recém-criadas
- Dá tempo para webhook chegar naturalmente
- Reduz chamadas desnecessárias à API

## 📊 Métricas e Logs

### Logs por Execução

```javascript
{
  timestamp: '2026-01-09T15:30:00.000Z',
  total: 5,        // Cobranças encontradas
  verificadas: 5,  // Cobranças consultadas
  atualizadas: 2   // Cobranças marcadas como PAGAS
}
```

### Estados de Cobrança

| Status Inicial | Status na EFI | Ação |
|----------------|---------------|------|
| PENDENTE | ATIVA | Nenhuma (ainda não paga) |
| PENDENTE | CONCLUIDA | Atualizar para PAGO + notificação |
| PENDENTE | REMOVIDA_PELO_USUARIO_RECEBEDOR | Nenhuma |
| PENDENTE | REMOVIDA_PELO_PSP | Nenhuma |

## 🛡️ Prevenção de Duplicação

**Lock de execução:**
```javascript
if (isVerificando) {
  console.log('⚠️ Verificação anterior ainda em execução, pulando...');
  return;
}
```

**Previne:**
- Execuções simultâneas do cron
- Duplicação de notificações
- Sobrecarga na API da EFI

## 🔄 Integração com Webhook

### Dupla Verificação

- **Webhook:** Atualização instantânea (< 2s após pagamento)
- **Fallback:** Atualização garantida (5 min após pagamento)

### Flags de Controle

```sql
SELECT 
  webhook_recebido,  -- false = fallback, true = webhook
  status_pagamento,  -- PENDENTE → PAGO
  data_pagamento     -- NULL → NOW()
FROM pix_cobrancas
WHERE txid = 'abc123';
```

### Campo `webhook_payload`

No fallback, salva resposta da API:
```json
{
  "txid": "abc123",
  "valor": "15.00",
  "horario": "2026-01-09T15:30:00Z",
  "origem": "fallback_polling"  // ← Identifica origem
}
```

## 🎯 Casos de Uso

### Cenário 1: Webhook Funcionando
1. Usuário paga PIX (15:00:00)
2. EFI envia webhook (15:00:02) ✅
3. Backend atualiza status (15:00:02) ✅
4. Cron executa (15:05:00) - não encontra pendentes ⏭️

### Cenário 2: Webhook Falhou
1. Usuário paga PIX (15:00:00)
2. EFI tenta webhook (15:00:02) ❌ (firewall bloqueou)
3. Cobrança fica PENDENTE ⏳
4. Cron executa (15:05:00) - encontra cobrança ✅
5. Consulta EFI via API ✅
6. Detecta status CONCLUIDA ✅
7. Atualiza banco + notifica usuário ✅

### Cenário 3: Pagamento Ainda Não Realizado
1. Cobrança criada (15:00:00)
2. Usuário não pagou ainda
3. Cron executa (15:05:00) - encontra cobrança
4. Consulta EFI via API
5. Status = ATIVA (não paga)
6. Nenhuma ação - aguarda próxima execução

## 📈 Performance

### Otimizações Implementadas

1. **Rate Limiting:** 500ms entre consultas
2. **Limite de Lote:** Máximo 20 cobranças por execução
3. **Filtro Temporal:** Apenas > 2 minutos de idade
4. **Lock de Execução:** Previne concorrência
5. **Delay de Startup:** 30s após servidor iniciar

### Cálculo de Chamadas API

```
1 execução = 1 consulta OAuth2 + N cobranças
Exemplo: 5 cobranças pendentes
  = 1 token + 5 consultas
  = 6 chamadas API
  
Tempo: ~500ms × 5 = 2.5s
```

## 🧪 Testes

### 1. Criar Cobrança de Teste

```sql
INSERT INTO pix_cobrancas (
  id_usuario, codigo_envio, txid, status, status_pagamento,
  valor_original, chave_pix, created_at
) VALUES (
  1, 'TEST123', 'txid_teste_real_da_efi', 'PENDENTE', 'PENDENTE',
  15.00, '4eec943a-f83b-4b53-85ab-13430bbd44b6', DATE_SUB(NOW(), INTERVAL 5 MINUTE)
);
```

### 2. Executar Teste Manual

```powershell
node backend/scripts/testarPixFallback.js
```

### 3. Verificar Resultado

```sql
SELECT id, txid, status_pagamento, webhook_recebido, data_pagamento
FROM pix_cobrancas
WHERE codigo_envio = 'TEST123';
```

**Esperado:**
- `status_pagamento = 'PAGO'` (se pagamento foi confirmado na EFI)
- `webhook_recebido = false` (veio via fallback, não webhook)
- `data_pagamento = NOW()`

## 🚨 Troubleshooting

### Erro: "Erro ao consultar cobrança"

**Causa:** Credenciais EFI inválidas ou certificado incorreto

**Solução:**
```powershell
# Verificar .env
cat backend/.env | Select-String "EFI"

# Verificar certificados existem
Test-Path backend/pix/certificados/producao.pem
Test-Path backend/pix/certificados/producao-key.pem
```

### Erro: "ENOENT: no such file or directory"

**Causa:** Caminho do certificado incorreto

**Solução:**
```env
# Use caminhos relativos ou absolutos
EFI_PIX_CERT_PATH=./pix/certificados/producao.pem
# ou
EFI_PIX_CERT_PATH=C:/BolaoVIP/backend/pix/certificados/producao.pem
```

### Job não está executando

**Diagnóstico:**
```powershell
# Verificar logs do servidor
# Deve aparecer:
# [STARTUP] ✅ Job de fallback PIX ativado (verificação a cada 5 minutos)
```

**Se não aparecer:** Verificar se `iniciarPixFallback()` foi chamado no server.js

### Cobranças não estão sendo atualizadas

**Verificar:**
1. Cobrança tem > 2 minutos de criação?
2. `webhook_recebido = false`?
3. `status_pagamento = 'PENDENTE'`?
4. Txid é válido na EFI?
5. Pagamento realmente foi confirmado na EFI?

**Debug:**
```sql
-- Ver cobranças elegíveis para verificação
SELECT id, txid, status_pagamento, webhook_recebido, 
       TIMESTAMPDIFF(MINUTE, created_at, NOW()) AS minutos_idade
FROM pix_cobrancas
WHERE status_pagamento = 'PENDENTE'
  AND webhook_recebido = false
  AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
LIMIT 20;
```

## ✅ Checklist de Implementação

- [x] Service de consulta EFI (`pixConsultaService.js`)
- [x] Job cron 5 minutos (`verificarCobrancasPendentesJob.js`)
- [x] Script de teste manual (`testarPixFallback.js`)
- [x] Integração no server.js (auto-start)
- [x] Rate limiting (500ms delay)
- [x] Lock de execução (previne duplicação)
- [x] Logs detalhados
- [x] Notificação ao usuário
- [x] Documentação completa

## 🎉 Benefícios

✅ **Garantia de confirmação** - Pagamentos não são perdidos  
✅ **Redundância** - Funciona mesmo sem webhook  
✅ **Automático** - Não requer intervenção manual  
✅ **Escalável** - Processa lotes de 20 cobranças  
✅ **Monitorável** - Logs completos de cada execução  
✅ **Testável** - Script de teste manual incluído

---

**Desenvolvido em:** Janeiro 2026  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
