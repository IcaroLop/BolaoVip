# 📋 FLUXO DE INTEGRAÇÃO EFI PIX - COBRANÇA E PAGAMENTO
## Teste Rodada 3 - Análise Completa (SEM MODIFICAÇÕES)

---

## 1. ARQUITETURA GERAL DO FLUXO EFI

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GERAÇÃO DE COBRANÇA                            │
├─────────────────────────────────────────────────────────────────────┤
│ Gerar Pagamentos (Rodada)                                            │
│   ↓                                                                   │
│ Processar Débitos (sem saldo)                                        │
│   ↓                                                                   │
│ rankingController.gerarPremiacoesRodada()                            │
│   ├─ Calc saldo disponível                                           │
│   ├─ Se saldo = 0 ou insuficiente:                                   │
│   │    ├─ INSERT pix_cobrancas (status='ATIVA', status_pagamento='PENDENTE')
│   │    └─ Salvar payload_raw com origem='premios', rodada, premio_id
│   └─ Se erro na operação: fallback INSERT com status='ATIVA'
└─────────────────────────────────────────────────────────────────────┘
              ↓ (Cobrança criada no banco, MAS NÃO NA EFI)
┌─────────────────────────────────────────────────────────────────────┐
│                   RECEBER PAGAMENTO (WEBHOOK)                        │
├─────────────────────────────────────────────────────────────────────┤
│ EFI envia POST → /pix/webhook                                        │
│ pixController.webhookCobranca()                                      │
│   ├─ Valida array pix (se status === 'CONCLUIDA')                   │
│   ├─ UPDATE pix_cobrancas SET:                                       │
│   │    ├─ status = 'CONCLUIDA'                                       │
│   │    ├─ status_pagamento = 'PAGO'                                  │
│   │    ├─ webhook_recebido = true                                    │
│   │    ├─ webhook_payload = JSON do EFI                              │
│   │    └─ data_pagamento = NOW()                                     │
│   ├─ UPDATE palpites SET status_pagamento='PAGO' (se aplicável)     │
│   └─ Notificação ao usuário: "Pagamento Confirmado"                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. CRIAÇÃO DE COBRANÇA NA TABELA pix_cobrancas

**Local:** `backend/controllers/rankingController.js` - `gerarPremiacoesRodada()` linhas 380-420

### 2.1 Quando é Criada?

```javascript
// Cenário: Usuário com DÉBITO mas SEM SALDO SUFICIENTE

// Caso 2: Saldo positivo mas insuficiente
if (saldoDisponivel > 0 && saldoDisponivel < valorDebito) {
  // Debita parcial
  valorPix = valorDebito - valorDebitado; // R$ 8 (20 - 12)
  
  // Cria PIX para a diferença
  INSERT INTO pix_cobrancas SET {
    id_usuario: d.usuario_id,
    codigo_envio: UUID truncado 26 chars,
    txid: mesmo UUID,
    status: 'ATIVA',                      // ⚠️ Apenas LOCAL, não criado na EFI ainda
    status_pagamento: 'PENDENTE',
    valor_original: valorPix,              // R$ 8.00
    chave_pix: process.env.EFI_PIX_KEY,
    solicitacao_pagador: 'Cobrança rodada 3',
    calendario_criacao: NOW(),
    calendario_expiracao: 259200 (3 dias),
    payload_raw: JSON {
      origem: 'premios',
      rodada: 3,
      campeonato_id: 69,
      grupo_id: 2,
      premio_id: 456,                     // ID do prêmio (cobrança)
      saldo_usado: 12.00                  // Quanto foi debitado
    },
    webhook_recebido: false,
    webhook_payload: null
  }
}

// Caso 3: Saldo zerado
else if (saldoDisponivel === 0) {
  valorPix = valorDebito; // R$ 20 (cobrança total)
  // INSERT pix_cobrancas com valorPix = R$ 20
}

// Caso 4: Saldo negativo
else if (saldoDisponivel < 0) {
  valorPix = valorDebito + Math.abs(saldoDisponivel); // 20 + 5 = R$ 25
  // INSERT pix_cobrancas com valorPix = R$ 25
}
```

