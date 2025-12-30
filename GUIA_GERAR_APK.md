# 📱 Guia Completo - Gerar APK do BolaoVip

## ✅ Configuração Concluída

O projeto já está configurado com Capacitor! Agora você pode gerar APKs para testar no celular.

---

## 🎯 FASE 1: Modo Local (ATUAL)

### Pré-requisitos

1. **Backend rodando** na rede local
2. **PC e celular na mesma WiFi**
3. **Java JDK 11+** instalado
4. **Android Studio** (será baixado automaticamente na primeira vez)

### Configuração de Rede

O backend deve estar acessível em: `http://192.168.56.127:3001`

**Verificar IP do backend:**
```powershell
# No arquivo backend/.env
IP_HOST_DEV=192.168.56.127
```

**Iniciar backend:**
```powershell
cd C:\BolaoVIP\backend
node server.js
```

---

## 🔨 Comandos para Gerar APK

### 1. Build do React (sempre que mudar código)
```powershell
cd C:\BolaoVIP\frontend\bolao-vip
npm run build
```

### 2. Sincronizar com Android
```powershell
npx cap sync android
```

### 3. Abrir no Android Studio
```powershell
npx cap open android
```

**Primeira vez:**
- Android Studio será baixado automaticamente
- Aguarde a instalação do Gradle (pode demorar 5-10 minutos)
- Aceite as licenças quando solicitado

### 4. Gerar APK no Android Studio

**Opção A - APK Debug (mais rápido):**
1. No menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. Aguarde a conclusão (1-3 minutos)
3. Clique em `locate` no popup para abrir a pasta do APK
4. Arquivo estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opção B - Via Terminal (sem Android Studio):**
```powershell
cd C:\BolaoVIP\frontend\bolao-vip\android
.\gradlew.bat assembleDebug
```
APK gerado em: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 📲 Instalando APK no Celular

### Método 1: Via USB
1. Conecte celular no PC via USB
2. Ative **Depuração USB** nas opções de desenvolvedor
3. Copie o APK para o celular
4. Abra o arquivo e instale

### Método 2: Via WhatsApp/Email
1. Envie o arquivo `app-debug.apk` para você mesmo
2. Baixe no celular
3. Permita instalação de fontes desconhecidas
4. Instale

### Método 3: Direto do Android Studio
1. Conecte celular via USB
2. No Android Studio: `Run` → `Run 'app'`
3. Selecione seu dispositivo na lista

---

## 🔄 Workflow de Desenvolvimento

### Quando Mudar Código React:
```powershell
# 1. Build
npm run build

# 2. Sincronizar
npx cap sync android

# 3. Gerar novo APK
cd android
.\gradlew.bat assembleDebug
```

### Quando Mudar Apenas Backend:
- **NÃO precisa** rebuild do APK
- Basta reiniciar o backend
- APK continuará funcionando

---

## 🌐 FASE 2: Migração para Produção (FUTURO)

### Quando Hospedar Backend Externamente:

**1. Atualizar config:**
```javascript
// frontend/bolao-vip/src/config.js
// Trocar LOCAL_API para PRODUCTION_API

// ANTES:
const LOCAL_API = 'http://192.168.56.127:3001';

// DEPOIS:
const PRODUCTION_API = 'https://bolaovip-api.railway.app'; // Seu domínio
```

**2. Rebuild completo:**
```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease  # APK de produção (assinado)
```

---

## 🐛 Solução de Problemas

### APK não conecta ao backend
- **Verifique:** PC e celular na mesma WiFi
- **Teste:** Abra `http://192.168.1.23:3001` no navegador do celular
- **Se falhar:** Firewall do Windows pode estar bloqueando

### Erro "Cleartext HTTP not allowed"
- Android 9+ bloqueia HTTP por padrão
- Já configurado no `capacitor.config.ts`
- Se persistir, veja `android/app/src/main/AndroidManifest.xml`

### Gradle Build Failed
```powershell
# Limpar cache e rebuildar
cd C:\BolaoVIP\frontend\bolao-vip\android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### "SDK not found"
- Baixe Android SDK via Android Studio
- Defina `ANDROID_HOME` nas variáveis de ambiente
- Caminho típico: `C:\Users\SeuNome\AppData\Local\Android\Sdk`

---

## 📊 Checklist Pré-Build

- [ ] Backend rodando em `http://192.168.56.127:3001`
- [ ] PC e celular na mesma rede WiFi
- [ ] MySQL rodando com banco `bolaovip`
- [ ] `npm run build` executado sem erros
- [ ] Java JDK 11+ instalado
- [ ] Porta 3001 liberada no Firewall

---

## 🔐 Configurações Avançadas

### Mudar Nome do App
```typescript
// frontend/bolao-vip/capacitor.config.ts
export default {
  appId: 'br.com.bolaovip',
  appName: 'Bolao VIP',  // Altere aqui
  // ...
}
```

### Mudar Ícone/Splash
1. Substitua os arquivos em `android/app/src/main/res/`
2. Use ferramenta: https://icon.kitchen/

### Ativar HTTPS Local (Opcional)
- Use **ngrok**: `ngrok http 3001`
- Atualiza `config.js` com URL `https://xxxx.ngrok.io`

---

## 📝 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `frontend/bolao-vip/capacitor.config.ts` | Configuração Capacitor |
| `frontend/bolao-vip/src/config.js` | URL da API (local/produção) |
| `frontend/bolao-vip/android/` | Projeto Android nativo |
| `android/app/build/outputs/apk/debug/` | APKs gerados |

---

## 🚀 Comandos Rápidos

```powershell
# Build completo + APK em um comando
cd C:\BolaoVIP\frontend\bolao-vip
npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug && cd ..\..\..\..

# Localizar APK gerado
explorer C:\BolaoVIP\frontend\bolao-vip\android\app\build\outputs\apk\debug

# Limpar tudo e recomeçar
cd C:\BolaoVIP\frontend\bolao-vip\android
.\gradlew.bat clean
cd ..
npx cap sync android
```

---

## 💡 Dicas

- **APK Debug vs Release**: Debug não precisa assinatura, Release sim (para Google Play)
- **Tamanho**: APK inicial ~50-70 MB (normal para React + Capacitor)
- **Performance**: Nativa, similar a apps nativos
- **Hot Reload**: Use `npx cap run android` para desenvolvimento com reload automático
- **Logs**: `npx cap run android -l` mostra console.log no terminal

---

## 📞 Suporte

Dúvidas? Verifique:
1. Logs do backend: `C:\BolaoVIP\backend\server.js` console
2. Logs do APK: Android Studio → Logcat
3. Network Inspector: Chrome DevTools (para web)
4. Documentação Capacitor: https://capacitorjs.com/docs

---

**Status:** ✅ Configuração completa  
**Última atualização:** 28/12/2024  
**Versão Capacitor:** 7.x
