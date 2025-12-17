# Gerenciador de Tokens API Futebol

## 📋 Visão Geral

Sistema flexível para alternar entre tokens de **desenvolvimento** e **produção** da API Futebol. Permite que o desenvolvedor escolha qual ambiente usar sem modificar código ou reiniciar a aplicação.

## 🚀 Configuração Rápida

### 1. Variáveis de Ambiente (`.env`)

```env
# Tokens API Futebol - Altere API_FUTEBOL_ENVIRONMENT para 'production' ou 'development'
API_FUTEBOL_ENVIRONMENT=development
API_FUTEBOL_DEV_TOKEN=test_e96621e3083f00ec1f644199091a46
API_FUTEBOL_PROD_TOKEN=live_f8c1a04cc46f0273c2eb8dab2f558e
API_FUTEBOL_TOKEN=test_e96621e3083f00ec1f644199091a46  # Fallback
```

## 📦 Componentes

### 1. **TokenConfig** (`backend/config/tokenConfig.js`)
Classe singleton que gerencia os tokens em tempo de execução.

#### Métodos Principais:
```javascript
const tokenConfig = require('./config/tokenConfig');

// Obter token atual
const token = tokenConfig.getToken();

// Obter informações detalhadas
const info = tokenConfig.getTokenInfo();
// Retorna: { token, environment, type, prefix }

// Alterar ambiente
tokenConfig.setEnvironment('production');  // ou 'development'

// Alternar entre dev e prod
tokenConfig.toggleEnvironment();

// Definir token personalizado
tokenConfig.setToken('development', 'novo_token_aqui');

// Ver status de ambos
const status = tokenConfig.getStatus();
```

### 2. **API REST** (`backend/routes/configRoutes.js`)
Endpoints para gerenciar tokens via HTTP.

#### Endpoints:

**GET `/api/config/token-status`**
- Retorna o status atual dos tokens
- Requer autenticação JWT
- Resposta:
```json
{
  "sucesso": true,
  "status": {
    "currentEnvironment": "development",
    "development": {
      "token": "test_e96...",
      "active": true
    },
    "production": {
      "token": "live_f8c...",
      "active": false
    }
  },
  "info": {
    "token": "test_e96621e3083f00ec1f644199091a46",
    "environment": "development",
    "type": "Teste",
    "prefix": "test_"
  }
}
```

**POST `/api/config/toggle-token`**
- Alterna entre desenvolvimento e produção
- Requer autenticação JWT
- Resposta:
```json
{
  "sucesso": true,
  "mensagem": "Token alterado para: production",
  "ambiente": "production",
  "info": { ... }
}
```

**POST `/api/config/set-environment`**
- Define um ambiente específico
- Requer autenticação JWT
- Body: `{ "environment": "development" | "production" }`
- Resposta: `{ sucesso, mensagem, info }`

**POST `/api/config/update-token`**
- Atualiza um token personalizado
- Requer autenticação JWT
- Body: `{ "environment": "development" | "production", "token": "novo_token" }`
- Resposta: `{ sucesso, mensagem, environment, tokenPreview }`

### 3. **CLI Script** (`backend/scripts/tokenManager.js`)
Interface de linha de comando para gerenciar tokens.

#### Uso:
```powershell
# Ver status
node scripts/tokenManager.js status

# Alternar para desenvolvimento
node scripts/tokenManager.js dev

# Alternar para produção
node scripts/tokenManager.js prod

# Alternar entre dev e prod
node scripts/tokenManager.js toggle

# Definir token personalizado
node scripts/tokenManager.js set dev test_novo_token_aqui

# Ver informações detalhadas
node scripts/tokenManager.js info

# Ver ajuda
node scripts/tokenManager.js help
```

## 🔄 Fluxo de Funcionamento

