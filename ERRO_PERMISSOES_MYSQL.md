# 🔐 ERRO DE PERMISSÕES MySQL - SOLUÇÃO

## ⚠️ ERRO ATUAL

```
Access denied for user 'erp_dev_user'@'10.100.74.71' (using password: YES)
```

## 📊 O que significa:

| Componente | Valor | Status |
|---|---|---|
| Usuário | `erp_dev_user` | ❌ Sem permissão |
| Host | `10.100.74.71` | (IP da hospedagem) |
| Senha | ✅ Fornecida | Estava correta |
| Banco | `bolaovip` | ❌ Acesso negado |

---

## 🔍 DIAGNÓSTICO

### 1️⃣ Verificar qual usuário está configurado

No arquivo **`.env` do servidor**, procure por:
```dotenv
DB_USER=erp_dev_user
DB_PASSWORD=???
DB_HOST=10.100.74.71  # (ou outro IP/hostname)
```

**Problema:** O usuário `erp_dev_user` NÃO tem permissão para acessar o banco `bolaovip`.

---

## ✅ SOLUÇÕES

### SOLUÇÃO 1: Dar permissão ao usuário existente (Recomendado)

No **servidor MySQL**, execute como `root`:

```bash
mysql -u root -p
# Digite a senha do root

# Dentro do MySQL:
GRANT ALL PRIVILEGES ON bolaovip.* TO 'erp_dev_user'@'10.100.74.71';
GRANT ALL PRIVILEGES ON bolaovip.* TO 'erp_dev_user'@'localhost';
GRANT ALL PRIVILEGES ON bolaovip.* TO 'erp_dev_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

Se ainda não funcionar, tente:
```bash
mysql -u root -p

# Verificar se o usuário existe
SELECT user, host FROM mysql.user WHERE user='erp_dev_user';

# Se não existir, criar:
CREATE USER 'erp_dev_user'@'10.100.74.71' IDENTIFIED BY 'senha_do_env';

# Dar todos os privilégios
GRANT ALL PRIVILEGES ON bolaovip.* TO 'erp_dev_user'@'10.100.74.71';
FLUSH PRIVILEGES;
EXIT;
```

---

### SOLUÇÃO 2: Usar usuário `root` (Menos seguro, mas rápido)

Se o `erp_dev_user` não tiver privilégios suficientes:

**Editar `.env` no servidor:**
```bash
nano ~/bolaovip/backend/.env
```

**Alterar para:**
```dotenv
DB_USER=root
DB_PASSWORD=sua_senha_root_mysql
DB_HOST=localhost  # ou o IP correto
DB_PORT=3306
DB_NAME=bolaovip
```

---

### SOLUÇÃO 3: Criar novo usuário com todas as permissões

No **servidor MySQL**:

```bash
mysql -u root -p

# Criar usuário
CREATE USER 'bolaovip_user'@'localhost' IDENTIFIED BY 'senha_super_secreta';
CREATE USER 'bolaovip_user'@'%' IDENTIFIED BY 'senha_super_secreta';

# Dar privilégios TOTAIS
GRANT ALL PRIVILEGES ON bolaovip.* TO 'bolaovip_user'@'localhost';
GRANT ALL PRIVILEGES ON bolaovip.* TO 'bolaovip_user'@'%';
FLUSH PRIVILEGES;

EXIT;
```

**Depois, atualizar `.env` no servidor:**
```dotenv
DB_USER=bolaovip_user
DB_PASSWORD=senha_super_secreta
```

---

## 🧪 TESTAR PERMISSÕES

Após aplicar as soluções, teste no **servidor**:

```bash
# Testar conexão com novo usuário
mysql -h localhost -u erp_dev_user -p bolaovip

# Se entrar sem erros, verificar se consegue ler dados
SELECT COUNT(*) FROM rodadas;
EXIT;
```

---

## 🚀 PASSOS PARA FIX RÁPIDO

1. **SSH no servidor de hospedagem:**
   ```bash
   ssh seu_usuario@bolaovip.csprojectia.com.br
   ```

2. **Conectar ao MySQL como root:**
   ```bash
   mysql -u root -p
   ```

3. **Executar comando para dar permissão:**
   ```sql
   GRANT ALL PRIVILEGES ON bolaovip.* TO 'erp_dev_user'@'%';
   FLUSH PRIVILEGES;
   ```

4. **Sair e reiniciar o backend:**
   ```bash
   EXIT;
   
   cd ~/bolaovip/backend
   pkill -f "node server.js"
   npm install
   node server.js
   ```

---

## 📋 COMANDOS MySQL ÚTEIS

```bash
# Listar todos os usuários
SELECT user, host FROM mysql.user;

# Listar permissões de um usuário
SHOW GRANTS FOR 'erp_dev_user'@'10.100.74.71';

# Remover usuário
DROP USER 'erp_dev_user'@'10.100.74.71';

# Criar usuário com permissão máxima
CREATE USER 'novo_user'@'localhost' IDENTIFIED BY 'senha';
GRANT ALL PRIVILEGES ON bolaovip.* TO 'novo_user'@'localhost';
FLUSH PRIVILEGES;

# Editar senha de usuário
ALTER USER 'erp_dev_user'@'10.100.74.71' IDENTIFIED BY 'nova_senha';
FLUSH PRIVILEGES;
```

---

## 🔒 CONFIGURAÇÃO SEGURA (Recomendada)

Crie um usuário específico com **apenas as permissões necessárias**:

```sql
CREATE USER 'bolaovip_app'@'10.100.74.71' IDENTIFIED BY 'senha_complexa_123';

GRANT 
  SELECT, INSERT, UPDATE, DELETE, 
  CREATE, ALTER, DROP,
  INDEX, CREATE TEMPORARY TABLES
ON bolaovip.* 
TO 'bolaovip_app'@'10.100.74.71';

FLUSH PRIVILEGES;
```

---

## ⚠️ CHECKLIST

- [ ] `.env` contém `DB_USER` e `DB_PASSWORD` corretos
- [ ] Usuário MySQL existe: `SELECT user FROM mysql.user;`
- [ ] Usuário tem permissão no banco `bolaovip`: `SHOW GRANTS FOR 'usuario'@'host';`
- [ ] Testei com `mysql -u usuario -p bolaovip`
- [ ] Backend reiniciado após mudanças

---

## 🆘 Se continuar falhando

Verifique também:

1. **Host correto?**
   ```bash
   # Ver IP da hospedagem
   hostname -I
   ifconfig
   ```

2. **Porta correta?**
   ```bash
   # MySQL roda em porta 3306 por padrão
   netstat -tulnp | grep mysql
   ```

3. **Arquivo `.env` foi lido?**
   ```bash
   # Adicione log temporário em server.js
   console.log('DB_USER:', process.env.DB_USER);
   console.log('DB_HOST:', process.env.DB_HOST);
   ```

---

**Última atualização:** 30 de dezembro de 2025