### 2.2 Dados Salvos no Banco

```sql
SELECT *
FROM pix_cobrancas
WHERE origem = 'premios' AND rodada = 3;

-- Resultado esperado para Maria Souza:
/*
id: 789
id_usuario: 4
codigo_envio: a1b2c3d4e5f6g7h8i9j0k1l2m3n
txid: a1b2c3d4e5f6g7h8i9j0k1l2m3n
status: 'ATIVA'                          ← Local (não na EFI)
status_pagamento: 'PENDENTE'
valor_original: 8.00                     ← Parcial (20 - 12)
chave_pix: '00020126580014...pixkey...'
solicitacao_pagador: 'Cobrança rodada 3'
calendario_criacao: 2026-01-09 14:30:00
calendario_expiracao: 259200
payload_raw: '{"origem":"premios",...,"saldo_usado":12.00}'
webhook_recebido: 0
webhook_payload: NULL
data_pagamento: NULL
*/
```

---

## 3. ⚠️ PROBLEMA ATUAL: PIX NÃO É CRIADO NA EFI

**IMPORTANTE:** Na função `gerarPremiacoesRodada()`, a cobrança é inserida APENAS no banco local (`pix_cobrancas`), mas **NÃO É ENVIADA PARA A EFI** para criar o QR Code real.

**O que falta:**
```javascript
// MISSING: Chamar pixService para criar cobrança na EFI
const cobrancaEfi = await pixService.criarCobranca(
  codigo_envio,    // txid
  valorPix,        // valor
  process.env.EFI_PIX_KEY,  // chave PIX
  'Cobrança rodada 3',
  nomeUsuario
);

// Depois usar dados do EFI:
// - cobrancaEfi.pixCopiaECola (QR Code)
// - cobrancaEfi.loc.id (ID de localização EFI)
// - cobrancaEfi.status (status EFI)
```

---

## 4. RECEBIMENTO DE PAGAMENTO - WEBHOOK

**Local:** `backend/controllers/pixController.js` - `webhookCobranca()` linhas 116-182

### 4.1 Como EFI Notifica

```
EFI PIX API envia:
POST http://seu-servidor/pix/webhook

Body:
{
  "pix": [
    {
      "txid": "a1b2c3d4e5f6g7h8i9j0k1l2m3n",
      "status": "CONCLUIDA",              ← Indicador de pagamento
      "valor": 8.00,
      "pagador": {
        "cpf": "12345678901",
        "nome": "Apostador"
      },
      "endToEndId": "E12345678901234567890123456789",
      "horario": "2026-01-09T15:45:00Z"
    }
  ]
}
```

### 4.2 Processamento do Webhook

```javascript
async function webhookCobranca(req, res) {
  const notification = req.body;
  const pixArray = notification.pix;  // Array com pagamentos

  for (const pix of pixArray) {
    const txid = pix.txid;
    const status = pix.status;

    if (status === 'CONCLUIDA') {
      // ✅ Pagamento confirmado!
      
      // UPDATE pix_cobrancas
      UPDATE pix_cobrancas SET
        status = 'CONCLUIDA',
        status_pagamento = 'PAGO',
        webhook_recebido = true,
        webhook_payload = JSON.stringify(pix),
        data_pagamento = NOW()
      WHERE txid = ?

      // UPDATE palpites (se aplicável)
      UPDATE palpites SET
        status_pagamento = 'PAGO',
        data_pagamento = NOW()
      WHERE codigo_envio = ?

      // ✅ Notificação ao usuário
      criarNotificacao(
        id_usuario,
        'pagamento_confirmado',
        '✅ Pagamento Confirmado',
        'Seu pagamento de R$ 8.00 foi confirmado! Referência: a1b2c3d4...'
      )
    } else {
      // Status: PENDENTE, COBRADA, etc.
      UPDATE pix_cobrancas SET
        status = pix.status,
        status_pagamento = 'PENDENTE',
        webhook_recebido = true,
        webhook_payload = JSON.stringify(pix)
      WHERE txid = ?
    }
  }

  res.status(200).send('OK');  // Confirmação para EFI
}
```

