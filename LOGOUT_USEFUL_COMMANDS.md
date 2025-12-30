# 💻 Comandos Úteis - Feature Logout

## 🚀 Para Iniciar

### Frontend
```bash
# Instalar dependências (primeira vez)
cd frontend/bolao-vip
npm install

# Iniciar em desenvolvimento
npm start

# Build para produção
npm run build

# Fazer deploy
# (seguir procedimento padrão do seu servidor)
```

### Backend
```bash
# Já está configurado
# Endpoint POST /auth/logout já existe
# Nenhuma ação necessária
```

---

## 🧪 Para Testar

### No Console do Navegador (F12)

**Verificar Token Removido**
```javascript
localStorage.getItem('token')
// Retorna: null (se logout funcionou)
```

**Verificar Todos os Dados**
```javascript
localStorage.getItem('token')           // null
localStorage.getItem('refreshToken')    // null
localStorage.getItem('userName')        // null
localStorage.getItem('grupoId')         // null
```

**Verificar Evento AuthChange**
```javascript
window.addEventListener('authChange', () => {
  console.log('✅ AuthChange foi disparado!');
});
// Depois faça logout e veja a mensagem
```

**Verificar URL Atual**
```javascript
window.location.pathname
// Deve retornar: /login
```

---

## 🔍 Para Debugar

### Desktop
1. Abrir DevTools: F12
2. Console: Ver erros/logs
3. Network: Ver requisições
4. Storage: Ver localStorage
5. Clique em "Sair"

### Mobile (Chrome DevTools)
```bash
# Windows
chrome://inspect

# Mac
chrome://inspect

# Android USB Debug
adb reverse tcp:8081 tcp:8081
```

### Firefox
1. Pressionar: F12
2. Storage Tab
3. Inspecionar localStorage
4. Testar clique

---

## 📊 Para Monitorar

### Logs do Backend
```bash
# Se houver arquivo de log
tail -f /caminho/do/log/backend.log

# Procurar por "logout"
grep -i logout /caminho/do/log/backend.log
```

### Performance
```javascript
// No console
console.time('logout');
// (faça logout)
console.timeEnd('logout');
// Tempo deve ser < 150ms
```

---

## 🔄 Para Sincronizar Estado

### Forçar Re-render
```javascript
window.dispatchEvent(new Event('authChange'));
// Força componentes a atualizarem
```

### Limpar Cache Navegador
```bash
# Chrome
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)

# Firefox
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)
```

### Limpar Storage Manualmente
```javascript
localStorage.clear();
// Remove TUDO do localStorage
// (use com cuidado!)

// Mais seguro:
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('userName');
localStorage.removeItem('grupoId');
```

---

## 📱 Para Testar Responsividade

### Chrome DevTools
1. F12
2. Ctrl+Shift+M (Toggle Device Toolbar)
3. Selecionar dispositivo
4. Testar logout

### Dimensões de Teste
```
Desktop:  1920x1080, 1366x768, 1024x768
Tablet:   768x1024, 800x600
Mobile:   375x667, 414x896, 480x800
```

### Teste Sem Conexão
```
DevTools → Network → Throttle "Offline"
Tente fazer logout
Deve funcionar mesmo offline
```

---

## 🔐 Para Verificar Segurança

### Verificar Remoção de Dados
```javascript
// ANTES de logout
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('userName'));

// DEPOIS de logout
console.log('Token:', localStorage.getItem('token'));     // null
console.log('User:', localStorage.getItem('userName'));   // null
```

### Verificar Endpoint de Logout
```bash
# Testar com curl
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Deve retornar 200 OK
```

### Verificar Headers de Segurança
```javascript
// No console após logout
fetch(new Request(window.location.href)).then(r => {
  console.log(r.headers);
  // Ver Content-Security-Policy, etc
});
```

---

## 📈 Para Medir Performance

### Tempo de Logout
```javascript
console.time('Logout Performance');

// (clique em Sair)

console.timeEnd('Logout Performance');
// Tempo ideal: < 150ms
```

### Network Timing
```
DevTools → Network
Clique em Sair
Ver tempo de POST /auth/logout
Ideal: < 100ms
```

