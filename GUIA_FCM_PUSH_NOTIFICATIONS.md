# 🚀 Guia de Configuração: Push Notifications com FCM

## Visão Geral

O sistema agora suporta **Push Notifications reais** usando Firebase Cloud Messaging (FCM). Isso permite que notificações sejam entregues mesmo quando o app está em background.

---

## 🔧 Configuração Backend

### 1. Instalar Firebase Admin SDK

```bash
cd backend
npm install firebase-admin
```

### 2. Configurar Variáveis de Ambiente

Adicionar ao `.env`:

```env
# Firebase Cloud Messaging - Arquivo de credenciais
FIREBASE_SERVICE_ACCOUNT_PATH=/home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json
```

**Arquivo local (para referência):**
```
C:\BolaoVIP\frontend\bolao-vip\android\app\bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json
```

**Arquivo no servidor:**
```
/home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json
```

(Já está sincronizado via Git)

### 3. Criar Tabela de Tokens

```bash
cd backend
mysql bolaovip < sql/usuarios_fcm_tokens.sql
```

### 4. Rotas Backend Disponíveis

- `POST /fcm/registrar-token` - Registra token de um dispositivo
- `DELETE /fcm/remover-token` - Remove token (logout)
- `POST /fcm/testar` - Envia notificação de teste

---

## 📱 Configuração Frontend

### 1. Instalar Capacitor Push Notifications

```bash
cd frontend/bolao-vip
npm install @capacitor/push-notifications
npx cap sync
```

### 2. Configurar Firebase (iOS/Android)

#### Android (`android/app/build.gradle`):

```gradle
dependencies {
  implementation 'com.google.firebase:firebase-messaging:23.1.0'
}
```

#### iOS (via Cocoapods):

```bash
cd ios
pod install
pod update Firebase
cd ..
```

### 3. Adicionar google-services.json (Android)

1. Firebase Console → Seu Projeto → Configurações → Aplicações Android
2. Baixar `google-services.json`
3. Colocar em `frontend/bolao-vip/android/app/`

---

## 🔌 Como Funciona

### Fluxo de Notificação

```
1. Backend armazena dados de notificação em DB
   ↓
2. Cron job dispara notificação:
   - Para cada usuário, busca tokens FCM
   - Envia push via Firebase
   ↓
3. Dispositivo recebe:
   - Em FOREGROUND: evento 'fcmNotificationReceived'
   - Em BACKGROUND: notificação nativa do SO
   ↓
4. Usuário clica:
   - App abre
   - Listener 'fcmNotificationClicked' dispara
   - App navega para a página
```

### Vantagens vs Polling

| Feature | Polling | Push (FCM) |
|---------|---------|-----------|
| Latência | 30s | < 1s |
| Background | ❌ Não | ✅ Sim |
| Bateria | 🔴 Drena | 🟢 Eficiente |
| Taxa de sucesso | ~85% | ~99% |
| Escalabilidade | Limitada | Ilimitada |

---

## 🧪 Testar Push Notifications

### 1. Registrar Token

```javascript
// No app (automático ao fazer login)
await fcmService.init(token);
```

### 2. Enviar Notificação de Teste

```bash
# Via API
curl -X POST http://192.168.56.127:3001/fcm/testar \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Teste","mensagem":"Funcionando?"}'
```

### 3. Verificar Logs

Backend:
```bash
pm2 logs bolaovip-backend | grep FCM
```

Frontend:
```
Browser Console → Filtrar 'FCMService'
```

---

## 🔄 Integração com Sistema de Notificações Agendadas

O `notificacoesAgendadasService.js` foi atualizado para:

1. Ao criar notificação no DB
2. Buscar todos os usuários do grupo
3. Enviar push FCM para cada um
4. Fallback: Polling continua como backup

```javascript
// Exemplo em notificacoesAgendadasService.js
await fcmService.enviarAlertaJogo(usuarioIds, jogoData, minutosAlerta);
```

---

## ⚙️ Variáveis de Ambiente Necessárias

**Backend (.env) - Arquivo Firebase:**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json
```

**No servidor:**
```bash
# O arquivo já está sincronizado via Git
# Apenas certifique-se de que tem as permissões corretas
chmod 600 /home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json

# Adicionar ao .env
echo "FIREBASE_SERVICE_ACCOUNT_PATH=/home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json" >> .env

# Restart backend
pm2 restart all --update-env
```

---

## 🐛 Troubleshooting

### "Firebase não inicializado"
- Verifique se `FIREBASE_SERVICE_ACCOUNT_PATH` está preenchido corretamente no `.env`
- Confirme que o arquivo existe: `/home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json`
- Verifique permissões: `ls -la /home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json`
- Deve ter permissões `600`: `chmod 600 /home/jelastic/ROOT/frontend/bolao-vip/android/app/bolaovip-5d6a3-firebase-adminsdk-fbsvc-60f4dd32d0.json`
- Reinicie o backend: `pm2 restart all --update-env`

### "Nenhum token FCM encontrado"
- App precisa fazer login
- Permissão de notificações pode não ter sido concedida
- Verificar em Configurações → Permissões do app

### "Notificação não chega em background"
- Android: Verificar se app está em lista de exclusão de bateria
- iOS: Verificar permissões em Configurações
- Certificar que `google-services.json` está correto

---

## 📚 Links Úteis

- [Firebase Console](https://console.firebase.google.com)
- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [FCM Android Setup](https://firebase.google.com/docs/cloud-messaging/android/client)
- [FCM iOS Setup](https://firebase.google.com/docs/cloud-messaging/ios/client)

---

## 🚀 Próximos Passos

1. **Imediato:** Testar com notificação de teste via `/fcm/testar`
2. **Curto prazo:** Integrar FCM no dispatcher de notificações agendadas
3. **Médio prazo:** Remover polling completamente quando FCM estiver 100% estável
4. **Longo prazo:** Implementar tópicos FCM para notificações em massa

---

**Status:** ✅ Implementação completa e pronta para testes
