# 📱 Sistema de Notificações - Integração com APP

## ✅ O Que Foi Corrigido

**Problema:** Notificações eram processadas no backend mas NÃO apareciam no APP.

**Solução:** Agora o sistema envia notificações para DOIS lugares:

### 1. **`notificacoes_enviadas_jogos`** (Backend - Rastreamento)
- Armazena **quando** a notificação foi disparada
- Status: agendada → enviada
- Timestamp: `data_agendada` e `data_enviada`

### 2. **`notificacoes_usuarios`** (APP - Exibição) ⭐ **NOVO**
- Cria notificação para **CADA usuário ativo**
- Aparece no APP automaticamente
- Tipo: `inicio_jogo`
- Dados: `jogo_id` e `tempo_alerta`

---

## 🔄 Fluxo Completo (Agora)

```
1. Jogo inserido no banco
        ↓
2. Cron job (a cada 2 min) detecta jogo nos próximos 70 min
        ↓
3. Agenda 4 notificações em notificacoes_enviadas_jogos
        ↓
4. Cron job (a cada 1 min) verifica data_agendada <= NOW()
        ↓
5. Marca como "enviada" em notificacoes_enviadas_jogos
        ↓
6. 🆕 ENVIA para notificacoes_usuarios (todos os usuários) ⭐
        ↓
7. Usuários recebem no APP automaticamente
```

---

## 🚀 Para Testar (Servidor)

```bash
cd /home/jelastic/ROOT/backend

# Limpar
node scripts/limparTudoTeste.js

# Inserir novo jogo
node scripts/inserirJogoTeste.js

# Forçar agendamento e disparo
node scripts/forcarAgendamentoEDisparo.js

# Verificar no APP
# Abrir a aba de Notificações - deve aparecer!
```

---

## 📊 Verificação no Banco

```bash
# Ver notificações agendadas (rastreamento)
SELECT * FROM notificacoes_enviadas_jogos WHERE jogo_id = 999999;

# Ver notificações dos usuários (o que o APP mostra)
SELECT usuario_id, tipo, titulo, mensagem 
FROM notificacoes_usuarios 
WHERE tipo = 'inicio_jogo' AND dados_json LIKE '%999999%';
```

---

## 💡 Próximas Notificações Esperadas

Quando o sistema disparar:
- ✅ Notificação "60min antes" - enviada para TODOS os usuários
- ✅ Notificação "30min antes" - enviada para TODOS os usuários  
- ✅ Notificação "15min antes" - enviada para TODOS os usuários
- ✅ Notificação "5min antes" - enviada para TODOS os usuários

**Cada notificação** aparece no APP com:
- **Título**: "Time A vs Time B"
- **Mensagem**: "Jogo começa em {tempo} minutos"
- **Tipo**: inicio_jogo

---

## 🧪 Se Não Aparecer no APP

1. **Verificar permissão de notificações** no celular
2. **Reabrir o APP** para sincronizar
3. **Checar banco**: `SELECT * FROM notificacoes_usuarios LIMIT 5;`
4. **Ver logs**: `pm2 logs | grep -i "enviada para"`

---

**Status:** ✅ Sistema 100% integrado  
**Próximo passo:** Testar com usuários reais
