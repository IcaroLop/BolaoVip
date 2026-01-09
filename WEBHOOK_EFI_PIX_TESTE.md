# 🧪 TESTE WEBHOOK EFI PIX - RODADA 3

## Situação Atual
- ✅ Rodada 3 com pagamentos gerados
- ✅ Cobrança de Maria Souza: R$ 10.00 (PENDENTE)
- ⏳ Aguardando pagamento via webhook EFI

## Como Testar o Webhook

### Passo 1: Certifique-se que o Backend Está Rodando
```powershell
# Verificar se backend está rodando
pm2 status

# Se não estiver, inicie:
pm2 start "node backend/server.js" --name bolaovip-backend

# Ou rode direto:
cd c:\BolaoVIP\backend
node server.js
```

### Passo 2: Executar Script de Teste do Webhook
```powershell
cd c:\BolaoVIP
node backend/scripts/testarWebhookEfiPix.js
```

**O script irá:**
1. ✅ Buscar a cobrança pendente de Maria Souza (rodada 3)
2. ✅ Simular um webhook da EFI com status='CONCLUIDA'
3. ✅ Enviar POST para `http://localhost:3001/pix/webhook`
4. ✅ Verificar se o status foi atualizado para 'PAGO'

**Saída esperada:**
```
🧪 TESTE DE WEBHOOK EFI PIX
=====================================

1️⃣  Buscando cobrança de Maria Souza (rodada 3)...
✅ Cobrança encontrada:
   ID: 456
   Usuario ID: 4
   TXID: a1b2c3d4e5f6g7h8i9j0k1l2m3n
   Valor: R$ 10.00
   Status Atual: PENDENTE

2️⃣  Preparando payload do webhook EFI...
✅ Payload preparado:
{
  "pix": [
    {
      "txid": "a1b2c3d4e5f6g7h8i9j0k1l2m3n",
      "status": "CONCLUIDA",
      ...
    }
  ]
}

3️⃣  Enviando webhook para /pix/webhook...
   URL: http://localhost:3001/pix/webhook

✅ Webhook recebido com sucesso!
   Status HTTP: 200
   Resposta: OK

4️⃣  Verificando se o pagamento foi registrado...
✅ Status atualizado:
   Status Pagamento: PAGO
   Data Pagamento: 2026-01-09 15:45:00
   Webhook Recebido: SIM
   Payload Webhook: Salvo

=====================================
✅ TESTE WEBHOOK CONCLUÍDO COM SUCESSO!
   Cobrança de Maria Souza foi marcada como PAGO
   Webhook foi registrado no banco de dados
=====================================
```

### Passo 3: Verificar no App
Após o webhook ser processado:
1. Abra o app
2. Vá para: Admin → Pagamentos
3. Selecione "Rodada 3"
4. Procure pela cobrança de Maria Souza
5. Status deve estar como **"PAGO"** em vez de "PENDENTE"

### Passo 4: Verificar no Banco de Dados
```sql
-- Consultar cobrança de Maria Souza após webhook
SELECT 
  id, 
  id_usuario, 
  txid,
  valor_original,
  status,
  status_pagamento,
  webhook_recebido,
  data_pagamento,
  webhook_payload
FROM pix_cobrancas
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
  AND status_pagamento = 'PAGO'
LIMIT 1;

-- Resultado esperado:
/*
id: 456
id_usuario: 4
txid: a1b2c3d4e5f6g7h8i9j0k1l2m3n
valor_original: 10.00
status: CONCLUIDA
status_pagamento: PAGO
webhook_recebido: 1
data_pagamento: 2026-01-09 15:45:00
webhook_payload: {"txid":"a1b2c3d4...","status":"CONCLUIDA",...}
*/
```

## O Que Está Sendo Testado

### Fluxo de Webhook
```
EFI envia POST /pix/webhook com status='CONCLUIDA'
  ↓
pixController.webhookCobranca() processa
  ↓
UPDATE pix_cobrancas SET:
  - status = 'CONCLUIDA'
  - status_pagamento = 'PAGO'
  - webhook_recebido = true
  - webhook_payload = {...dados EFI...}
  - data_pagamento = NOW()
  ↓
Notificação ao usuário: "✅ Pagamento Confirmado"
  ↓
Cobrança agora aparece como PAGO no app
```

### Estados Possíveis
| Status | Significado | Ação |
|--------|-------------|------|
| ATIVA | PIX ativo e aguardando | Nenhuma |
| CONCLUIDA | EFI confirmou pagamento | → status_pagamento='PAGO' |
| EXPIRADA | PIX venceu | → marcar como expirado |
| REMOVIDA | PIX foi removido | → deletar |

## Troubleshooting

### Erro: "Nenhuma cobrança pendente encontrada"
- Verifique se os pagamentos foram gerados para rodada 3
- Verifique se Maria Souza (usuario_id=4) tem cobrança com origem='premios'

### Erro: "Erro ao enviar webhook"
- Certifique-se que o backend está rodando em http://localhost:3001
- Verifique se a porta 3001 não está bloqueada

### Cobrança não atualiza após webhook
- Verifique os logs do servidor (há erro no webhookCobranca?)
- Verifique se o txid do webhook corresponde ao txid da cobrança

## Checklist Final
- [ ] Backend rodando em http://localhost:3001
- [ ] Rodada 3 com pagamentos gerados
- [ ] Cobrança de Maria Souza existe com status='PENDENTE'
- [ ] Script de teste executado com sucesso
- [ ] Status mudou para 'PAGO'
- [ ] Webhook foi registrado no banco (webhook_recebido=1)
- [ ] Notificação enviada ao usuário
- [ ] App mostra cobrança como PAGA

## Próximos Testes
1. ✅ Webhook com status='CONCLUIDA' (este teste)
2. ⏳ Webhook com status='EXPIRADA' (cobrança vencida)
3. ⏳ Webhook com status='REMOVIDA' (cobrança removida)
4. ⏳ Webhook com múltiplas cobranças em um payload
5. ⏳ Testar integração completa com notificações push