### 4.3 Estados Possíveis no Webhook

| Status EFI | Ação no Sistema | Descrição |
|-----------|-----------------|-----------|
| `CONCLUIDA` | UPDATE → status_pagamento='PAGO' | ✅ Pagamento recebido |
| `COBRADA` | Manter PENDENTE | Boleto gerado (PIX usa CONCLUIDA) |
| `PENDENTE` | Manter PENDENTE | Aguardando pagamento |
| `EXPIRADA` | Markar como expirado | Prazo venceu |
| `REMOVIDA` | Remover PIX | Usuário deletou |

---

## 5. ATUALIZAÇÃO DE STATUS APÓS PAGAMENTO

### 5.1 No Banco de Dados

**Antes do pagamento:**
```sql
SELECT * FROM pix_cobrancas WHERE txid = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n';
/*
status: 'ATIVA'
status_pagamento: 'PENDENTE'
webhook_recebido: 0
data_pagamento: NULL
*/
```

**Depois que webhook chega:**
```sql
SELECT * FROM pix_cobrancas WHERE txid = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n';
/*
status: 'CONCLUIDA'              ← Atualizado
status_pagamento: 'PAGO'         ← Atualizado
webhook_recebido: 1              ← Sinalizador
webhook_payload: {...EFI data...}
data_pagamento: 2026-01-09 15:45:00  ← Timestamp do pagamento
*/
```

### 5.2 No Prêmio Relacionado

Se a cobrança foi parcial (saldo_parcial > 0), o prêmio fica:

**Antes:**
```sql
SELECT * FROM premios WHERE id = 456;
/*
usuario_id: 4
tipo_premio: 'lanterna'
valor: -20.00
status_pagamento: 'pendente'
saldo_parcial: 12.00            ← Débito parcial
*/
```

**Depois (após webhook):**
- ❌ **NÃO HÁ ATUALIZAÇÃO AUTOMÁTICA no premios**
- O `status_pagamento` continua 'pendente' até que um endpoint explícito (manual) confirme o crédito

---

## 6. FLUXO RESUMIDO: RODADA 3 COM MARIA SOUZA

```
Passo 1: GERAR PAGAMENTOS (Clica botão no app)
  ↓
  rankingController.gerarPremiacoesRodada(3)
  
  Maria Souza (lanterna):
    - Cobrança: R$ 20.00
    - Saldo: R$ 0 (ou insuficiente)
    - Ação: INSERT pix_cobrancas com status='ATIVA', valor=20
  
  Log esperado:
  "⚠️ Saldo zerado: criando PIX de R$ 20.00 para usuário 4"
  "🔔 Cobrança PIX criada: R$ 20.00 para usuário 4"
  
  Banco após:
  pix_cobrancas:
    status = 'ATIVA'
    status_pagamento = 'PENDENTE'
    webhook_recebido = 0

Passo 2: MARIA PAGA O PIX (Fora do sistema)
  ↓
  EFI confirma pagamento e envia webhook

Passo 3: WEBHOOK CHEGA NO SERVIDOR
  ↓
  pixController.webhookCobranca()
  
  Validação: status === 'CONCLUIDA'? ✅ Sim
  
  Ações:
    - UPDATE pix_cobrancas SET status='CONCLUIDA', status_pagamento='PAGO'
    - webhook_recebido = true
    - data_pagamento = NOW()
    - (Se palpite linkado) UPDATE palpites SET status_pagamento='PAGO'
  
  Log esperado:
  "✅ Palpites atualizados para PAGO → codigo_envio: a1b2c3d4e5f6..."

Passo 4: VERIFICAR STATUS NO APP
  ↓
  GET /admin/pagamentos/cobrancas/historico
  
  Resultado:
  - Status = 'CONCLUIDA' (via webhook_payload)
  - status_pagamento = 'PAGO'
  - data_pagamento = 2026-01-09 15:45:00
  - Nome: Maria Souza
  - Valor: R$ 20.00
```