```
┌─────────────────────────────────────────┐
│    .env (Startup - Uma vez)             │
│  - API_FUTEBOL_ENVIRONMENT=development  │
│  - API_FUTEBOL_DEV_TOKEN=...            │
│  - API_FUTEBOL_PROD_TOKEN=...           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  TokenConfig.constructor()              │
│  Lê variáveis e inicia singleton        │
└────────────┬────────────────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │  Escolha do Ambiente:   │
    ├─────────────────────────┤
    │ 1. CLI Script           │
    │ 2. REST API             │
    │ 3. Código JS direto     │
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │  tokenConfig.           │
    │  setEnvironment(env)    │
    └────────────┬────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  getToken() retorna token do ambiente   │
│  Usado por: scheduler.js, services...   │
└─────────────────────────────────────────┘
```

## 🔗 Integração em Serviços

Os seguintes serviços foram atualizados para usar `tokenConfig`:

1. **scheduler.js** - Buscas de rodadas e jogos
2. **consultaResultadosService.js** - Consulta de resultados
3. **consultaTabelaClassificacao.js** - Busca de classificações

### Exemplo de Integração:
```javascript
const tokenConfig = require('../config/tokenConfig');

async function minhaFuncao() {
  const token = tokenConfig.getToken();  // Obtém token do ambiente atual
  
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

## 💾 Persistência

**Importante:** As mudanças de ambiente são **temporárias** durante a execução do servidor.

Para persistir mudanças:
1. **Via `.env`**: Edite `API_FUTEBOL_ENVIRONMENT` antes de iniciar
2. **Via CLI**: Execute `node scripts/tokenManager.js set <env> <token>` (atualiza `.env` dinamicamente durante execução)
3. **Via REST**: Faça requisição POST durante funcionamento da aplicação

## 🧪 Teste Rápido

### 1. Iniciar Backend
```powershell
cd backend
node server.js
```

### 2. Ver Status Atual
```powershell
node scripts/tokenManager.js status
```

### 3. Alternar para Produção
```powershell
node scripts/tokenManager.js prod
```

### 4. Verificar Mudança
```powershell
node scripts/tokenManager.js status
```

### 5. Via API REST
```powershell
# Login primeiro para obter token JWT
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"seu_email","senha":"sua_senha"}'

# Verificar status (substitua JWT_TOKEN)
curl http://localhost:3001/api/config/token-status -H "Authorization: Bearer JWT_TOKEN"

# Alternar
curl -X POST http://localhost:3001/api/config/toggle-token -H "Authorization: Bearer JWT_TOKEN"
```

## 📋 Checklist de Implementação

- ✅ Criado `config/tokenConfig.js` (singleton)
- ✅ Criado `routes/configRoutes.js` (endpoints REST)
- ✅ Criado `scripts/tokenManager.js` (CLI)
- ✅ Atualizado `.env` com variáveis de token dev/prod
- ✅ Atualizado `server.js` para registrar rotas de config
- ✅ Integrado `tokenConfig` em:
  - ✅ `services/scheduler.js`
  - ✅ `services/consultaResultadosService.js`
  - ✅ `services/consultaTabelaClassificacao.js`

## 🔐 Segurança

- Tokens são gerenciados em memória (nunca logados em console do cliente)
- API REST requer autenticação JWT
- Atualizações de token também requerem JWT
- Valores truncados em logs para evitar exposição

## 🐛 Troubleshooting

### Problema: Token não está mudando
**Solução:** Verifique se o serviço está chamando `tokenConfig.getToken()` dinamicamente, não armazenando o token em constante.

### Problema: Erro 401 da API após alternar
**Solução:** Verifique se o novo token está correto e ativo. Use `tokenManager.js info` para confirmar.

### Problema: CLI não encontrado
**Solução:** Execute do diretório `backend/` ou use caminho relativo completo.

## 📞 Contato & Suporte

Para dúvidas ou sugestões sobre o gerenciador de tokens, consulte a documentação do projeto ou o responsável pelo backend.
