# 🚪 Guia de Uso - Botão Sair (Logout)

## 📱 Como Usar em Diferentes Dispositivos

### 🖥️ Desktop (1024px ou superior)

#### Passo 1: Identifique o botão na toolbar
```
┌──────────────────────────────────────────────────────────┐
│ ⚽ Bolão VIP    [Selecione um grupo ▼]                   │
├──────────────────────────────────────────────────────────┤
│ 📰 Notícias | 🎯 Palpites | ... | 🏆 Ranking | 🚪 Sair │ ← Aqui!
├──────────────────────────────────────────────────────────┤
│ Saldo R$ 150,00                        Olá, João         │
└──────────────────────────────────────────────────────────┘
```

#### Passo 2: Clique no botão "🚪 Sair"
- O botão fica com cor **vermelha** ao passar o mouse
- Clique para fazer logout

#### Passo 3: Redirecionamento Automático
- Você será redirecionado para a **tela de login**
- Todos os dados são limpos automaticamente
- Necessário fazer login novamente

---

### 📱 Mobile (até 768px)

#### Passo 1: Abra o Menu
```
┌──────────────────────────────────────┐
│ ⚽ Bolão VIP    [Selecione ▼] [☰]    │ ← Clique no ☰
└──────────────────────────────────────┘
```

#### Passo 2: Menu Dropdown Abre
```
┌──────────────────────────────────────────────┐
│ ⚽ Bolão VIP    [Selecione ▼] [☰]           │
├──────────────────────────────────────────────┤
│ 📰 Notícias                                  │
│ 🎯 Meus Palpites                           │
│ 📜 Meu Histórico                           │
│ 🏆 Ranking da Rodada                       │
│ 👑 Ranking Geral                           │
│ ⚽ Resultados                              │
│ 📊 Classificação                           │
│ ⚙️ Configurações                          │
│ 👥 Gerenciar Usuários                      │
│ 💳 Pagamentos                              │
├──────────────────────────────────────────────┤
│ 🚪 Sair                                    │ ← Novo!
└──────────────────────────────────────────────┘
```

#### Passo 3: Clique em "🚪 Sair"
- O botão está no **final do menu** em cor vermelha
- Clique para fazer logout
- Menu fecha automaticamente

#### Passo 4: Redirecionamento
- Você será redirecionado para a **tela de login**
- Todos os dados são limpos automaticamente

---

## ✨ Visual do Botão

### Estado Normal (sem mouse)
```
┌─────────────────────┐
│ 🚪 Sair             │ (Fundo levemente transparente)
└─────────────────────┘
```

### Estado Hover (mouse sobre o botão)
```
┌─────────────────────┐
│ 🚪 Sair             │ (Fundo VERMELHO com brilho)
└─────────────────────┘
  ✨ Gradiente: #ff6b6b → #ff4757
  ✨ Sombra: 0 10px 30px rgba(255, 107, 107, 0.3)
```

---

## 🔄 O que Acontece Após Logout

### Backend
1. ✅ Sessão encerrada no servidor
2. ✅ Token invalidado (se implementado)

### Frontend
1. ✅ Token removido do localStorage
2. ✅ Refresh token removido
3. ✅ Nome de usuário apagado
4. ✅ Grupo selecionado apagado
5. ✅ Evento de mudança disparado
6. ✅ Componentes sincronizam estado
7. ✅ Redireciona para `/login`

### Resultado
- ✅ Você volta para **tela de login**
- ✅ Nenhum dado pessoal permanece no navegador
- ✅ Seguro para usar em computadores compartilhados

---

## 🛡️ Segurança

### Dados Removidos na Logout
| Dado | Descrição |
|------|-----------|
| `token` | JWT de autenticação |
| `refreshToken` | Token para renovar autenticação |
| `userName` | Nome do usuário logado |
| `grupoId` | Grupo selecionado |

### Por Que Isso é Importante?
- Impede acesso não autorizado em computadores compartilhados
- Remove informações sensíveis da memória do navegador
- Força novo login para continuar usando

---

## ⚡ Dicas Rápidas

| Situação | O Que Fazer |
|----------|------------|
| Quer sair do sistema | Clique em **🚪 Sair** |
| Menu não abre (mobile) | Clique no ícone **☰** no canto direito |
| Esqueceu senha | Após logout, clique em **"Cadastro"** → Recuperar Senha |
| Trocar de usuário | Faça logout e login com outro usuário |
| Dúvida sobre dados | Confira **Meu Histórico** ou **Configurações** antes de sair |

---

## 🆘 Problemas Comuns

### P: Cliquei em "Sair" mas ainda estou logado
**R:** 
- Atualize a página (F5 ou Ctrl+R)
- Limpe cache do navegador
- Tente novamente

### P: Botão não aparece no menu
**R:**
- Verifique se você está logado
- Se estiver em resolução < 768px, clique em ☰ para abrir menu
- Atualize a página

### P: Não consigo fazer login de novo após sair
**R:**
- Verificar credenciais (email/senha)
- Limpar cache do navegador (Ctrl+Shift+Delete)
- Tentar em navegação privada/incógnita
- Contatar suporte se persistir

### P: Saiu do sistema, mas dados ainda aparecem
**R:**
- Limpe cache do navegador
- Desative o auto-preenchimento do navegador
- Use navegação privada/incógnita
- Tente outro navegador

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique a conexão**: Certifique-se de ter internet
2. **Limpe cache**: Ctrl+Shift+Delete (ou Cmd+Shift+Delete no Mac)
3. **Tente novamente**: Atualize a página (F5)
4. **Use navegação privada**: Tente em abeta incógnita
5. **Contate suporte**: Se o problema persistir

---

## ℹ️ Informações Técnicas

| Item | Detalhes |
|------|----------|
| Endpoint | `POST /auth/logout` |
| Autenticação | Bearer Token (JWT) |
| Redirecionamento | `/login` |
| Status Code | 200 OK (sucesso) |
| Erro | Ignora e faz logout local mesmo assim |

---

**Última Atualização**: 25 de Dezembro de 2025
**Versão**: 1.0
**Status**: ✅ Produção