---

## 7. PROBLEMAS/GAPS IDENTIFICADOS

| # | Problema | Impacto | Status |
|---|----------|---------|--------|
| 1 | PIX **não é criado na EFI** (só no banco) | Sem QR Code real, sem notificação EFI | 🔴 BLOCKER |
| 2 | Sem integração `pixService.criarCobranca()` no fluxo de pagamento | Cobrança inerte | 🔴 BLOCKER |
| 3 | `saldo_parcial` não é retornado no webhook | Dificuldade rastrear débito parcial | 🟡 MELHORIA |
| 4 | Se webhook não chegar, cobrança fica PENDENTE eternamente | Sem mecanismo de retry/timeout | 🟡 MELHORIA |
| 5 | Prêmio não é automaticamente marcado como PAGO após webhook | Inconsistência de estados | 🟡 MELHORIA |

---

## 8. FLUXO ESPERADO PARA RODADA 3

### Cenário: Maria Souza com Cobrança Parcial

1. **Gerar Pagamentos Rodada 3**
   - Maria tem saldo R$ 0 e cobrança R$ 20
   - Sistema cria PIX de R$ 20 (atual: só no banco)
   - **FALTA:** Enviar para EFI com `pixService.criarCobranca()`

2. **Maria Recebe Notificação**
   - Tela mostra: "Cobrança PIX Pendente - R$ 20.00"
   - QR Code para escanear e pagar
   - **FALTA:** QR Code real da EFI (só tem se enviado para EFI)

3. **Maria Paga via PIX**
   - Transfere R$ 20 para a chave PIX da conta

4. **EFI Confirma Pagamento**
   - Envia webhook com status='CONCLUIDA'
   - Sistema atualiza: status_pagamento='PAGO'
   - App mostra: "✅ Pagamento Confirmado"

5. **Saldo Atualizado**
   - Saldo de Maria volta para R$ 0 (20 debitado, nada creditado)
   - **NOTA:** Se fosse premiação, saldo seria creditado

---

## 9. CAMPOS IMPORTANTES EM pix_cobrancas

```sql
-- Campos críticos para EFI:
txid                  -- Identificador único de 26-35 chars
status                -- Último status da EFI
status_pagamento      -- PENDENTE, PAGO, etc.
webhook_recebido      -- true/false (se notificação chegou)
webhook_payload       -- JSON completo da EFI
data_pagamento        -- Quando o pagamento foi confirmado

-- Campos de auditoria:
payload_raw           -- JSON com contexto (origem, rodada, premio_id)
valor_original        -- Valor inicial da cobrança
calendario_criacao    -- Quando foi criado
calendario_expiracao  -- Prazo de validade (em segundos)
```

---

## RESUMO DO FLUXO PARA TESTE RODADA 3

✅ **Já Implementado:**
- Cálculo de saldo disponível
- Decisão de criar cobrança ou débito total
- Inserção em pix_cobrancas
- Webhook para receber CONCLUIDA da EFI
- Atualização de status PAGO no webhook

❌ **Não Implementado:**
- Envio de cobrança para EFI (criar QR Code)
- Seleção do método de pagamento (EFI vs Manual)
- Notificação com QR Code para o usuário

🟡 **Parcialmente Implementado:**
- Rastreamento de débito parcial
- Sincronização prêmio ↔ cobrança PIX
- Mecanismo de timeout/retry para PIX não pagos
