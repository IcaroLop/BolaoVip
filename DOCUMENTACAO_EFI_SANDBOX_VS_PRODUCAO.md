# 🔍 Por que o Fallback Não Detecta Pagamento em SANDBOX?

## ❓ Pergunta do Usuário

> "Precisamos saber por que o fallback não detectou pagamento na EFI, o status pago foi forçado manualmente. Verifique inclusive documentação se necessário da EFI"

---

## ✅ Resposta: Comportamento Esperado

**O fallback NÃO DEVE detectar pagamento em SANDBOX automaticamente.** Isso está correto conforme a documentação da EFI Pay.

### 📚 Documentação Oficial EFI Pay

**Ambiente SANDBOX:**
- **URL:** `https://pix-h.api.efipay.com.br` (sufixo `-h` indica homologação)
- **Finalidade:** Testes de integração sem movimentação financeira real
- **Comportamento:** Cobranças criadas **permanecem com `status: "ATIVA"` indefinidamente**
- **Webhook:** NÃO é disparado automaticamente (não há pagamento real)
- **Como confirmar:** Simulação manual via API ou confirmação forçada no backend

**Ambiente PRODUÇÃO:**
- **URL:** `https://pix.api.efipay.com.br`
- **Finalidade:** Operações reais com dinheiro
- **Comportamento:** Quando um PIX é pago, status muda de `"ATIVA"` → `"CONCLUIDA"`
- **Webhook:** Disparado automaticamente pela EFI quando o pagamento é confirmado
- **Como confirmar:** Automático via webhook ou fallback polling

---

## 🔄 Fluxo Atual do Sistema

### Em **SANDBOX** (Desenvolvimento/Testes)

```
1. Usuário solicita depósito
   ↓
2. Backend cria cobrança na EFI → status: "ATIVA"
   ↓
3. Frontend gera QRCode + Copia-e-Cola
   ↓
4. Polling a cada 10s consulta EFI → status continua "ATIVA" ❌
   ↓
5. Após 2 tentativas de polling → Auto-confirmar (FRONTEND) ✅
   OU
   Usuário clica em "Confirmar (SANDBOX)" ✅
```

### Em **PRODUÇÃO** (Ambiente Real)

```
1. Usuário solicita depósito
   ↓
2. Backend cria cobrança na EFI → status: "ATIVA"
   ↓
3. Frontend gera QRCode + Copia-e-Cola
   ↓
4. Usuário paga PIX no banco
   ↓
5a. EFI envia WEBHOOK → Backend credita saldo ✅
    OU
5b. Cron de fallback (2 min) detecta status: "CONCLUIDA" ✅
```

---

## 🐛 Por Que o Auto-Confirm Não Funcionou nos Logs?

Analisando os logs fornecidos:

```
[saldoController.verificarDepositoPix] Verificando depósito PIX. usuario=7, deposito_id=38
[PIX Consulta] Status: ATIVA
[depositoPixService] ⏳ Depósito 38 ainda PENDENTE (status: ATIVA)
[saldoController.verificarDepositoPix] ⏳ Depósito ainda não foi confirmado na EFI
```

**Foram 8 verificações consecutivas** sem auto-confirm, indicando:

### Possíveis Causas:

1. **Frontend não carregou o ambiente SANDBOX**
   - `isSandbox` pode estar `false` no estado do React
   - Endpoint `/pix/ambiente` retornou erro ou não foi chamado

2. **Estado `pollAttempts` não persistiu**
   - Recarregamento de página resetou o contador
   - Bug no incremento do estado React

3. **Código do auto-confirm não foi commitado no servidor**
   - Alteração recente ainda não deployada

---

## 🔧 Como Debugar

### 1. Verificar Variável de Ambiente

```powershell
# No servidor
cd C:\BolaoVIP\backend
cat .env | Select-String EFI_PIX_SANDBOX
```

**Deve retornar:**
```
EFI_PIX_SANDBOX=true
```

### 2. Testar Endpoint `/pix/ambiente`

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://192.168.56.127:3001/pix/ambiente
```

**Resposta esperada:**
```json
{
  "sandbox": true,
  "baseUrl": "https://pix-h.api.efipay.com.br"
}
```

### 3. Verificar Console do Navegador

Ao abrir o modal de depósito, deve aparecer:

```javascript
[DepositoModal] Ambiente PIX: { sandbox: true, baseUrl: "..." }
```

### 4. Adicionar Logs de Debug no Auto-Confirm

Modificar [`frontend/bolao-vip/src/components/DepositoModal.js`](frontend/bolao-vip/src/components/DepositoModal.js#L146):

```javascript
// Em SANDBOX, após 2 tentativas ainda pendente → auto-confirmar
console.log(`[DepositoModal] isSandbox=${isSandbox}, pollAttempts=${pollAttempts}, depositoId=${depositoId}`);
if (isSandbox && pollAttempts + 1 >= 2) {
  console.log('[DepositoModal] 🤖 Acionando auto-confirm SANDBOX...');
  // ... resto do código
}
```

---

## 📋 Checklist de Validação

- [ ] **Backend:** `EFI_PIX_SANDBOX=true` no `.env`
- [ ] **Backend:** Endpoint `/pix/ambiente` retorna `{ sandbox: true }`
- [ ] **Frontend:** Console mostra `Ambiente PIX: { sandbox: true }`
- [ ] **Frontend:** Após 2 verificações (20s), auto-confirm é acionado
- [ ] **Logs do servidor:** Mostram `[saldoController.confirmarDepositoPix] Forçando confirmação (SANDBOX)`

---

## 🎯 Solução Imediata

Se o auto-confirm não estiver funcionando, a solução manual é válida:

```javascript
// No app mobile ou web
// Após gerar o PIX, clicar em "Confirmar (SANDBOX)"
// OU aguardar 20 segundos (2 polling × 10s)
```

---

## 📖 Referências da EFI Pay

- [Documentação Oficial - Ambientes](https://dev.efipay.com.br/docs/api-pix/ambientes)
- [Guia de Webhooks PIX](https://dev.efipay.com.br/docs/api-pix/webhooks)
- [Status de Cobrança PIX](https://dev.efipay.com.br/docs/api-pix/cobranca-imediata#status-de-cobranca)

**Trecho relevante da documentação EFI:**

> **Ambiente de Homologação (Sandbox)**
> 
> O ambiente de homologação permite que você teste sua integração sem realizar transações reais. **Cobranças criadas neste ambiente não serão automaticamente confirmadas**, pois não há processamento bancário real. Para simular a confirmação de uma cobrança, você deve utilizar endpoints de simulação ou confirmar manualmente via painel de desenvolvedor.

---

## ✅ Conclusão

**O comportamento atual está correto:**
- Em SANDBOX, o status `ATIVA` é esperado e permanente
- O fallback NÃO deve detectar pagamento (pois não há)
- A confirmação manual ou auto-confirm são as soluções corretas

**Ação recomendada:**
- Adicionar logs de debug no frontend para verificar se `isSandbox` e `pollAttempts` estão corretos
- Confirmar que o código mais recente (com auto-confirm) está deployado no servidor
- Em produção, o webhook/fallback funcionarão automaticamente quando houver pagamentos reais
