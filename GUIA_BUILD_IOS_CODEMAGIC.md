# 📱 Guia de Build iOS com Codemagic

## 🎯 Pré-requisitos

### 1. Conta Apple Developer ($99/ano)
- Criar em: https://developer.apple.com/programs/
- Necessária para certificados de assinatura

### 2. Conta Codemagic
- Criar em: https://codemagic.io/signup
- Plano gratuito: 500 minutos/mês

---

## 🔐 Passo 1: Gerar Certificados Apple

### No portal Apple Developer (https://developer.apple.com/account):

1. **App ID**:
   - Ir em: Certificates, Identifiers & Profiles > Identifiers
   - Criar App ID com bundle: `br.com.bolaovip`
   - Habilitar: Push Notifications, In-App Purchase (se necessário)

2. **Distribution Certificate**:
   - Ir em: Certificates
   - Criar novo: iOS Distribution (App Store and Ad Hoc)
   - Fazer download do `.cer`
   - Converter para `.p12`:
     ```bash
     # No Mac (ou use Windows com OpenSSL):
     # 1. Importar .cer no Keychain Access
     # 2. Exportar como .p12 com senha
     ```

3. **Provisioning Profile**:
   - Ir em: Profiles
   - Criar: App Store (para produção) ou Ad Hoc (para testes)
   - Selecionar App ID: `br.com.bolaovip`
   - Selecionar certificado criado
   - Fazer download do `.mobileprovision`

---

## 🚀 Passo 2: Configurar Codemagic

### 2.1. Conectar Repositório
1. Login em https://codemagic.io
2. Clicar em **Add application**
3. Conectar GitHub
4. Selecionar repositório: `IcaroLop/BolaoVip`

### 2.2. Fazer Upload dos Certificados
1. No Codemagic, ir em **App Settings > Code signing**
2. **iOS code signing**:
   - Upload Certificate (.p12) + senha
   - Upload Provisioning Profile (.mobileprovision)
   - Vincular ao bundle ID: `br.com.bolaovip`

### 2.3. Configurar Variáveis de Ambiente (opcional)
Se for publicar automaticamente na App Store:
- `APP_STORE_CONNECT_PRIVATE_KEY`
- `APP_STORE_CONNECT_KEY_IDENTIFIER`
- `APP_STORE_CONNECT_ISSUER_ID`

Obter em: https://appstoreconnect.apple.com/access/api

---

## ⚙️ Passo 3: Executar Build

### Opção A: Build Manual
1. No Codemagic, selecionar app **BolaoVip**
2. Clicar em **Start new build**
3. Selecionar workflow: `ios-workflow`
4. Selecionar branch: `master`
5. Clicar em **Start build**

### Opção B: Build Automático
- Já configurado no `codemagic.yaml`
- Todo push na branch `master` dispara build automaticamente

---

## 📦 Passo 4: Baixar o .ipa

Após build concluído (15-25 minutos):

1. Codemagic envia email com link para download
2. Ou acesse: **App > Builds > [última build] > Artifacts**
3. Fazer download do arquivo `.ipa`

---

## 📲 Passo 5: Distribuir o App

### Opção A: TestFlight (testes internos)
1. Acessar: https://appstoreconnect.apple.com
2. My Apps > **Bolao VIP** > TestFlight
3. Upload manual do .ipa ou automático (configurar API key)

### Opção B: App Store (produção)
1. TestFlight primeiro para validação
2. Depois: App Store Connect > Submit for Review

### Opção C: Ad Hoc (instalação direta - 100 dispositivos)
- Compartilhar .ipa + provisioning profile
- Instalar via Xcode/Diawi/TestApp.io

---

## 🛠️ Troubleshooting

### Erro: "Code signing failed"
- Verificar se certificado e provisioning profile estão válidos
- Confirmar bundle ID correto: `br.com.bolaovip`
- Checar se dispositivos registrados (para Ad Hoc)

### Erro: "Build failed - npm install"
- Verificar `package.json` e versões do Node.js (codemagic.yaml usa Node 18)

### Erro: "CocoaPods install failed"
- Verificar `ios/App/Podfile`
- Executar `pod repo update` localmente e commitar mudanças

### Build demora muito
- Plano gratuito: 500 min/mês (suficiente para ~20 builds)
- Otimizar: usar cache de dependências (já configurado)

---

## 📋 Checklist Final

Antes do primeiro build:

- [ ] Conta Apple Developer ativa ($99/ano)
- [ ] App ID criado: `br.com.bolaovip`
- [ ] Certificado Distribution (.p12) + senha
- [ ] Provisioning Profile (.mobileprovision)
- [ ] Conta Codemagic criada
- [ ] Repositório conectado no Codemagic
- [ ] Certificados uploadados no Codemagic
- [ ] Email correto no `codemagic.yaml` (linha 52)
- [ ] Push do código para branch `master`

---

## 📞 Suporte

- **Codemagic Docs**: https://docs.codemagic.io/
- **Apple Developer**: https://developer.apple.com/support/
- **Capacitor iOS**: https://capacitorjs.com/docs/ios

---

## 💰 Custos Estimados

| Item | Custo | Frequência |
|------|-------|------------|
| Apple Developer | $99 | Anual |
| Codemagic (plano free) | $0 | Mensal (500 min) |
| Codemagic (plano Pro) | $99 | Mensal (ilimitado) |

**Total mínimo inicial**: $99/ano (apenas Apple Developer)
