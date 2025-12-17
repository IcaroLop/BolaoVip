# 🎯 Arquitetura Visual do Sistema de Tokens

## Fluxo Completo

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    INICIALIZAÇÃO DO SISTEMA                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                            │
                            ▼
            ┌───────────────────────────────┐
            │   .env (Lido Uma Vez)         │
            ├───────────────────────────────┤
            │ API_FUTEBOL_ENVIRONMENT       │
            │ API_FUTEBOL_DEV_TOKEN         │
            │ API_FUTEBOL_PROD_TOKEN        │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  TokenConfig (Singleton)      │
            ├───────────────────────────────┤
            │ • tokens: {dev, prod}         │
            │ • currentEnvironment          │
            │ • Métodos GET/SET             │
            └───────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │   CLI    │  │ REST API │  │    JS    │
        │ Script   │  │ Endpoints│  │  Code    │
        └──────────┘  └──────────┘  └──────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  setEnvironment(env)          │
            │  Atualiza currentEnvironment  │
            └───────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Scheduler │  │ Results  │  │ Tables   │
        │  getToken│  │ getToken │  │getToken()│
        └──────────┘  └──────────┘  └──────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   API Futebol (api-futebol)   │
            │   https://api.api-futebol...  │
            │   Authorization: Bearer TOKEN │
            └───────────────────────────────┘
```

---

## Componentes Detalhados

### 1. TokenConfig Class

```
┌─────────────────────────────────────────────────────┐
│         TokenConfig (Singleton Instance)            │
├─────────────────────────────────────────────────────┤
│ Properties:                                         │
│   • tokens: { development: 'test_...', ...}       │
│   • currentEnvironment: 'development'              │
│                                                     │
│ Methods:                                            │
│   ✓ getToken()                                     │
│   ✓ setEnvironment(env)                           │
│   ✓ toggleEnvironment()                           │
│   ✓ setToken(env, token)                          │
│   ✓ getStatus()                                   │
│   ✓ getTokenInfo()                                │
└─────────────────────────────────────────────────────┘
```

### 2. CLI Interface

```
tokenManager.js
├── status        → Mostra status de ambos
├── dev           → setEnvironment('development')
├── prod          → setEnvironment('production')
├── toggle        → toggleEnvironment()
├── set <env> <t> → setToken(env, token)
├── info          → getTokenInfo()
└── help          → Mostra comandos disponíveis
```

### 3. REST API Routes

```
/api/config/
├── GET  /token-status
│   └── Retorna: { status, info }
│
├── POST /toggle-token
│   └── Retorna: { novo_ambiente, info }
│
├── POST /set-environment
│   ├── Body: { environment }
│   └── Retorna: { sucesso, info }
│
└── POST /update-token
    ├── Body: { environment, token }
    └── Retorna: { sucesso, tokenPreview }
```

---

## Fluxo de Requisição HTTP

```
┌─────────────┐
│   Cliente   │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/config/toggle-token
       │ Authorization: Bearer JWT_TOKEN
       │
       ▼
