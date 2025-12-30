# 📊 VERIFICAÇÃO DE ARQUIVOS .env

## ✅ STATUS DA COMPARAÇÃO

### `.env` (DESENVOLVIMENTO - Local)
```dotenv
DB_HOST=localhost          ✅ Correto para desenvolvimento
DB_USER=root              ✅ Usuário local
EFI_PIX_SANDBOX=true      ✅ Modo teste
EFI_PIX_CERT_PATH=./pix/certificados/homologacao-800847-BoaloVIP.pem  ✅
```

### `.env.production` (PRODUÇÃO - Servidor)
```dotenv
DB_HOST=10.100.48.197     ✅ IP correto do servidor
DB_USER=bolaovip_user     ✅ Novo usuário criado
EFI_PIX_SANDBOX=false     ✅ Modo produção
EFI_PIX_CERT_PATH=./pix/certificados/producao-800847-BoaloVIP.pem  ✅
```

---

## 📋 TABELA COMPARATIVA

| Variável | .env (Local) | .env.production (Prod) | Status |
|----------|---|---|---|
| **DB_HOST** | `localhost` | `10.100.48.197` | ✅ Correto |
| **DB_PORT** | `3306` | `3306` | ✅ Correto |
| **DB_USER** | `root` | `bolaovip_user` | ✅ Correto |
| **DB_PASSWORD** | `isl050382` | `ALTERAR_PARA_SENHA_DO_USUARIO` | ⚠️ Necessário ajuste no servidor |
| **DB_NAME** | `bolaovip` | `bolaovip` | ✅ Correto |
| **JWT_SECRET** | `123` | `123` | ⚠️ Deveria ser diferente |
| **NODE_ENV** | (não existe) | `production` | ✅ Correto |
| **EFI_PIX_SANDBOX** | `true` (teste) | `false` (produção) | ✅ Correto |
| **EFI_PIX_CERT_PATH** | `homologacao-...` | `producao-...` | ✅ Correto |
| **CORS_ORIGIN** | (não existe) | `https://bolaovip.csprojectia.com.br` | ✅ Correto |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **JWT_SECRET inseguro em PRODUÇÃO**
❌ **Problema:** Tanto `.env` quanto `.env.production` têm `JWT_SECRET=123`

✅ **Recomendação:** Alterar para uma chave forte e aleatória em produção

```bash
# Gerar chave segura
openssl rand -base64 32
# Resultado: (copie e cole em .env.production)
```

### 2. **DB_PASSWORD placeholder em .env.production**
⚠️ **Necessário:** Editar no servidor com a senha REAL do `bolaovip_user`

```bash
# No servidor
nano ~/bolaovip/backend/.env
# Alterar: DB_PASSWORD=ALTERAR_PARA_SENHA_DO_USUARIO
#         DB_PASSWORD=sua_senha_real_123
```

---

## ✅ RECOMENDAÇÕES DE SEGURANÇA

### Para PRODUÇÃO (.env.production)

Atualizar as seguintes variáveis:

```dotenv
# 1. JWT_SECRET - GERAR CHAVE FORTE
JWT_SECRET=gerar_com_openssl_rand_base64_32

# 2. DB_PASSWORD - USAR SENHA REAL
DB_PASSWORD=senha_real_do_bolaovip_user

# 3. Adicionar (opcional)
NODE_ENV=production
LOG_LEVEL=error
```

### Para DESENVOLVIMENTO (.env)

Deixar como está, é apenas para testes locais.

---

## 🔧 AÇÕES NECESSÁRIAS NO SERVIDOR

### 1️⃣ Copiar `.env.production` para `.env`
```bash
cd ~/bolaovip/backend
cp .env.production .env
```

### 2️⃣ Editar `.env` com valores reais
```bash
nano .env
```

**Alterar:**
```dotenv
DB_PASSWORD=ALTERAR_PARA_SENHA_DO_USUARIO
# Para:
DB_PASSWORD=senha_real_do_usuario_bolaovip

JWT_SECRET=123
# Para:
JWT_SECRET=sua_chave_gerada_por_openssl_rand
```

### 3️⃣ Reiniciar backend
```bash
cd ~/bolaovip/backend
pkill -f "node server.js"
npm install
node server.js
```

---

## 📝 CHECKLIST

- [ ] `.env.production` tem `DB_HOST=10.100.48.197` ✅
- [ ] `.env.production` tem `DB_USER=bolaovip_user` ✅
- [ ] `.env.production` tem `EFI_PIX_SANDBOX=false` ✅
- [ ] No servidor: `.env` criado com senha real ⚠️ FAZER
- [ ] No servidor: JWT_SECRET alterado para chave segura ⚠️ FAZER
- [ ] No servidor: Backend reiniciado ⚠️ FAZER

---

## 🎯 PRÓXIMAS AÇÕES

1. **Gerar JWT_SECRET seguro**
   ```bash
   # No servidor
   openssl rand -base64 32
   # Copiar o resultado
   ```

2. **Atualizar `.env` no servidor**
   ```bash
   nano ~/bolaovip/backend/.env
   ```
   
   Cole o JWT_SECRET gerado e a senha do `bolaovip_user`

3. **Reiniciar backend**
   ```bash
   cd ~/bolaovip/backend
   pkill -f "node server.js"
   node server.js
   ```

---

**Última atualização:** 30 de dezembro de 2025
