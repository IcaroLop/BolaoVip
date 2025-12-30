# 🔧 DIAGNÓSTICO E CORREÇÃO - ERROS DE CONEXÃO MySQL

## ⚠️ PROBLEMA IDENTIFICADO

```
[STARTUP] Erro ao replanejar agenda: connect ECONNREFUSED 127.0.0.1:3306
[STARTUP] Erro ao inserir notícia: connect ECONNREFUSED 127.0.0.1:3306
❌ [Verificador] Erro ao executar requisições agendadas: connect ECONNREFUSED 127.0.0.1:3306
```

**Causa:** Backend não consegue conectar ao MySQL no servidor de hospedagem.

---

## 🔍 CAUSAS POSSÍVEIS

### 1. **MySQL não está rodando**
```bash
# Verificar se MySQL está ativo
sudo systemctl status mysql
# ou
sudo service mysql status
```

### 2. **MySQL não está acessível em 127.0.0.1:3306**
- MySQL pode estar rodando em outro IP/porta
- Firewall bloqueando a conexão
- Arquivo `.env` com credenciais erradas

### 3. **Variáveis de ambiente não carregadas**
- Arquivo `.env` não existe no servidor
- Node não conseguiu ler o `.env`

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: Verificar se MySQL está rodando

**No Linux/Ubuntu:**
```bash
sudo systemctl start mysql
sudo systemctl status mysql
```

**No Windows:**
```powershell
# Verificar serviço MySQL
Get-Service MySQL80  # ou o nome do seu serviço

# Iniciar MySQL
Start-Service MySQL80
```

---

### PASSO 2: Verificar conectividade

**Linux/Mac:**
```bash
# Testar conexão ao MySQL
mysql -h localhost -u root -p

# Se pedir senha, digite: isl050382
# Se conectar, você verá: mysql>
# Digite: exit para sair
```

**Windows (Command Prompt):**
```cmd
mysql -h localhost -u root -pisl050382
```

Se receber erro `Can't connect to MySQL server`, MySQL não está rodando.

---

### PASSO 3: Configurar `.env` no servidor

**Copiar o arquivo correto:**
```bash
cd ~/bolaovip/backend  # ou caminho do projeto

# Copiar template
cp .env.production .env
```

**Editar `.env` com credenciais REAIS do servidor:**
```bash
nano .env  # ou seu editor preferido
```

```dotenv
DB_HOST=localhost          # ou IP do servidor MySQL se for remoto
DB_PORT=3306               # porta padrão MySQL
DB_USER=root               # usuário MySQL
DB_PASSWORD=sua_senha_real # ALTERAR PARA SENHA REAL
DB_NAME=bolaovip           # nome do banco

JWT_SECRET=sua_chave_secreta_forte
NODE_ENV=production
```

---

### PASSO 4: Reiniciar o servidor Node

```bash
# Matar processo anterior
pkill -f "node server.js"

# Ou se estiver rodando em foreground, pressionar Ctrl+C

# Reiniciar
cd ~/bolaovip/backend
npm install  # garantir dependências
node server.js

# Ou usar PM2 (recomendado para produção)
pm2 start server.js --name "bolaovip-backend"
pm2 save
```

---

## 🐛 TESTES DE DIAGNÓSTICO

### Teste 1: Verificar se `.env` é lido
Adicionar este código temporário em `backend/server.js` (linha 5):
```javascript
console.log('🔍 [DEBUG] DB_HOST:', process.env.DB_HOST);
console.log('🔍 [DEBUG] DB_USER:', process.env.DB_USER);
console.log('🔍 [DEBUG] DB_PORT:', process.env.DB_PORT);
console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV);
```

Se não aparecer valores no log, significa `.env` não foi lido.

### Teste 2: Conectar direto ao MySQL
```bash
# Terminal 1: Verificar se MySQL responde
mysql -h 127.0.0.1 -u root -p

# Se conectar, o problema é na variável de ambiente
# Se não conectar, MySQL não está ativo
```

### Teste 3: Script de teste de conexão
Criar arquivo `backend/test-db-connection.js`:
```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Tentando conectar com:');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Porta: ${process.env.DB_PORT}`);
    console.log(`Usuário: ${process.env.DB_USER}`);
    console.log(`Banco: ${process.env.DB_NAME}`);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conexão bem-sucedida!');
    await connection.end();
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('Código:', error.code);
  }
}

testConnection();
```

Executar:
```bash
node backend/test-db-connection.js
```

---

## 🚨 CHECKLIST PRÉ-DEPLOY

- [ ] MySQL rodando no servidor (`sudo systemctl status mysql`)
- [ ] Arquivo `.env` criado em `backend/` com credenciais reais
- [ ] `DB_HOST` correto (localhost se MySQL local, ou IP/hostname se remoto)
- [ ] `DB_USER` e `DB_PASSWORD` corretos
- [ ] Banco de dados `bolaovip` existe no MySQL
- [ ] Tabelas criadas no banco (schema)
- [ ] Node.js e npm instalados no servidor
- [ ] `npm install` executado em `backend/`
- [ ] Nenhum outro processo usando porta 3001

---

## 📋 CREDENCIAIS ESPERADAS

| Variável | Valor Local | Valor Produção | Obrigatório |
|----------|---|---|---|
| DB_HOST | localhost | seu_servidor_mysql | ✅ Sim |
| DB_PORT | 3306 | 3306 | ✅ Sim |
| DB_USER | root | seu_usuario_db | ✅ Sim |
| DB_PASSWORD | isl050382 | sua_senha_real | ✅ Sim |
| DB_NAME | bolaovip | bolaovip | ✅ Sim |
| JWT_SECRET | 123 | chave_forte_aleatoria | ✅ Sim |
| NODE_ENV | development | production | ✅ Sim |

---

## 🔐 CRIAR USUÁRIO MySQL SEGURO (Recomendado)

Em vez de usar `root`, criar usuário específico:

```bash
mysql -u root -p

# Dentro do MySQL:
CREATE USER 'bolaovip_user'@'localhost' IDENTIFIED BY 'senha_super_secreta';
GRANT ALL PRIVILEGES ON bolaovip.* TO 'bolaovip_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Depois atualizar `.env`:
```dotenv
DB_USER=bolaovip_user
DB_PASSWORD=senha_super_secreta
```

---

## 🎯 PRÓXIMAS AÇÕES

1. **Copiar `conexao.js` corrigido** para o servidor
   ```bash
   # Já está corrigido no repositório
   git pull origin master
   ```

2. **Verificar MySQL** no servidor
   ```bash
   sudo systemctl status mysql
   ```

3. **Criar/atualizar `.env`** no servidor com credenciais reais

4. **Testar conexão** usando script acima

5. **Reiniciar backend**
   ```bash
   npm install
   node server.js
   ```

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver logs em tempo real
tail -f ~/bolaovip/backend/logs/*.log

# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar portas abertas
netstat -tulnp | grep LISTEN

# Matar processo Node
lsof -i :3001  # Ver processo na porta 3001
kill -9 <PID>  # Matar o processo
```

---

**Última atualização:** 30 de dezembro de 2025
