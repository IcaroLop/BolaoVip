# 🚀 Instruções para Publicar no GitHub

O repositório local está pronto! Siga os passos abaixo para publicar no GitHub:

## ✅ Repositório Local Criado

- ✓ Git inicializado
- ✓ .gitignore configurado (protege .env, certificados, node_modules)
- ✓ README.md completo
- ✓ 2 commits realizados (146 + 72 arquivos)
- ✓ Frontend e Backend incluídos

## 📤 Passos para Publicar no GitHub

### 1. Criar Repositório no GitHub

Acesse: https://github.com/new

**Configurações recomendadas:**
- **Nome do repositório**: `BolaoVIP` ou `bolao-vip`
- **Descrição**: `Sistema de bolão esportivo com React, Node.js e integração PIX`
- **Visibilidade**: 
  - ☑️ **Private** (recomendado - contém lógica de negócio)
  - ☐ Public (se quiser código aberto)
- **NÃO** marque:
  - ☐ Add a README file
  - ☐ Add .gitignore
  - ☐ Choose a license

### 2. Conectar e Enviar para o GitHub

Após criar o repositório, execute os comandos abaixo no PowerShell:

```powershell
cd c:\BolaoVIP

# Adicionar o repositório remoto (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/BolaoVIP.git

# Verificar se o remote foi adicionado
git remote -v

# Enviar o código para o GitHub
git push -u origin master
```

### 3. Autenticação

Ao fazer o push, o GitHub pedirá autenticação:

**Opção 1 - Personal Access Token (Recomendado):**
1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome (ex: "BolaoVIP Local")
4. Marque o scope: `repo` (Full control of private repositories)
5. Clique em "Generate token"
6. **Copie o token** (você não verá novamente!)
7. Ao fazer push, use o token como senha

**Opção 2 - GitHub CLI:**
```powershell
# Instalar GitHub CLI
winget install --id GitHub.cli

# Fazer login
gh auth login

# Reenviar
git push -u origin master
```

## 📊 Resumo do Repositório

### Arquivos Protegidos (.gitignore)
✓ `.env` (credenciais)
✓ `.tokenenv` (ambiente da API)
✓ `node_modules/` (dependências)
✓ `pix/certificados/*.pem` (certificados PIX)
✓ Build files

### Estrutura Enviada
```
BolaoVIP/
├── backend/           # 80+ arquivos
│   ├── controllers/   # Lógica de negócio
│   ├── routes/        # Endpoints API
│   ├── services/      # Serviços e scrapers
│   ├── scripts/       # Utilitários e migrations
│   └── ...
├── frontend/          # 72 arquivos
│   └── bolao-vip/
│       ├── src/       # React components
│       ├── public/    # Assets
│       └── ...
├── Documentações/     # Guias e backups
├── .gitignore
└── README.md
```

## 🔒 Segurança

**NUNCA commite:**
- ❌ Arquivos `.env`
- ❌ Certificados PIX (`.pem`, `.key`)
- ❌ Tokens da API
- ❌ Senhas do banco de dados

**Já protegido pelo .gitignore!** ✅

## 📝 Comandos Git Úteis

```powershell
# Ver status do repositório
git status

# Ver histórico de commits
git log --oneline --graph

# Adicionar novos arquivos
git add .
git commit -m "Descrição da mudança"
git push

# Criar nova branch
git checkout -b feature/nova-funcionalidade

# Ver branches
git branch -a

# Voltar para master
git checkout master
```

## 🌐 Após o Push

Acesse seu repositório:
```
https://github.com/SEU_USUARIO/BolaoVIP
```

O README.md será exibido automaticamente com toda a documentação!

## ⚠️ Importante

Antes de tornar o repositório público:
1. Revisar TODOS os arquivos em busca de credenciais
2. Verificar se `.env` está no `.gitignore`
3. Remover qualquer token/senha hardcoded
4. Considerar adicionar licença (MIT, Apache, etc.)

---

🎯 **Repositório pronto para ser publicado!**
