# 🚀 GUIA COMPLETO - BUILD RELEASE APK PARA PRODUÇÃO

## 📋 PRÉ-REQUISITOS

### Ambiente Local
- Node.js 16+ instalado
- Android SDK Platform 34+ (SDK Manager → Android 14.0)
- JDK 11+ (Java Development Kit)
- Git configurado

### Servidor de Hospedagem
- Domínio: **bolaovip.csprojectia.com.br**
- Backend Node.js rodando na porta 443 (HTTPS)
- MySQL disponível
- Certificado SSL válido

---

## 🔧 PASSO 1: ATUALIZAR CREDENCIAIS

### Backend
Verifique/atualize `.env.production`:
```env
DB_HOST=seu_host_db
DB_PASSWORD=sua_senha
JWT_SECRET=nova_chave_secreta
NODE_ENV=production
CORS_ORIGIN=https://bolaovip.csprojectia.com.br
EFI_PIX_SANDBOX=false  # Usar produção do EFI
```

### Frontend
Arquivo `.env.production` já está configurado:
```env
REACT_APP_API_URL=https://bolaovip.csprojectia.com.br
REACT_APP_BUILD_TYPE=production
NODE_ENV=production
```

---

## 📱 PASSO 2: PREPARAR BUILD REACT PARA ANDROID

```powershell
# 1. Navegar ao diretório frontend
cd frontend\bolao-vip

# 2. Instalar dependências
npm install

# 3. Build otimizado para produção
npm run build

# Verificar que a pasta 'build' foi gerada com sucesso
ls build
```

---

## 🔧 PASSO 3: SINCRONIZAR CAPACITOR

```powershell
# Dentro de frontend\bolao-vip

# 1. Instalar Capacitor CLI (se não tiver)
npm install -g @capacitor/cli

# 2. Sincronizar configurações Android
npx cap sync android

# Esperar completar. Isso vai:
# - Copiar arquivos de build para Android
# - Atualizar configurações do Android
# - Criar/atualizar pasta android/
```

---

## 📦 PASSO 4: CONFIGURAR ASSINATURA APK (KEYSTORE)

### Opção A: Usar keystore existente
```powershell
cd frontend\bolao-vip\android

# Verificar se existe release-key.keystore
ls *.keystore
```

### Opção B: Criar novo keystore
```powershell
# Windows PowerShell
cd frontend\bolao-vip\android

# Gerar chave
keytool -genkey -v -keystore release-key.keystore `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias bolaovip-release

# Vai pedir:
# - Senha do keystore: [Digite uma senha forte]
# - Nome: Bolao VIP
# - Organização: CSProjectia
# - Cidade: Sua Cidade
# - Confirmação de senha do alias

# ⚠️ GUARDE ESSAS INFORMAÇÕES SEGURAS!
```

### Registrar credenciais no gradle.properties
Editar: `android/gradle.properties`

```properties
org.gradle.jvmargs=-Xmx4096m

# Release signing
MYAPP_RELEASE_STORE_FILE=release-key.keystore
MYAPP_RELEASE_STORE_PASSWORD=sua_senha_keystore
MYAPP_RELEASE_KEY_ALIAS=bolaovip-release
MYAPP_RELEASE_KEY_PASSWORD=sua_senha_chave
```

---

## 🏗️ PASSO 5: BUILD APK RELEASE NO ANDROID STUDIO

### Via Android Studio (Recomendado)
```powershell
# Abrir Android Studio
cd frontend\bolao-vip\android
# Ou: start .\

# No Android Studio:
# 1. Build → Generate Signed Bundle/APK
# 2. Escolher APK (não Bundle)
# 3. Selecionar keystore criado
# 4. Release build variant
# 5. Gerar APK
# 6. Arquivo será salvo em: app/release/app-release.apk
```

### Via Gradle (Linha de comando)
```powershell
cd frontend\bolao-vip\android

