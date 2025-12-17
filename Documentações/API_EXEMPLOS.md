# 🌐 Exemplos de Requisições - Token Management API

## 🔐 Autenticação Obrigatória

Todos os endpoints requerem um **JWT token válido** no header:
```
Authorization: Bearer seu_token_jwt_aqui
```

## 1️⃣ GET /api/config/token-status
Retorna o status atual de ambos os tokens

### cURL
```bash
curl http://localhost:3001/api/config/token-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3001/api/config/token-status', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  }
});
const data = await response.json();
console.log(data);
```

### PowerShell
```powershell
$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
Invoke-RestMethod -Uri 'http://localhost:3001/api/config/token-status' `
  -Headers $headers
```

### Resposta Esperada
```json
{
  "sucesso": true,
  "mensagem": "Status de tokens",
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

---

## 2️⃣ POST /api/config/toggle-token
Alterna entre development e production

### cURL
```bash
curl -X POST http://localhost:3001/api/config/toggle-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3001/api/config/toggle-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  }
});
const data = await response.json();
console.log(`Token alternado para: ${data.ambiente}`);
```

### PowerShell
```powershell
$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
Invoke-RestMethod -Uri 'http://localhost:3001/api/config/toggle-token' `
  -Method POST -Headers $headers
```

### Resposta Esperada
```json
{
  "sucesso": true,
  "mensagem": "Token alterado para: production",
  "ambiente": "production",
  "info": {
    "token": "live_f8c1a04cc46f0273c2eb8dab2f558e",
    "environment": "production",
    "type": "Produção",
    "prefix": "live_"
  }
}
```

---

## 3️⃣ POST /api/config/set-environment
Define um ambiente específico

### cURL
```bash
curl -X POST http://localhost:3001/api/config/set-environment \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"environment":"production"}'
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3001/api/config/set-environment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwtToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    environment: 'production'  // ou 'development'
  })
});
const data = await response.json();
console.log(data.mensagem);
```

### PowerShell
```powershell
$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    'Content-Type' = 'application/json'
}
$body = @{
    environment = 'production'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/api/config/set-environment' `
  -Method POST -Headers $headers -Body $body
```

### Resposta Esperada
```json
{
  "sucesso": true,
  "mensagem": "Ambiente definido para: production",
  "info": {
    "token": "live_f8c1a04cc46f0273c2eb8dab2f558e",
    "environment": "production",
    "type": "Produção",
    "prefix": "live_"
  }
}
```

---

## 4️⃣ POST /api/config/update-token
Atualiza um token personalizado

### cURL
```bash
curl -X POST http://localhost:3001/api/config/update-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"environment":"development","token":"test_novo_token_aqui"}'
```

### JavaScript (fetch)
```javascript
const response = await fetch('http://localhost:3001/api/config/update-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwtToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    environment: 'development',
    token: 'test_novo_token_aqui'
  })
});
const data = await response.json();
console.log(data.mensagem);
```

### PowerShell
```powershell
$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    'Content-Type' = 'application/json'
}
$body = @{
    environment = 'development'
    token = 'test_novo_token_aqui'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/api/config/update-token' `
  -Method POST -Headers $headers -Body $body
```

### Resposta Esperada
```json
{
  "sucesso": true,
  "mensagem": "Token development atualizado com sucesso",
  "environment": "development",
  "tokenPreview": "test_novo..."
}
```

---

## 🔗 Fluxo Completo (Exemplo)

### 1. Fazer login para obter JWT
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu_email@example.com","senha":"sua_senha"}'

# Resposta:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "nome": "Seu Nome"
# }
```

### 2. Salvar o JWT
```javascript
const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Do login anterior
```

### 3. Ver status atual
```bash
curl http://localhost:3001/api/config/token-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Alternar para produção
```bash
curl -X POST http://localhost:3001/api/config/toggle-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. Confirmar mudança
```bash
curl http://localhost:3001/api/config/token-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Verá: "currentEnvironment": "production"
```

---

## 📝 Script Python Completo

```python
import requests
import json

# Configuração
BASE_URL = 'http://localhost:3001'
EMAIL = 'seu_email@example.com'
SENHA = 'sua_senha'

# 1. Login
login_response = requests.post(
    f'{BASE_URL}/auth/login',
    json={'email': EMAIL, 'senha': SENHA}
)
jwt_token = login_response.json()['token']
print(f'✅ Login realizado. Token: {jwt_token[:20]}...')

# Header com JWT
headers = {'Authorization': f'Bearer {jwt_token}'}

# 2. Ver status
status = requests.get(f'{BASE_URL}/api/config/token-status', headers=headers)
print(f'\n📊 Status: {status.json()["status"]["currentEnvironment"]}')

# 3. Alternar token
toggle = requests.post(f'{BASE_URL}/api/config/toggle-token', headers=headers)
print(f'✅ {toggle.json()["mensagem"]}')

# 4. Confirmar
status = requests.get(f'{BASE_URL}/api/config/token-status', headers=headers)
print(f'📊 Novo status: {status.json()["status"]["currentEnvironment"]}')
```

---

## ❌ Erros Comuns

### 401 Unauthorized
```json
{
  "erro": "Token não fornecido ou inválido"
}
```
**Solução:** Certifique-se de incluir header `Authorization: Bearer TOKEN_VALIDO`

### 400 Bad Request
```json
{
  "erro": "Campo \"environment\" é obrigatório"
}
```
**Solução:** Verifique se o body JSON está correto

### 500 Internal Server Error
```json
{
  "erro": "Erro ao obter status de tokens",
  "detalhes": "..."
}
```
**Solução:** Verifique os logs do servidor

---

## 🧪 Postman Collection

Importe este JSON no Postman:

```json
{
  "info": {
    "name": "Token Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Token Status",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/api/config/token-status",
          "host": ["{{baseUrl}}", "api/config/token-status"]
        },
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwtToken}}"
          }
        ]
      }
    },
    {
      "name": "Toggle Token",
      "request": {
        "method": "POST",
        "url": {
          "raw": "{{baseUrl}}/api/config/toggle-token",
          "host": ["{{baseUrl}}", "api/config/toggle-token"]
        },
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwtToken}}"
          }
        ]
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "jwtToken",
      "value": ""
    }
  ]
}
```

---

**Dúvidas?** Veja a documentação completa em `Documentações/GERENCIADOR_TOKENS.md`
