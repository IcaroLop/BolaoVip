# 🚨 SOLUÇÃO DEFINITIVA - Atualizar credenciais no servidor

## ❌ PROBLEMA ATUAL

Servidor está usando credenciais **ANTIGAS**:
```
Access denied for user 'erp_dev_user'@'10.100.74.71'
```

Deveria usar:
```
✅ DB_USER=bolaovip_user
✅ DB_PASSWORD=fBVhh6w2KW
✅ DB_HOST=10.100.48.197
```

---

## ✅ SOLUÇÃO EM 5 PASSOS

### Passo 1: SSH no servidor
```bash
ssh seu_usuario@bolaovip.csprojectia.com.br
```

---

### Passo 2: Ir para a pasta do projeto
```bash
cd ~/bolaovip
# ou
cd /var/www/bolaovip
# ou o caminho onde está instalado
```

---

### Passo 3: Puxar as atualizações do GitHub
```bash
git pull origin master
```

Deve mostrar:
```
Updating ...
Fast-forward
 backend/.env.production | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

---

### Passo 4: Copiar .env.production para .env
```bash
cd backend
cp .env.production .env
```

**Verificar se está correto:**
```bash
cat .env | grep DB_USER
# Deve mostrar: DB_USER=bolaovip_user

cat .env | grep DB_PASSWORD  
# Deve mostrar: DB_PASSWORD=fBVhh6w2KW

cat .env | grep DB_HOST
# Deve mostrar: DB_HOST=10.100.48.197
```

---

### Passo 5: Reiniciar o backend
```bash
# Matar processo anterior
pkill -f "node server.js"

# Ou se estiver usando PM2:
pm2 restart bolaovip-backend

# Ou se estiver rodando em foreground, pressione Ctrl+C e:
npm install
node server.js
```

---

## 🧪 VERIFICAR SE FUNCIONOU

Aguarde 10-15 segundos e veja os logs. Se aparecer:

✅ **SUCESSO:**
```
[STARTUP] ✅ Notícias sincronizadas: 17 inseridas, 0 atualizadas, 0 erros
```

❌ **AINDA COM ERRO:**
```
Access denied for user 'erp_dev_user'@'10.100.74.71'
```

Se ainda der erro, significa que o `.env` não foi lido. Nesse caso:

---

## 🔧 TROUBLESHOOTING

### Se ainda mostrar erp_dev_user:

**1. Verificar se o .env existe:**
```bash
cd ~/bolaovip/backend
ls -la .env
cat .env
```

**2. Verificar se o arquivo tem as credenciais corretas:**
```bash
grep -E "DB_USER|DB_PASSWORD|DB_HOST" .env
```

Deve mostrar:
```
DB_HOST=10.100.48.197
DB_USER=bolaovip_user
DB_PASSWORD=fBVhh6w2KW
```

**3. Se ainda estiver errado, editar manualmente:**
```bash
nano .env
```

Editar essas linhas:
```dotenv
DB_HOST=10.100.48.197
DB_PORT=3306
DB_USER=bolaovip_user
DB_PASSWORD=fBVhh6w2KW
DB_NAME=bolaovip
```

Salvar: `Ctrl+O`, `Enter`, `Ctrl+X`

**4. Reiniciar novamente:**
```bash
pkill -f "node server.js"
node server.js
```

---

## 📝 COMANDOS COMPLETOS (COPIE E COLE)

Execute no servidor:

```bash
# 1. Ir para pasta do projeto
cd ~/bolaovip

# 2. Puxar atualizações
git pull origin master

# 3. Copiar .env
cd backend
cp .env.production .env

# 4. Verificar credenciais
echo "=== Verificando credenciais ==="
grep DB_USER .env
grep DB_PASSWORD .env
grep DB_HOST .env

# 5. Reiniciar backend
echo "=== Reiniciando backend ==="
pkill -f "node server.js"
sleep 2
npm install
node server.js
```

---

## 🎯 CHECKLIST

- [ ] SSH no servidor ✅
- [ ] `cd ~/bolaovip` ✅
- [ ] `git pull origin master` ✅
- [ ] `cd backend` ✅
- [ ] `cp .env.production .env` ✅
- [ ] Verificar `cat .env | grep DB_USER` → `bolaovip_user` ✅
- [ ] Verificar `cat .env | grep DB_PASSWORD` → `fBVhh6w2KW` ✅
- [ ] `pkill -f "node server.js"` ✅
- [ ] `node server.js` ✅
- [ ] Aguardar logs sem erro de `erp_dev_user` ✅

---

## 🚨 SE TUDO FALHAR

Execute este script para diagnóstico:

```bash
cd ~/bolaovip/backend

echo "=== Diagnóstico .env ==="
echo "Arquivo existe?"
ls -la .env

echo ""
echo "Conteúdo do .env:"
cat .env

echo ""
echo "Conteúdo do .env.production:"
cat .env.production

echo ""
echo "Processos Node rodando:"
ps aux | grep node
```

Copie e cole a saída aqui para análise.

---

**Última atualização:** 30 de dezembro de 2025