# Build APK Release assinado
.\gradlew assembleRelease `
  -PMYAPP_RELEASE_STORE_FILE=release-key.keystore `
  -PMYAPP_RELEASE_STORE_PASSWORD=sua_senha `
  -PMYAPP_RELEASE_KEY_ALIAS=bolaovip-release `
  -PMYAPP_RELEASE_KEY_PASSWORD=sua_senha

# APK gerado em:
# app\build\outputs\apk\release\app-release.apk
```

---

## 🎯 PASSO 6: TESTAR APK ANTES DE PUBLICAR

```powershell
# Conectar dispositivo Android ao PC via USB
# Ou usar emulador

adb devices  # Listar dispositivos

# Instalar APK
adb install -r app\build\outputs\apk\release\app-release.apk

# Testar no dispositivo:
# 1. Abrir app
# 2. Fazer login
# 3. Testar palpites (requisições HTTP)
# 4. Testar pagamento PIX
# 5. Verificar se conecta em bolaovip.csprojectia.com.br
```

---

## 📤 PASSO 7: DISTRIBUIR O APK

### Opção A: Distribuição Direta
```powershell
# Copiar para servidor de hospedagem
Copy-Item "frontend\bolao-vip\android\app\build\outputs\apk\release\app-release.apk" `
  -Destination "C:\releases\BolaoVIP.apk"

# Ou enviar por email/WhatsApp
```

### Opção B: Publicar em Google Play Store
Ler documentação Google Play Console (requer conta desenvolvedor)

### Opção C: Distribuição QR Code
Hospedar APK em servidor:
```bash
# No servidor
cp BolaoVIP.apk /var/www/bolaovip/apk/
chmod 644 /var/www/bolaovip/apk/BolaoVIP.apk
```

Acessar via: https://bolaovip.csprojectia.com.br/apk/BolaoVIP.apk

---

## ✅ CHECKLIST PRÉ-RELEASE

- [ ] Backend rodando em HTTPS com domínio https://bolaovip.csprojectia.com.br
- [ ] Banco MySQL em produção com dados corretos
- [ ] JWT_SECRET alterado para valor seguro
- [ ] EFI_PIX_SANDBOX=false (produção)
- [ ] Certificados PIX de produção configurados
- [ ] .env.production preenchido corretamente
- [ ] npm run build executado com sucesso
- [ ] npx cap sync android concluído
- [ ] Keystore criado e seguro
- [ ] gradle.properties com credenciais corretas
- [ ] APK assinado testado em dispositivo
- [ ] Conectividade com bolaovip.csprojectia.com.br funcionando
- [ ] Login, palpites e pagamentos testados

---

## 🐛 TROUBLESHOOTING

### "Cannot find module" ou "npm install failed"
```powershell
npm cache clean --force
rm -r node_modules package-lock.json
npm install
```

### Erro de certificado HTTPS
Backend pode estar com SSL inválido. Verificar:
```bash
curl -I https://bolaovip.csprojectia.com.br
```

### APK não conecta ao backend
1. Verificar allowNavigation em capacitor.config.ts
2. Verificar CORS_ORIGIN no backend .env.production
3. Certificar que domínio resolve corretamente

### Gradle build falha
```powershell
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## 📝 NOTAS IMPORTANTES

⚠️ **Segurança:**
- Nunca commitar `.env.production` com senhas reais ao Git
- Keystore deve estar em local seguro
- Usar chaves diferentes para desenvolvimento e produção

🔐 **Credenciais:**
- Guardar senha do keystore em local seguro
- JWT_SECRET deve ser aleatório e forte
- Certificados PIX devem ser de produção

📲 **Versionamento:**
Ao atualizar APK, lembrar de aumentar `versionCode` em `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2  // Aumentar para cada release
        versionName "1.1.0"
    }
}
```

---

## 🎉 SUCESSO!

Após seguir todos os passos, você terá:
✅ APK release assinado e otimizado
✅ Conectado a bolaovip.csprojectia.com.br
✅ Pronto para distribuição a usuários finais