### Memory Usage
```javascript
// Se suportado
if (performance.memory) {
  console.log(performance.memory.usedJSHeapSize);
}
```

---

## 🚀 Para Deploy

### Build
```bash
cd frontend/bolao-vip
npm run build
# Cria pasta: build/
```

### Servir Localmente
```bash
# Python 3
python -m http.server 3000 -d build/

# Node.js
npx serve -s build -l 3000
```

### Deploy em Produção
```bash
# Copiar arquivos da pasta build/
# para seu servidor web

# Exemplo com SCP
scp -r build/* usuario@servidor:/var/www/bolao-vip/
```

---

## 🔍 Para Encontrar Problemas

### Procurar "Sair" no Código
```bash
# Windows
findstr /R "Sair" frontend/bolao-vip/src/components/Header.js

# Mac/Linux
grep -n "Sair" frontend/bolao-vip/src/components/Header.js
```

### Procurar handleLogout
```bash
# Windows
findstr /R "handleLogout" frontend/bolao-vip/src/components/Header.js

# Mac/Linux
grep -n "handleLogout" frontend/bolao-vip/src/components/Header.js
```

### Verificar Imports
```bash
# Windows
findstr /R "useNavigate" frontend/bolao-vip/src/components/Header.js

# Mac/Linux
grep -n "useNavigate" frontend/bolao-vip/src/components/Header.js
```

---

## 📚 Para Consultar Documentação

### Abrir Documentação
```bash
# Linux/Mac
open LOGOUT_QUICKSTART.md

# Windows (no terminal)
start LOGOUT_QUICKSTART.md

# VSCode
code LOGOUT_QUICKSTART.md
```

### Listar Todos os Documentos
```bash
# Linux/Mac
ls -la LOGOUT_*.md

# Windows (PowerShell)
Get-Item LOGOUT_*.md
```

---

## 🆘 Para Troubleshooting

### Se Botão Não Aparece
```javascript
// No console
document.querySelectorAll('.menu-sair')
// Deve retornar: [button.menu-sair]
```

### Se Clique Não Funciona
```javascript
// No console
const btn = document.querySelector('.menu-sair');
btn.click(); // Forçar clique manualmente
```

### Se Não Redireciona
```javascript
// Verificar URL
window.location.pathname // Deve ser /login
window.location.href     // Full URL
```

---

## 💻 Ferramentas Úteis

### Para Visualizar Código
```bash
# VSCode
code frontend/bolao-vip/src/components/Header.js

# Terminal (Linux/Mac)
cat Header.js

# PowerShell (Windows)
Get-Content Header.js
```

### Para Comparar Mudanças
```bash
# Git
git diff frontend/bolao-vip/src/components/Header.js
git diff frontend/bolao-vip/src/components/Header.css
```

### Para Ver Histórico
```bash
# Git log
git log --oneline frontend/bolao-vip/src/components/Header.js
```

---

## 🎯 Quick Command List

```bash
# Testar logout
npm start

# Ver Console DevTools
F12 ou Cmd+Opt+I

# Testar Mobile
F12 → Ctrl+Shift+M

# Build
npm run build

# Ver documentação
code LOGOUT_QUICKSTART.md

# Listar docs
ls LOGOUT_*.md

# Verificar sintaxe
npm run lint

# Verificar erros
npm run build --dry-run
```

---

## 📞 Suporte

**Problema?**
- Documentação: [LOGOUT_DOCUMENTATION_INDEX.md](LOGOUT_DOCUMENTATION_INDEX.md)
- Debug: [LOGOUT_TECHNICAL_DOCS.md](LOGOUT_TECHNICAL_DOCS.md)
- Usuário: [LOGOUT_USER_GUIDE.md](LOGOUT_USER_GUIDE.md)

**Código?**
- Header.js: `frontend/bolao-vip/src/components/Header.js`
- Header.css: `frontend/bolao-vip/src/components/Header.css`

---

**Versão**: 1.0
**Data**: 25 de Dezembro de 2025
**Status**: ✅ Production Ready
