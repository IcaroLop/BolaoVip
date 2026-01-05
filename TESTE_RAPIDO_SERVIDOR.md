# ✅ Sistema de Notificações — Teste Rápido no Servidor

## 🚀 Executar Agora (Servidor)

```bash
cd /home/jelastic/ROOT/backend

# 1. Limpar qualquer jogo anterior
node scripts/limparTudoTeste.js

# 2. Inserir novo jogo de teste (40 min à frente em Manaus)
node scripts/inserirJogoTeste.js

# 3. Verificar as notificações agendadas
node scripts/testarNotificacoesJogo.js

# 4. Acompanhar logs em tempo real
pm2 logs | grep -E "(Notificacao|Disparando|agendada)"
```

---

## 📋 O que Esperar

### Output Esperado do `testarNotificacoesJogo.js`:

```
✅ Jogo de teste encontrado:
      Partida ID: 999999
      Data: Mon Jan 05 2026 13:48:43 GMT+0000 (Coordinated Universal Time)
      Jogo: Time Teste A vs Time Teste B

✅ 4 notificações agendadas:

  ⏱️  60min antes
      Status: agendada
      Agendada para: 05/01/2026, 09:48:43
      Faltam: ~60min

  ⏱️  30min antes
      Status: agendada
      Agendada para: 05/01/2026, 10:18:43
      Faltam: ~30min

  ⏱️  15min antes
      Status: agendada
      Agendada para: 05/01/2026, 10:33:43
      Faltam: ~15min

  ⏱️  5min antes
      Status: agendada
      Agendada para: 05/01/2026, 10:43:43
      Faltam: ~5min
```

### Logs do PM2 (a cada 2 minutos):

```
[NotificacoesAgendadasService] 📋 Encontrados 1 jogos próximos
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 999999: Time Teste A vs Time Teste B (60min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 999999: Time Teste A vs Time Teste B (30min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 999999: Time Teste A vs Time Teste B (15min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 999999: Time Teste A vs Time Teste B (5min antes)
```

### Logs de Disparo (a cada 1 minuto, quando data_agendada <= NOW()):

```
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
[NotificacoesAgendadasService] ✅ Notificação 9999660 processada: Time Teste A vs Time Teste B (60min antes)

[Após 30 min]
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
[NotificacoesAgendadasService] ✅ Notificação 9999630 processada: Time Teste A vs Time Teste B (30min antes)

[Após 45 min - total]
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
[NotificacoesAgendadasService] ✅ Notificação 9999615 processada: Time Teste A vs Time Teste B (15min antes)

[Após 55 min - total]
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
[NotificacoesAgendadasService] ✅ Notificação 9999605 processada: Time Teste A vs Time Teste B (5min antes)
```

---

## 🔧 Comandos Úteis

### Ver Notificações no Banco
```bash
mysql -u root -p bolaovip -e "
SELECT 
  id,
  jogo_id,
  tempo_alerta,
  data_agendada,
  status,
  DATE_FORMAT(data_agendada, '%d/%m/%Y %H:%i:%s') as agendada_br
FROM notificacoes_enviadas_jogos
WHERE jogo_id IN (SELECT id FROM jogos WHERE partida_id = 999999)
ORDER BY tempo_alerta DESC;
"
```

### Ver Jogo de Teste
```bash
mysql -u root -p bolaovip -e "
SELECT 
  id,
  partida_id,
  data,
  time_mandante,
  time_visitante,
  status
FROM jogos
WHERE partida_id = 999999;
"
```

### Limpar Tudo
```bash
node scripts/limparTudoTeste.js
```

---

## ⏱️ Timeline Esperada

**Jogo agendado para 09:48:43 (Manaus)**

| Horário (Manaus) | Evento | Ação |
|---|---|---|
| 08:48:43 | Notificação "60 min antes" | ✅ Disparada |
| 09:18:43 | Notificação "30 min antes" | ✅ Disparada |
| 09:33:43 | Notificação "15 min antes" | ✅ Disparada |
| 09:43:43 | Notificação "5 min antes" | ✅ Disparada |
| 09:48:43 | Jogo começa | 🏟️ Match |

---

## 🆘 Se as Notificações Não Aparecerem

### Verificar Timezone do Servidor
```bash
date
# ou
TZ=America/Manaus date
```

### Reiniciar PM2
```bash
cd /home/jelastic/ROOT/backend
pm2 restart all
```

### Verificar Tabela
```bash
mysql -u root -p bolaovip -e "DESC notificacoes_enviadas_jogos;"
```

### Agendar Manualmente
```bash
node scripts/agendarNotificacoesManual.js
```

---

## 📝 Resumo do Fluxo

1. **Inserir jogo** → `inserirJogoTeste.js`
2. **Cron job** (a cada 2 min) → Detecta jogo e cria 4 notificações
3. **Cron job** (a cada 1 min) → Dispara notificações vencidas
4. **Usuários recebem** → Push notifications nos celulares
5. **Limpar** → `limparTudoTeste.js`

---

**Última atualização:** 2026-01-05  
**Status:** Pronto para teste em produção
