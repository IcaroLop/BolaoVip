# 📲 Sistema de Notificações Push - BolaoVip

## ✅ Implementação Concluída

Sistema de notificações nativas Android foi implementado com sucesso. O app mobile agora dispara alertas push quando faltam **60, 30, 15 e 5 minutos** para um jogo/rodada começar.

---

## 🎯 Arquitetura da Solução

### **Frontend (React + Capacitor)**
- `src/services/notificationService.js` - Gerencia notificações locais
- `src/App.js` - Inicializa plugin e configura listeners
- Plugin: `@capacitor/local-notifications` (nativo Android)

### **Backend (Node.js)**
- `services/notificacoesAgendadasService.js` - Lógica de agendamento
- `controllers/notificacoesAgendadasController.js` - API endpoints
- `routes/notificacoesAgendadasRoutes.js` - Rotas HTTP
- `jobs/cronJobs.js` - 3 novos jobs de cron para gerenciar notificações
- `database/notificacoes_enviadas` - Tabela de rastreamento

---

## 📋 Fluxo de Funcionamento

### **1. Agendamento de Notificações (Job cada 2 minutos)**
```
Backend cron → Busca rodadas nos próximos 70 minutos
            → Para cada rodada, agenda 4 notificações (60, 30, 15, 5 min antes)
            → Salva na tabela notificacoes_enviadas
```

### **2. Disparo de Notificações (Job cada 1 minuto)**
```
Backend cron → Busca notificações com data_agendada <= NOW()
            → Marca como "enviada" no banco
            → APK recebe via Local Notifications (nativa Android)
```

### **3. Ação do Usuário**
```
Usuário clica em notificação push
              ↓
        App abre automaticamente
              ↓
      Navega para PalpitePage
              ↓
      Mostra palpites da rodada
```

---

## 🔧 Configuração do Banco de Dados

Tabela criada automaticamente: `notificacoes_enviadas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INT | ID primário |
| rodada_id | INT | ID da rodada (FK) |
| campeonato_id | INT | ID do campeonato |
| tempo_alerta | INT | 60, 30, 15 ou 5 minutos |
| notification_id | BIGINT | ID único da notificação |
| data_agendada | DATETIME | Quando deve disparar |
| status | ENUM | agendada/enviada/expirada/cancelada |
| created_at | TIMESTAMP | Data de criação |

---

## 🚀 Jobs de Cron Implementados

### **Job 6: Agendar Notificações (a cada 2 min)**
```javascript
cron.schedule('*/2 * * * *', async () => {
  await notificacoesAgendadasService.agendarNotificacoesRodadas();
});
```
- ✅ Busca rodadas próximas (< 70 min)
- ✅ Calcula tempos de disparo (60, 30, 15, 5 min antes)
- ✅ Evita duplicatas com UNIQUE INDEX

### **Job 7: Disparar Notificações (a cada 1 min)**
```javascript
cron.schedule('* * * * *', async () => {
  await notificacoesAgendadasService.dispararNotificacoesPendentes();
});
```
- ✅ Processa notificações vencidas
- ✅ Marca como "enviada" no banco
- ✅ Log detalhado de cada notificação

### **Job 8: Limpar Expiradas (às 03:00 AM)**
```javascript
cron.schedule('0 3 * * *', async () => {
  await notificacoesAgendadasService.limparNotificacoesExpiradas();
});
```
- ✅ Remove notificações > 24h antigas
- ✅ Libera espaço no banco

---

## 📡 Endpoints da API

### **POST /notificacoes-agendadas/agendar**
Agenda notificações para uma rodada (uso manual/admin)
```javascript
{
  "rodada_id": 18,
  "campeonato_id": 10,
  "data_inicio": "2025-01-05T15:45:00Z"
}
```

### **GET /notificacoes-agendadas/pendentes**
Retorna notificações que devem disparar agora (interno)

### **POST /notificacoes-agendadas/marcar-enviada**
Marca notificação como enviada
```javascript
{ "notificacao_id": 1 }
```

### **DELETE /notificacoes-agendadas/rodada/:rodada_id**
Cancela todas as notificações de uma rodada

### **GET /notificacoes-agendadas/historico**
Lista histórico de notificações

---

## 📱 Como Funciona no App Mobile

### **1. Inicialização (App.js)**
```javascript
// Startup
notificationService.init() // Solicita permissão, configura listeners

// Listener para clique
window.addEventListener('notificacaoClicada', (event) => {
  const { rodada } = event.detail;
  navigate(`/palpites?rodada=${rodada}`);
});
```

### **2. Notificação Recebida**
Exemplo de notificação Android:
```
⚽ Rodada 18
Brasileirão 2025
Faltam 60min para começar

