# 📦 Estrutura Completa do Repositório BolaoVip

## ✅ Sincronização Realizada - 30/12/2025

Todas as pastas e arquivos foram sincronizados com o repositório GitHub remoto.

---

## 📁 Estrutura de Pastas do Projeto

### Backend (`backend/`)
```
backend/
├── controllers/          ✅ Todos os controllers do projeto
├── routes/             ✅ Todas as rotas da API
├── services/           ✅ Serviços de negócio
├── middleware/         ✅ Middlewares (auth, etc)
├── jobs/              ✅ Cron jobs e agendamentos
├── helpers/           ✅ Funções auxiliares
├── database/
│   ├── conexao.js     ✅ Pool de conexão MySQL
│   └── migrations/    ✅ Scripts de migração
├── pix/
│   └── certificados/  ✅ Certificados PIX (homologação)
├── public/            ✅ Arquivos estáticos (escudos, etc)
├── scripts/           ✅ Scripts utilitários
├── server.js          ✅ Servidor Express principal
├── .env               ⚠️ Não commitado (credenciais)
├── .env.production    ✅ Commitado (template para prod)
└── package.json       ✅ Dependências

```

### Frontend (`frontend/bolao-vip/`)
```
frontend/bolao-vip/
├── src/
│   ├── components/      ✅ Componentes React
│   ├── pages/          ✅ Páginas/telas
│   ├── services/       ✅ Serviços frontend
│   ├── config/         ✅ Configurações (config.js, api.js)
│   ├── styles/         ✅ CSS global
│   ├── utils/          ✅ Utilitários
│   ├── App.js          ✅ Router principal
│   ├── index.js        ✅ Entry point
│   └── config.js       ✅ Config API atualizada
├── public/             ✅ Assets (imagens, etc)
├── android/            ✅ Projeto Android (Capacitor)
├── capacitor.config.ts ✅ Config Capacitor atualizada
├── .env.production     ✅ Commitado (template para prod)
└── package.json        ✅ Dependências

```

---

## 🔐 Arquivos Sensíveis (Não Commitados)

| Arquivo | Motivo | Ação Necessária |
|---------|--------|---|
| `.env` | Credenciais locais | Criar no servidor com dados reais |
| `pix/certificados/producao*.pem` | Certificados reais PIX | Fazer upload seguro no servidor |
| `pix/certificados/chave_privada_producao.pem` | Chave privada PIX | Fazer upload seguro no servidor |
| `node_modules/` | Dependências (regeneráveis) | `npm install` no servidor |
| `build/` | Build React (regenerável) | `npm run build` no servidor |
| `android/app/build/` | Build Android (regenerável) | `npx cap sync` no servidor |

---

## 📝 Arquivos de Configuração Commitados

✅ **backend/.env.production** → Template para produção
- Usar como referência para configurar credenciais reais no servidor

✅ **frontend/bolao-vip/.env.production** → Template para produção
- `REACT_APP_API_URL=https://bolaovip.csprojectia.com.br`

✅ **GUIA_BUILD_APK_PRODUCTION.md** → Guia completo para Release

---

## 🚀 Como Usar no Servidor de Hospedagem

### 1. Clonar o repositório
```bash
git clone https://TOKEN@github.com/IcaroLop/BolaoVip.git bolaovip
cd bolaovip
```

### 2. Configurar variáveis de ambiente

**Backend** (`backend/.env`)
```bash
cp backend/.env.production backend/.env
# Editar backend/.env com credenciais reais de produção
```

**Frontend** (`frontend/bolao-vip/.env`)
```bash
cp frontend/bolao-vip/.env.production frontend/bolao-vip/.env
# Pode ficar igual se usar https://bolaovip.csprojectia.com.br
```

### 3. Instalar dependências
```bash
cd backend && npm install
cd ../frontend/bolao-vip && npm install
cd ../../
```

### 4. Build frontend
```bash
cd frontend/bolao-vip
npm run build
cd ../../
```

### 5. Copiar certificados PIX (produção)
```bash
# Fazer upload seguro dos certificados reais
cp /caminho/para/producao.pem backend/pix/certificados/
cp /caminho/para/chave_privada.pem backend/pix/certificados/
```

### 6. Iniciar serviços
```bash
cd backend
node server.js  # Na porta 3001, reverse proxy com nginx na porta 443

# Em outra sessão (ou usar PM2/systemd)
cd frontend/bolao-vip && npm start  # Para admin panel (opcional)
```

---

## ✨ Commits Sincronizados

| Commit | Descrição |
|--------|-----------|
| `27310aa` | Atualização completa do projeto - 30/12/2025 |
| `05ec476` | Configuração completa para Release em Produção |
| `a8b0b39` | Adicionar certificados PIX de homologação |
| `fca383b` | Adicionar estrutura de pastas backend |

---

## 🔍 Verificação de Integridade

Para verificar se tudo está sincronizado corretamente:

```bash
# Clonar em pasta temporária e verificar
git clone https://github.com/IcaroLop/BolaoVip.git test
cd test

# Verificar estrutura
ls -la backend/
ls -la backend/controllers/
ls -la backend/services/
ls -la frontend/bolao-vip/src/

# Deve exibir todos os arquivos listados acima
```

---

## 📞 Suporte

Se alguma pasta ou arquivo faltar:
1. Verificar `.gitignore` se está bloqueando
2. Fazer `git add -A` e commit
3. Fazer `git push` para sincronizar

---

**Última atualização:** 30 de dezembro de 2025
**Repositório:** https://github.com/IcaroLop/BolaoVip
