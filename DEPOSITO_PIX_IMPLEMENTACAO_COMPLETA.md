# 💰 Fluxo de Depósito PIX via EFI - Implementação Completa

**Data:** 09 de janeiro de 2026  
**Commit:** 611ccdd  
**Status:** ✅ Implementação Concluída - Aguardando Testes

---

## 📋 Resumo da Implementação

Implementado fluxo **completo de depósito PIX via EFI** seguindo o **mesmo modelo das cobranças de palpites**. 

**Arquitetura:**
```
User Input (Valor)
    ↓
EFI API: Gera PIX (txid, QRCode, CopiaECola)
    ↓
Frontend: Exibe QRCode + CopiaECola (copiar para clipboard)
    ↓
Backend: Armazena em pix_depositos (status PENDENTE)
    ↓
User: Escaneia QRCode ou cola código PIX no banco
    ↓
Webhook EFI (preferencial) OU Fallback (5-min cron):
    - Consulta API EFI
    - Status = CONCLUIDA ✅
    ↓
Credita saldo_usuario + registra extrato_movimentacao
    ↓
Notificação: "Depósito confirmado"
```

---

## 🔧 Arquivos Criados/Modificados

### Backend

#### 1. **Tabela: `pix_depositos` (novo)**
- **Arquivo:** `backend/sql/criar_tabela_pix_depositos.sql`
- **Descrição:** Armazena depósitos PIX (idêntico a `pix_cobrancas`)
- **Campos principais:**
  - `txid`: ID único da transação EFI
  - `pix_copiaecola`: Código PIX para copiar/colar
  - `loc_id`, `loc_location`: QRCode URL
  - `status_pagamento`: PENDENTE, PAGO
  - `calendario_expiracao`: Segundos até expiração
  - `payload_raw`: JSON completo da resposta EFI

#### 2. **Service: `depositoPixService.js` (novo)**
- **Localização:** `backend/services/depositoPixService.js`
- **Funções:**

| Função | Descrição |
|--------|-----------|
| `criarDepositoPix(usuarioId, valor)` | Gera PIX via EFI, armazena em BD, retorna txid + QRCode + CopiaECola |
| `verificarEAtualizarDeposito(deposito)` | Consulta EFI, credita saldo se CONCLUIDA, registra extrato |
| `verificarDepositosPendentes()` | Busca pendentes (> 2 min, não expirados), verifica na EFI |

#### 3. **Service: `pixConsultaService.js` (modificado)**
- **Adição:**
  - `verificarTodosPendentes()`: Verifica **cobranças E depósitos** em uma única chamada
- **Benefit:** Otimização de cron job (uma execução verifica tudo)

#### 4. **Job: `verificarCobrancasPendentesJob.js` (modificado)**
- **Mudança:** Chama `verificarTodosPendentes()` em vez de apenas `verificarCobrancasPendentes()`
- **Impacto:** Agora valida ambos (cobranças + depósitos) a cada 5 minutos

#### 5. **Controller: `saldoController.criarDeposito()` (modificado)**
- **Antes:** Criava movimentação simples em `extrato_movimentacao`
- **Depois:** Chama `criarDepositoPix()` que:
  1. Gera PIX via EFI
  2. Armazena em `pix_depositos`
  3. Retorna QRCode + CopiaECola para frontend
  4. Envia notificação ao usuário

---

### Frontend

#### 1. **Component: `DepositoModal.js` (completamente reescrito)**
- **Localização:** `frontend/bolao-vip/src/components/DepositoModal.js`
- **3 Etapas:**

| Etapa | Descrição |
|-------|-----------|
| **Etapa 1: Valor** | Usuário insere valor (R$ 10 - R$ 50k) |
| **Etapa 2: QRCode** | Exibe QRCode + CopiaECola com botão "Copiar para Clipboard" |
| **Etapa 3: Aguardando** | Polling 10s verificando confirmação; usuário pode fechar |

**Features:**
- ✅ Input validação (mínimo/máximo)
- ✅ QRCode renderizado dinamicamente
- ✅ Código PIX copiável (clipboard API)
- ✅ Polling automático para verificar confirmação
- ✅ Feedback visual com spinner animado
- ✅ Suporte a fallback (5-min server-side)
- ✅ Notificações de sucesso via app

#### 2. **Styles: `DepositoModal.css` (estendido)**
- **Localização:** `frontend/bolao-vip/src/components/DepositoModal.css`
- **Adições:**
  - `.deposito-qrcode-container`: Layout QRCode
  - `.qrcode-display`: Styling para QRCode renderizado
  - `.copiaecola-container`: Campo de texto + botão copiar
  - `.spinner`: Animação de loading
  - `.polling-indicator`: Feedback visual durante polling
  - Responsive design para mobile

---

## 🚀 Como Testar

### 1. **Preparar Banco de Dados**

```bash
# Executar script SQL para criar tabela pix_depositos
mysql -u root -p bolaovip < backend/sql/criar_tabela_pix_depositos.sql

# Verificar se tabela foi criada
mysql -u root -p bolaovip
SELECT * FROM pix_depositos LIMIT 1;
```