[CONFIRA SEU PALPITE]
```

### **3. Usuário Clica**
- Abre o app automaticamente
- Navega para `/palpites?rodada=18`
- Seleciona a rodada
- Mostra os palpites

---

## ✅ Permissões Android

Automáticas:
- `android.permission.POST_NOTIFICATIONS` (Android 13+)
- `android.permission.SCHEDULE_EXACT_ALARM`

Já configuradas em `capacitor.config.ts`:
```typescript
server: {
  cleartext: true,
  allowNavigation: ['http://192.168.56.127:3001', ...]
}
```

---

## 🧪 Teste Manual

### **Opção 1: Gerar Notificação Imediata**
```bash
# Via terminal - criar notificação para 1 minuto no futuro
curl -X POST http://localhost:3001/notificacoes-agendadas/agendar \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rodada_id": 18,
    "campeonato_id": 10,
    "data_inicio": "2025-01-05T16:05:00Z"
  }'
```

### **Opção 2: Simular no Navegador**
```javascript
// Console do navegador
notificationService.agendarNotificacao(
  1, // 1 minuto
  18, // Rodada
  'Brasileirão', // Campeonato
  new Date(Date.now() + 61000), // +61 segundos = dispara em 60 segundos
  1860 // notification ID
);
```

### **Opção 3: Aguardar Cron**
- Esperar 2 minutos (Job de agendamento)
- Esperar 1 minuto (Job de disparo)
- Notificação deve aparecer na barra de status

---

## 📊 Monitoramento

### **Ver Notificações Pendentes**
```sql
SELECT * FROM notificacoes_enviadas 
WHERE status = 'agendada' 
ORDER BY data_agendada ASC;
```

### **Ver Histórico**
```sql
SELECT * FROM notificacoes_enviadas 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY data_agendada DESC;
```

### **Logs do Backend**
```
[NotificacoesAgendadasService] 🔔 Verificando rodadas próximas...
[NotificacoesAgendadasService] 📋 Encontradas 2 rodadas próximas
[NotificacoesAgendadasService] ✅ Notificação agendada: Rodada 18 (60min antes)
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
```

---

## 🐛 Solução de Problemas

### **Notificação não aparece no celular**

1. **Verificar permissões**
   - Settings → Apps → BolaoVip → Notifications → ON

2. **Checar backend está rodando**
   - `node C:\BolaoVIP\backend\server.js`

3. **Confirmar mesmo IP**
   - Backend: `http://192.168.56.127:3001`
   - Celular na mesma Wi-Fi

4. **Ver logs do APK**
   - Android Studio → Logcat
   - Filtrar: `NotificationService`

5. **Testar manualmente**
   ```javascript
   // Console do app (DevTools)
   notificationService.agendarNotificacao(
     0.1, // 0.1 minuto = 6 segundos
     18,
     'Teste',
     new Date(Date.now() + 6000),
     9999
   );
   ```

### **Notificação aparece mas não abre app**
- Verificar `handleNotificationClick` em [notificationService.js](../../frontend/bolao-vip/src/services/notificationService.js)
- Checar listener em [App.js](../../frontend/bolao-vip/src/App.js)

---

## 📦 Arquivos Criados/Modificados

### **Frontend**
- ✅ [src/services/notificationService.js](../../frontend/bolao-vip/src/services/notificationService.js) - Novo
- ✅ [src/App.js](../../frontend/bolao-vip/src/App.js) - Modificado

### **Backend**
- ✅ [services/notificacoesAgendadasService.js](../../services/notificacoesAgendadasService.js) - Novo
- ✅ [controllers/notificacoesAgendadasController.js](../../controllers/notificacoesAgendadasController.js) - Novo
- ✅ [routes/notificacoesAgendadasRoutes.js](../../routes/notificacoesAgendadasRoutes.js) - Novo
- ✅ [jobs/cronJobs.js](../../jobs/cronJobs.js) - Modificado (3 jobs novos)
- ✅ [server.js](../../server.js) - Modificado (rota nova)
- ✅ [database/migrations/criar_tabela_notificacoes_enviadas.sql](../../database/migrations/criar_tabela_notificacoes_enviadas.sql) - Novo

---

## 🎯 Próximos Passos (Opcional)

1. **Customizar ícone da notificação**
   - Editar em `android/app/src/main/res/drawable/`

2. **Som/Vibração personalizado**
   - Adicionar `sound`, `vibration` em [notificationService.js](../../frontend/bolao-vip/src/services/notificationService.js)

3. **Deep link para rodada específica**
   - Já implementado via `?rodada=X` em URL

4. **Dashboard admin**
   - Página para gerenciar notificações agendadas

---

**Status:** ✅ Pronto para teste  
**APK Debug:** `frontend/bolao-vip/android/app/build/outputs/apk/debug/app-debug.apk`  
**Última atualização:** 29/12/2024