┌──────────────────────────────────┐
│   Express Server (Port 3001)     │
├──────────────────────────────────┤
│ middleware: authMiddleware       │
│  └─ Extrai usuario do JWT       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   configRoutes Handler           │
├──────────────────────────────────┤
│ router.post('/toggle-token', ..  │
│  1. Valida autenticação         │
│  2. Chama tokenConfig.toggle()  │
│  3. Monta resposta JSON         │
│  4. Retorna res.json()          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   TokenConfig (Atualizado)       │
├──────────────────────────────────┤
│ currentEnvironment: 'production' │
│ próximo getToken(): live_...     │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Response JSON                  │
├──────────────────────────────────┤
│ {                                │
│   sucesso: true,                │
│   ambiente: 'production',        │
│   info: { ... }                 │
│ }                               │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│   Cliente Recebe                 │
│   Token alterado com sucesso!    │
└──────────────────────────────────┘
```

---

## Integração com Serviços

```
scheduler.js
├─ buscarRodadaVigente()
│  └─ headers: { Authorization: Bearer ${getToken()} }
│     └─ Chama tokenConfig.getToken() dinamicamente
│
├─ atualizarJogosDaRodada(rodada)
│  └─ headers: { Authorization: Bearer ${getToken()} }
│
└─ Sempre obtém token atual do TokenConfig

consultaResultadosService.js
├─ Função anônima (linha 103+)
│  └─ const TOKEN = tokenConfig.getToken()
│  └─ Lê token ATUAL quando executada
│
└─ Resultado: Sempre usa token ativo do ambiente

consultaTabelaClassificacao.js
├─ buscarTabelaClassificacao(campeonatoId)
│  └─ const TOKEN = tokenConfig.getToken()
│  └─ headers: { Authorization: Bearer ${TOKEN} }
│
└─ Dinâmico: getToken() é chamado na requisição
```

---

## Ciclo de Vida de Uma Requisição de API

```
1. CLIENT SIDE
   ┌─────────────────────────────┐
   │ Clica em: "Alternar Token"  │
   └──────────┬──────────────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ Envia POST /toggle-token    │
   │ Com JWT no header           │
   └──────────┬──────────────────┘
              │
2. SERVER SIDE
              │
              ▼
   ┌─────────────────────────────┐
   │ authMiddleware              │
   │ • Valida JWT                │
   │ • Extrai usuario            │
   └──────────┬──────────────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ configRoutes Handler        │
   │ • Chama toggleEnvironment() │
   └──────────┬──────────────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ TokenConfig.toggle()        │
   │ • development → production  │
   │ • production → development  │
   └──────────┬──────────────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ Próximas requisições        │
   │ getToken() retorna novo     │
   │ todos os serviços sincr     │
   └──────────┬──────────────────┘
              │
3. CLIENT SIDE
              │
              ▼
   ┌─────────────────────────────┐
   │ Recebe resposta JSON        │
   │ {                           │
   │   sucesso: true,            │
   │   ambiente: 'production'    │
   │ }                           │
   └─────────────────────────────┘
```

---

## Persistência de Estado

```
┌─────────────────────────────┐
│   Runtime State (Memory)    │
├─────────────────────────────┤
│ TokenConfig.currentEnviron  │
│ - Vive enquanto servidor    │
│   está ativo                │
│ - Perdido ao reiniciar      │
│ - Visível apenas em este    │
│   servidor                  │
└─────────────────────────────┘

vs

┌─────────────────────────────┐
│   .env (Persistido)         │
├─────────────────────────────┤
│ API_FUTEBOL_ENVIRONMENT     │
│ - Lido no startup           │
│ - Sobrevive reinicializações│
│ - Padrão inicial            │
└─────────────────────────────┘

FLUXO:
.env → TokenConfig → Runtime Decision → Serviços
```

---

## Exemplo Visual: Alternância

### ANTES
```
┌────────────────────┐
│  TokenConfig       │
├────────────────────┤
│  current:          │
│  DEVELOPMENT       │◄── token ativo: test_...
│                    │
│  dev: test_...     │
│  prod: live_...    │
└────────────────────┘

Todas as requisições usam: test_...
```

### DEPOIS (ao clicar "Alternar")
```
┌────────────────────┐
│  TokenConfig       │
├────────────────────┤
│  current:          │
│  PRODUCTION        │◄── token ativo: live_...
│                    │
│  dev: test_...     │
│  prod: live_...    │
└────────────────────┘

Todas as requisições usam: live_...
(Sem reiniciar servidor!)
```

---

## Árvore de Dependências

```
server.js
├── configRoutes.js
│   └── tokenConfig.js ◄── Singleton
│
scheduler.js
├── tokenConfig.js ◄── Mesmo singleton
├── consultaResultadosService.js
│   └── tokenConfig.js ◄── Mesmo singleton
│
consultaTabelaClassificacao.js
├── tokenConfig.js ◄── Mesmo singleton
│
scripts/tokenManager.js
└── tokenConfig.js ◄── Mesmo singleton
```

**Importante:** Todos usam o MESMO singleton, então um `setEnvironment()` em um lugar afeta TODOS os serviços instantaneamente.

---

## Estados Possíveis

```
Estado 1: DEVELOPMENT (Padrão)
┌──────────────────────┐
│ Environment: dev     │
│ Token: test_...      │
│ Tipo: Teste          │
│ API Calls: Teste API │
└──────────────────────┘

Estado 2: PRODUCTION
┌──────────────────────┐
│ Environment: prod    │
│ Token: live_...      │
│ Tipo: Produção       │
│ API Calls: Real API  │
└──────────────────────┘

Transições:
dev → prod: setEnvironment('production')
prod → dev: setEnvironment('development')
toggle: toggleEnvironment() [inverte automaticamente]
```

---

**Diagrama criado para fins educacionais e de documentação.**