### 2. **Iniciar Backend**

```bash
cd backend
node server.js
```

**Verificar logs:**
```
[depositoPixService] Iniciando criação de depósito PIX...
[depositoPixService] txid gerado: 52d479db203741a9a0b02f
[pixService] getAccessToken: ✅ Token obtido
[pixService] criarCobranca: ✅ Requisição PUT bem-sucedida
[depositoPixService] ✅ Depósito armazenado no banco
```

### 3. **Iniciar Frontend**

```bash
cd frontend/bolao-vip
npm start
```

### 4. **Testar Fluxo**

#### Teste 1: Gerar Depósito PIX

1. Login como usuário qualquer
2. Clique no saldo (💰) → "Depositar"
3. Insira valor (ex: R$ 50.00)
4. Clique "Gerar PIX"
5. **Esperado:**
   - QRCode aparece na tela
   - Código PIX (CopiaECola) exibido
   - Botão "Copiar" funciona (verificar clipboard)
   - Transição para "Aguardando..." com spinner

#### Teste 2: Verificar Banco de Dados

```sql
-- Verificar se depósito foi criado
SELECT id, id_usuario, txid, status_pagamento, valor_original, calendario_expiracao 
FROM pix_depositos 
ORDER BY created_at DESC 
LIMIT 1;

-- Esperado: 1 registro com status_pagamento = 'PENDENTE'
```

#### Teste 3: Simular Webhook (Desenvolvimento)

Para simular pagamento sem fazer PIX real:

```bash
# Terminal: Ir para backend
cd backend

# Atualizar status de depósito para PAGO manualmente (teste)
mysql -u root -p bolaovip
UPDATE pix_depositos SET status_pagamento = 'PAGO', webhook_recebido = 1, data_pagamento = NOW() WHERE id = 1;

# Executar fallback manualmente
node -e "
const job = require('./jobs/verificarCobrancasPendentesJob');
job.executarManual().then(r => {
  console.log('Fallback executado:', r);
  process.exit(0);
});
"
```

#### Teste 4: Verificar Crédito de Saldo

```sql
-- Após confirmar pagamento, verificar saldo
SELECT id, usuario_id, saldo_atual FROM saldo_usuario WHERE usuario_id = [id_do_usuario];

-- Verificar movimentação no extrato
SELECT * FROM extrato_movimentacao 
WHERE usuario_id = [id_do_usuario] AND tipo = 'deposito' 
ORDER BY criado_em DESC LIMIT 1;
```

**Esperado:**
- `saldo_atual` aumentado em R$ 50.00
- Nova linha em `extrato_movimentacao` com tipo='deposito', status='confirmado'

#### Teste 5: Verificar Notificação

```sql
-- Verificar se notificação foi criada
SELECT * FROM notificacoes 
WHERE usuario_id = [id_do_usuario] AND tipo = 'deposito_confirmado'
ORDER BY created_at DESC LIMIT 1;
```

---

## 🔄 Fluxo Completo de Funcionamento

### Cenário 1: Webhook EFI Ativo (Ideal)

```
T0:00 - User clica "Gerar PIX"
  → Backend chama EFI API
  → PIX criado: txid = "52d479db203741a9a0b02f"
  → Armazenado em pix_depositos com status='PENDENTE'
  → Frontend exibe QRCode + CopiaECola

T0:05 - User escaneia QRCode e paga no banco

T0:06 - EFI confirma pagamento
  → Webhook chega em POST /pix/webhook
  → pixController atualiza pix_depositos: status='PAGO'
  → Credita saldo_usuario
  → Registra extrato_movimentacao
  → Notificação enviada ao user

T0:07 - User recebe notificação "✅ Depósito Confirmado"
  → App atualiza saldo em tempo real (via websocket/SSE)
```

### Cenário 2: Webhook Falha (Fallback PIX)

```
T0:00 - Mesmo início (User gera PIX)

T0:05 - User paga

T0:06 - Webhook falha/não chega

T5:00 - Cron job executarVerificacao() (5-min)
  → pixConsultaService.verificarTodosPendentes()
  → depositoPixService.verificarDepositosPendentes()
  → Consulta EFI: "52d479db203741a9a0b02f"
  → EFI retorna: status='CONCLUIDA', pix=[{valor: 50.00, ...}]
  → Credita saldo (mesmo processo que webhook)
  → Notificação enviada

T5:01 - User recebe notificação (pode estar fazendo outra coisa)
```

---

## ⚙️ Configuração Necessária

### Variáveis de Ambiente (.env)

```env
# EFI PIX
EFI_CLIENT_ID=seu_client_id
EFI_CLIENT_SECRET=seu_client_secret
EFI_PIX_KEY=sua_chave_pix_cadastrada
EFI_PIX_CERT_PATH=./pix/certificados/producao.pem
EFI_PIX_KEY_PATH=./pix/certificados/producao-key.pem
EFI_PIX_SANDBOX=false  # true para sandbox, false para produção
```

### Certificados

Certificados mTLS da EFI devem estar em:
- `backend/pix/certificados/producao.pem` (certificado)
- `backend/pix/certificados/producao-key.pem` (chave privada)

