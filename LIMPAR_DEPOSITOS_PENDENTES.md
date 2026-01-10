# 🧹 Limpeza de Depósitos Pendentes

## Problema Identificado

Nos logs do servidor apareciam depósitos antigos (IDs 33, 34, etc.) sendo verificados repetidamente pelo cron job de fallback, causando:
- Logs poluídos com verificações de depósitos que nunca serão pagos
- Consultas desnecessárias à API da EFI
- Confusão no debugging

## Causa Raiz

Depósitos criados em **SANDBOX** que nunca foram confirmados manualmente (via botão "Confirmar SANDBOX") ficam eternamente no status `PENDENTE`, sendo verificados a cada 2 minutos pelo fallback.

## Solução Implementada

### 1. **Filtro de Idade Máxima no Fallback**

Modificado `verificarDepositosPendentes()` em [`backend/services/depositoPixService.js`](backend/services/depositoPixService.js#L252):

```sql
WHERE status_pagamento = 'PENDENTE'
  AND webhook_recebido = false
  AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
  AND created_at > DATE_SUB(NOW(), INTERVAL 6 HOUR)  -- ✅ NOVO
```

**Comportamento:**
- Verifica apenas depósitos pendentes criados nas **últimas 6 horas**
- Depósitos mais antigos são automaticamente ignorados pelo fallback

---

### 2. **Endpoint para Listar Depósitos Pendentes**

**Rota:** `GET /saldo/depositos-pendentes`

**Resposta:**
```json
{
  "sucesso": true,
  "total": 3,
  "depositos": [
    {
      "id": 37,
      "txid": "ac2acf5fd5f24a83bfe7874645",
      "usuario_id": 7,
      "valor": 40,
      "status": "PENDENTE",
      "criado_em": "2026-01-10T15:06:25.000Z",
      "atualizado_em": "2026-01-10T15:06:25.000Z",
      "minutos_desde_criacao": 45,
      "expira_em": "2026-01-10T16:06:25.000Z",
      "expirado": false
    }
  ]
}
```

**Uso:**
```bash
# Listar depósitos pendentes
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://192.168.56.127:3001/saldo/depositos-pendentes
```

---

### 3. **Endpoint para Expirar Depósitos Antigos**

**Rota:** `POST /saldo/expirar-depositos-antigos`

**Body:**
```json
{
  "idadeMinutos": 60  // Opcional, padrão = 60 (1 hora)
}
```

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "2 depósitos marcados como EXPIRADO",
  "depositos_expirados": 2,
  "idade_minutos": 60
}
```

**Uso:**
```bash
# Expirar depósitos com mais de 1 hora (padrão)
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  http://192.168.56.127:3001/saldo/expirar-depositos-antigos

# Expirar depósitos com mais de 30 minutos
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idadeMinutos": 30}' \
  http://192.168.56.127:3001/saldo/expirar-depositos-antigos
```

---

## Como Limpar Depósitos Acumulados

### Passo 1: Listar Depósitos Pendentes

```bash
# No servidor
curl -H "Authorization: Bearer $(grep JWT_SECRET backend/.env | cut -d= -f2)" \
  http://192.168.56.127:3001/saldo/depositos-pendentes | jq
```

### Passo 2: Expirar Depósitos Antigos

```bash
# Expirar depósitos criados há mais de 1 hora (padrão)
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  http://192.168.56.127:3001/saldo/expirar-depositos-antigos

# OU via SQL direto no banco
mysql -u root bolaovip -e "
UPDATE pix_depositos 
SET status_pagamento = 'EXPIRADO', updated_at = NOW() 
WHERE status_pagamento = 'PENDENTE' 
  AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
"
```

### Passo 3: Reiniciar Backend

```powershell
# No servidor (Windows)
cd C:\BolaoVIP\backend
pm2 restart bolao-vip-backend

# Verificar logs
pm2 logs bolao-vip-backend --lines 50
```

---

## Validação

Após a limpeza, os logs do cron job devem mostrar:

```
[depositoPixService] ✓ Nenhum depósito pendente antigo encontrado
[depositoPixService] ✅ Verificação de depósitos concluída: { total: 0, verificados: 0, atualizados: 0 }
```

Ou, se houver depósitos recentes (últimas 6 horas):

```
[depositoPixService] 📋 Encontrados 1 depósitos pendentes para verificar
[PIX Consulta] Consultando txid: ac2acf5fd5f24a83bfe7874645
[PIX Consulta] Status: ATIVA
[depositoPixService] ⏳ Depósito 37 ainda PENDENTE (status: ATIVA)
```

---

## Arquivo Modificado

| Arquivo | Mudanças |
|---------|----------|
| [`backend/controllers/saldoController.js`](backend/controllers/saldoController.js) | ✅ Adicionados endpoints `listarDepositosPendentes` e `expirarDepositosAntigos` |
| [`backend/routes/saldoRoutes.js`](backend/routes/saldoRoutes.js) | ✅ Rotas `GET /depositos-pendentes` e `POST /expirar-depositos-antigos` |
| [`backend/services/depositoPixService.js`](backend/services/depositoPixService.js) | ✅ Filtro de idade máxima (6 horas) na query de depósitos pendentes |

---

## Prevenção Futura

1. **Ambiente SANDBOX:** Use o botão "Confirmar (SANDBOX)" ou aguarde o auto-confirm após 2 tentativas de polling
2. **Ambiente PRODUÇÃO:** Webhook/fallback confirmam automaticamente quando EFI retorna `status=CONCLUIDA`
3. **Limpeza periódica:** Execute o endpoint de expiração semanalmente ou configure cron job:

```javascript
// Em backend/jobs/limparDepositosAntigosJob.js (criar)
const cron = require('node-cron');
const db = require('../database/conexao');

// Todo domingo às 03:00 - Expirar depósitos com mais de 24 horas
cron.schedule('0 3 * * 0', async () => {
  try {
    const [result] = await db.query(
      `UPDATE pix_depositos
       SET status_pagamento = 'EXPIRADO', updated_at = NOW()
       WHERE status_pagamento = 'PENDENTE'
         AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    console.log(`[Limpeza Semanal] ✅ ${result.affectedRows} depósitos antigos expirados`);
  } catch (error) {
    console.error('[Limpeza Semanal] Erro:', error);
  }
});
```

---

## Resumo

✅ **Problema resolvido:** Depósitos antigos não aparecem mais nos logs de fallback  
✅ **Ferramentas criadas:** Endpoints para diagnóstico e limpeza  
✅ **Proteção adicionada:** Filtro de idade máxima (6 horas) no fallback  
✅ **Documentação:** Este guia para referência futura
