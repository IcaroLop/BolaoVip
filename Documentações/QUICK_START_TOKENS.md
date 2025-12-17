# QUICK START - Gerenciador de Tokens

## 🚀 3 Formas de Usar

### 1️⃣ **CLI (Linha de Comando)** - MAIS RÁPIDO

```powershell
cd backend

# Ver qual está ativo
node scripts/tokenManager.js status

# Trocar para produção
node scripts/tokenManager.js prod

# Trocar para desenvolvimento
node scripts/tokenManager.js dev

# Alternar (dev ↔ prod)
node scripts/tokenManager.js toggle
```

### 2️⃣ **API REST** - VIA HTTP

```powershell
# Login para pegar JWT
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"seu_email","senha":"sua_senha"}'

# Ver status (substitua com seu JWT_TOKEN)
curl http://localhost:3001/api/config/token-status -H "Authorization: Bearer JWT_TOKEN"

# Alternar token
curl -X POST http://localhost:3001/api/config/toggle-token -H "Authorization: Bearer JWT_TOKEN"

# Definir ambiente específico
curl -X POST http://localhost:3001/api/config/set-environment \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environment":"production"}'
```

### 3️⃣ **Código JavaScript** - NO SEU SCRIPT

```javascript
const tokenConfig = require('./config/tokenConfig');

// Obter token atual
const token = tokenConfig.getToken();

// Trocar ambiente
tokenConfig.setEnvironment('production');

// Ver tudo
console.log(tokenConfig.getStatus());
```

---

## 📝 Variáveis de Ambiente (`.env`)

```env
API_FUTEBOL_ENVIRONMENT=development      # Qual usar: development | production
API_FUTEBOL_DEV_TOKEN=test_e96621e...    # Token de teste
API_FUTEBOL_PROD_TOKEN=live_f8c1a0...    # Token de produção
```

---

## ✅ O Que Funciona

- ✅ Alterar token **sem reiniciar** servidor
- ✅ Via CLI, API ou código
- ✅ Todos os serviços sincronizados (scheduler, resultados, classificação)
- ✅ Logs mostram qual ambiente está ativo

---

## 🎯 Recomendações

| Situação | Usar |
|----------|------|
| Testes locais | **CLI** `node tokenManager.js dev` |
| Integração contínua | **Variável .env** `API_FUTEBOL_ENVIRONMENT=prod` |
| Dashboard admin | **REST API** POST `/api/config/toggle-token` |
| Scripts automatizados | **JS** `tokenConfig.setEnvironment('prod')` |

---

## 📊 Arquivo de Status

Para verificar qual token está ativo:

```powershell
node scripts/tokenManager.js info
```

Output:
```
ℹ️  Informações do Token Atual:

   Ambiente: development
   Tipo: Teste
   Prefixo: test_
   Token completo: test_e96621e3083f00ec1f644199091a46
```

---

**Dúvidas?** Veja `GERENCIADOR_TOKENS.md` para documentação completa.