---

## 📊 Diagrama de Dados

### Tabela `pix_depositos`

```
┌─────────────────────────────────────────────────────────┐
│                   pix_depositos                         │
├─────────────────────────────────────────────────────────┤
│ id                  INT (PK)                            │
│ id_usuario          INT (FK) → usuario.id               │
│ txid                VARCHAR(50) UNIQUE                  │
│ status              VARCHAR(30) - ATIVA/CONCLUIDA       │
│ status_pagamento    VARCHAR(30) - PENDENTE/PAGO         │
│ data_pagamento      DATETIME NULL                       │
│ valor_original      DECIMAL(10,2)                       │
│ chave_pix           VARCHAR(100) - PIX key EFI          │
│ pix_copiaecola      TEXT - Código PIX                   │
│ loc_id              INT - EFI location ID               │
│ loc_location        TEXT - URL do QRCode                │
│ calendario_expiracao INT - Segundos                     │
│ payload_raw         JSON - Response completo EFI        │
│ webhook_recebido    TINYINT(1) - 0/1                   │
│ webhook_payload     JSON NULL                           │
│ created_at          DATETIME                            │
│ updated_at          DATETIME                            │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
User Input (frontend)
    ↓
POST /saldo/deposito {valor: 50}
    ↓
saldoController.criarDeposito()
    ↓
depositoPixService.criarDepositoPix()
    ├─ Valida entrada
    ├─ Gera txid único
    ├─ Chama pixService.criarCobranca() [EFI API]
    ├─ Armazena em pix_depositos
    ├─ Cria notificação
    └─ Retorna {txid, qrcode_url, pix_copiaecola, ...}
    ↓
Frontend exibe QRCode + CopiaECola
    ↓
User escaneia/cola PIX no banco
    ↓
EFI detecta pagamento
    ↓
(Webhook OU Fallback Cron) → Verifica status EFI
    ↓
Credita saldo_usuario + extrato_movimentacao
    ↓
Notificação enviada
```

---

## ✅ Checklist de Implementação

- [x] Tabela `pix_depositos` criada (schema idêntico a `pix_cobrancas`)
- [x] `depositoPixService.js` implementado com 3 funções principais
- [x] `pixConsultaService.verificarTodosPendentes()` criado
- [x] `verificarCobrancasPendentesJob` atualizado para verificar ambos
- [x] `saldoController.criarDeposito()` reescrito para usar EFI
- [x] `DepositoModal.js` reescrito com 3 etapas (valor, qrcode, aguardando)
- [x] CSS atendido com estilos para QRCode, CopiaECola, Polling
- [x] Transição de estado correta em DepositoModal
- [x] Copiar para clipboard implementado
- [x] Polling automático (10s) durante aguardando
- [x] Cleanup de interval quando modal fecha
- [x] Notificações ao usuário em cada etapa
- [x] Fallback verifica depósitos também (5-min)
- [x] Movimento em `extrato_movimentacao` quando credita
- [x] Commit realizado (611ccdd)

---

## 🐛 Possíveis Issues & Soluções

### Issue 1: "QRCode não renderiza"
**Solução:** Package `qrcode.react` pode não estar instalado
```bash
npm install qrcode.react
```

### Issue 2: "Fallback nunca confirma"
**Solução:** Verificar se certificados EFI estão corretos e webhook endpoint está acessível
```bash
# Testar token OAuth
curl -X POST https://pix.api.efipay.com.br/oauth/token \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:SECRET' | base64)" \
  --cert backend/pix/certificados/producao.pem \
  --key backend/pix/certificados/producao-key.pem
```

### Issue 3: "Saldo não credita após pagamento"
**Solução:** Verificar logs do server para erros em `depositoPixService.verificarEAtualizarDeposito()`
```bash
# Monitorar logs
tail -f backend/logs/sistema.log | grep -i deposito
```

---

## 📝 Próximos Passos (Futuro)

1. **WebSocket Real-time:** Usar Socket.io para notificação instantânea de confirmação (sem polling)
2. **QRCode Dinâmico:** Renderizar QRCode diretamente do Código PIX (sem URL externa)
3. **Limite de Taxa:** Implementar rate-limiting para evitar abuse (1 PIX a cada 30s por usuário)
4. **Histórico Depósitos:** Page para listar todos os depósitos com status
5. **Admin Dashboard:** Visibilidade de depósitos pendentes/confirmados por grupo
6. **Análise:** Reportar tempo médio de confirmação, taxa de sucesso, etc.

---

## 📞 Suporte

**Dúvidas sobre a implementação?**
- Verificar logs: `tail -f backend/logs/sistema.log`
- Testar endpoint: `curl -X POST http://localhost:3001/saldo/deposito -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"valor": 50}'`
- Monitorar BD: `mysql -u root -p bolaovip` → `SELECT * FROM pix_depositos ORDER BY created_at DESC LIMIT 5;`

**Commit:** 611ccdd  
**Data:** 09 de janeiro de 2026  
**Status:** ✅ Pronto para Testes
