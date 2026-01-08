## 📋 DIAGNÓSTICO: Notificações Funcionando Apenas em Foreground

### ✅ Situação Confirmada
- ✓ Notificações só aparecem quando o app está ATIVO na tela do celular
- ✓ Se o usuário abre o Bolão VIP mas muda de app, as notificações NÃO aparecem
- ✓ As notificações só reaparecem quando o app volta ao foreground

---

## 🔍 Análise Técnica

### FRONTEND (React Native/Capacitor)
**Arquivo: `frontend/bolao-vip/src/services/notificationService.js`**

**Como funciona:**
1. Usa `@capacitor/local-notifications` para notificações nativas
2. Agenda notificações com `LocalNotifications.schedule()`
3. Listeners configurados:
   - `localNotificationReceived` - Quando notificação chega em FOREGROUND
   - `localNotificationActionPerformed` - Quando usuário clica

**Problema Identificado:**
```javascript
// Listeners só funcionam quando o app está ativo
await LocalNotifications.addListener(
  'localNotificationReceived',
  (notification) => this.handleNotificationReceived(notification)
);
```

Estes listeners disparam **apenas quando app está em foreground**. Em background, o Capacitor/Android não executa código JavaScript.

---

### FRONTEND (Polling Service)
**Arquivo: `frontend/bolao-vip/src/services/notificationPollingService.js`**

**Como funciona:**
```javascript
// Inicia polling a cada 30 segundos
this.intervalId = setInterval(async () => {
  await this.checkNewNotifications(token);
}, 30000); // 30 segundos
```

**Problema:**
- O `setInterval` roda apenas quando o app está em **foreground**
- Quando app vai para background (usuário muda de app), o JavaScript é pausado
- O intervalo continua dormindo enquanto app está inativo
- Quando app retorna ao foreground, o intervalo acorda e a próxima requisição dispara

**Linha 52-53 em `App.js`:**
```javascript
// Iniciado quando app monta
if (token) {
  console.log('[App] 🔄 Iniciando polling de notificações');
  notificationPollingService.start(token);
}
```

---

### BACKEND (API de Notificações)
**Arquivo: `backend/controllers/notificacoesController.js`**

**Como funciona:**
- Backend armazena notificações em banco de dados
- Frontend faz POLLING (requisições HTTP a cada 30s)
- Backend retorna notificações pendentes
- Frontend dispara notificações nativas quando recebe resposta

**Problema:**
- Backend está **funcionando corretamente** — dados estão no DB
- O problema é **no frontend** — polling está pausado quando app está em background

---

## 🎯 Raiz do Problema

| Cenário | O que acontece |
|---------|---|
| **App em Foreground** | ✅ Polling a cada 30s, notificações aparecem quando chegam |
| **App em Background** | ❌ JavaScript pausado, polling dormindo, notificações não chegam |
| **App retorna Foreground** | ✅ JavaScript acorda, próximo polling dispara, notificações antigas acumuladas aparecem |

---

## 💡 O que é Preciso Mudar

### Opção 1: FRONTEND - Background Tasks (Recomendado)
**Solução:** Implementar background tasks nativas que:
- Continuem fazendo polling mesmo com app em background
- Disparem notificações nativas periodicamente (a cada 30s ou 1min)
- Usem Capacitor Background Task API

**Onde mudar:**
- `frontend/bolao-vip/src/services/notificationPollingService.js`
- `frontend/bolao-vip/src/App.js`

**Como:**
```javascript
// Usar Capacitor Background Task plugin
import { BackgroundTask } from '@capacitor/background-task';

// Executar polling a cada X segundos mesmo em background
BackgroundTask.beforeExit(async () => {
  // Fazer requisição ao backend e disparar notificações
  await checkNewNotifications(token);
  BackgroundTask.finish();
});
```

**Desafios:**
- Android e iOS têm limitações de background - pode drenar bateria
- Precisa de permissão `WAKE_LOCK` no Android
- iOS tem limites de frequência (máx ~15min em background)

---

### Opção 2: BACKEND - Push Notifications (Melhor Prática)
**Solução:** Implementar push notifications reais (FCM/APNS):
- Backend envia push notifications imediatamente quando evento ocorre
- Notificações chegam mesmo com app em background
- Sistema operacional entrega a notificação, app ativa

**Onde mudar:**
- `backend/services/notificacoesAgendadasService.js` (disparar push, não só armazenar)
- Novo arquivo: `backend/services/fcmService.js` (Firebase Cloud Messaging)
- `frontend/` - configurar Firebase/FCM

**Como:**
1. Implementar Firebase Cloud Messaging (FCM) no backend
2. Armazenar FCM tokens dos celulares na database
3. Quando notificação deve disparar, enviar push via FCM
4. Capacitor/Firebase lidam com entrega em background

**Desafios:**
- Requer reconfiguração de Firebase no projeto
- Mais complexo de implementar
- Mas é a solução "certa" para produção

---

### Opção 3: FRONTEND - Aumentar Frequência de Polling
**Solução Temporária:** Reduzir intervalo de polling de 30s para 5-10s
- Notificações aparecerão mais rápido quando app voltar ao foreground
- Não resolve problema de background, mas melhora UX

**Onde mudar:**
- `frontend/bolao-vip/src/services/notificationPollingService.js` linha 35
```javascript
// De 30000 para 10000 (10 segundos)
this.intervalId = setInterval(async () => {
  await this.checkNewNotifications(token);
}, 10000); // Reduzido de 30000
```

---

## 🔧 Recomendação

**Para Bolão VIP (casos de uso):**
- Jogos têm horários programados com 4-10 horas de antecedência
- Notificações não precisam chegar em tempo real (5-10min diferença é aceitável)

**Recomendação:**
1. **Curto prazo:** Opção 3 (aumentar frequência polling)
   - Rápido de implementar
   - Notificações aparecerão quando app retornar
   
2. **Médio prazo:** Opção 1 (Background Tasks)
   - Melhor que polling foreground
   - Funciona sem reconfigurar arquitetura
   
3. **Longo prazo:** Opção 2 (Push Notifications reais)
   - Melhor prática
   - Notificações 100% confiáveis mesmo em background
   - Padrão para apps modernos

---

## 📌 Conclusão

**Problema:** Sistema usa polling em JavaScript, que pausa em background
**Local:** Frontend (`notificationPollingService.js`)
**Impacto:** Notificações atrasadas quando app está em background
**Solução:** Implementar background tasks nativas ou push notifications reais
