# 🎨 Visualização - Feature Logout

## 🖥️ Layout Desktop (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ⚽ Bolão VIP              [Selecione um grupo ▼]                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📰 Notícias  │ 🎯 Palpites  │ 📜 Histórico  │ 🏆 Ranking  │ ... │ 🚪 Sair
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  💰 Saldo: R$ 150,00                        Olá, João                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Botão "Sair" - Estados

#### Estado Normal (sem mouse)
```
┌──────────────┐
│   🚪 Sair    │  (Fundo levemente transparente)
└──────────────┘
Cor: rgb(200, 200, 200)
```

#### Estado Hover (mouse sobre)
```
┌──────────────┐
│   🚪 Sair    │  (Fundo VERMELHO com brilho)
└──────────────┘
Gradiente: #ff6b6b → #ff4757
Sombra: 0 10px 30px rgba(255, 107, 107, 0.3)
```

---

## 📱 Layout Mobile (<768px)

### Sem Menu Aberto
```
┌──────────────────────────────────────────────┐
│                                              │
│  ⚽ Bolão VIP    [Selecione ▼]    [☰]       │  ← Clique aqui
│                                              │
└──────────────────────────────────────────────┘

Resto da página...
```

### Menu Aberto (Dropdown)
```
┌──────────────────────────────────────────────┐
│                                              │
│  ⚽ Bolão VIP    [Selecione ▼]    [☰]       │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  📰 Notícias                                 │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  🎯 Meus Palpites                           │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  📜 Meu Histórico                           │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  🏆 Ranking da Rodada                       │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  👑 Ranking Geral                           │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  ⚽ Resultados                              │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  📊 Classificação                           │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  ⚙️ Configurações                          │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  👥 Gerenciar Usuários                      │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  💳 Pagamentos                              │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│                                              │
│  🚪 Sair         ← NOVO! Clique aqui       │
│                                              │
└──────────────────────────────────────────────┘
```

#### Estados do Botão Mobile

**Normal:**
```
┌──────────────────────────────────────────────┐
│ 🚪 Sair                                      │ (Fundo semi-transparente)
└──────────────────────────────────────────────┘
```

**Hover/Clique:**
```
┌──────────────────────────────────────────────┐
│ 🚪 Sair                                      │ (Fundo VERMELHO)
└──────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Visual - Antes e Depois

### ANTES (sem Logout)
```
┌──────────────────────────────┐
│ ⚽ BOLÃO VIP                  │
├──────────────────────────────┤
│ 📰 Notícias                  │
│ 🎯 Palpites                 │
│ 📜 Histórico                │
│ 🏆 Ranking                  │
│ ... (fim do menu)           │
│                              │
│ Sem opção de sair!          │
│                              │
└──────────────────────────────┘
```

### DEPOIS (com Logout) ✨
```
┌──────────────────────────────┐
│ ⚽ BOLÃO VIP                  │
├──────────────────────────────┤
│ 📰 Notícias                  │
│ 🎯 Palpites                 │
│ 📜 Histórico                │
│ 🏆 Ranking                  │
│ ... (meio do menu)          │
├──────────────────────────────┤ ← Separador visual
│ 🚪 Sair                     │ ← NOVO!
│                              │
│ Agora é fácil fazer logout! │
│                              │
└──────────────────────────────┘
```

---

## 🎬 Animação de Logout (Sequência)

### Frame 1: Clique no Botão
```
📱 MENU MOBILE
├─ 📰 Notícias
├─ 🎯 Palpites
├─ 📜 Histórico
├─ 🏆 Ranking
├─ ... 
├─ ▶️ 🚪 Sair     ← [CLIQUE AQUI]
```

### Frame 2: Efeito Hover
```
📱 MENU MOBILE
├─ 📰 Notícias
├─ 🎯 Palpites
├─ 📜 Histórico
├─ 🏆 Ranking
├─ ... 
├─ ✨ 🚪 Sair    ← [ANIMAÇÃO: Brilho vermelho]
```

### Frame 3: Em Processamento
```
📱 MENU MOBILE
├─ 📰 Notícias
├─ 🎯 Palpites
├─ 📜 Histórico
├─ 🏆 Ranking
├─ ... 
├─ ⏳ 🚪 Sair    ← [Processando...]
```

### Frame 4: Logout Completado
```
🔄 Redirecionando...

[Fundo desfocado]

         ┌──────────────────────────┐
         │   BOLÃO VIP - LOGIN      │
         │                          │
         │   Email: ___________     │
         │   Senha: ___________     │
         │                          │
         │   [Entrar] [Cadastro]    │
         │                          │
         └──────────────────────────┘

✅ Logout bem-sucedido!
```

---

## 🎨 Paleta de Cores

### Cores do Sistema
```
Primária (Verde):    #3df29d (rgba(61, 242, 157))
Escuro (Fundo):      #050b14 (rgba(5, 11, 20))
Texto:               #e0e0e0
Sair (Vermelha):     #ff6b6b → #ff4757 (gradiente)
```

### Estados do Botão

| Estado | Cor Fundo | Cor Texto | Sombra |
|--------|-----------|-----------|--------|
| Normal | rgba(255,255,255,0.02) | #e0e0e0 | Nenhuma |
| Hover | #ff6b6b → #ff4757 | #041013 | rgba(255,107,107,0.3) |
| Ativo | (igual hover) | #041013 | (igual hover) |

---

## 📐 Dimensões e Espaçamento

### Desktop
```
┌─────────────────────────────────────┐
│ Padding Menu: 0.6rem gap            │
├─────────────────────────────────────┤
│ Padding Botão:                      │
│   ├─ Vertical: 0.55rem              │
│   ├─ Horizontal: 0.9rem             │
│   └─ Margem Top: 0.8rem             │
│                                     │
│ Border-Radius: 10px                 │
│ Font-Size: 1rem (16px)              │
└─────────────────────────────────────┘
```

### Mobile
```
┌─────────────────────────────────────┐
│ Menu Dropdown Width: 100%           │
├─────────────────────────────────────┤
│ Padding Botão:                      │
│   ├─ Vertical: 1rem (20px)          │
│   ├─ Horizontal: 1.5rem (24px)      │
│   └─ Largura: 100%                  │
│                                     │
│ Border-Radius: 0px (cantos retos)   │
│ Font-Size: 1rem (16px)              │
│ Max-Height: calc(100vh - 70px)      │
└─────────────────────────────────────┘
```

---

## ⚡ Transições e Animações

### Transição de Hover
```css
transition: all 0.18s ease;
/* 
  - Background color: 0.18s
  - Box shadow: 0.18s
  - Color: 0.18s
  - Todos os efeitos simultâneos
*/
```

### Sombra de Hover (Desktop)
```
Offset X: 0px
Offset Y: 10px
Blur: 30px
Color: rgba(255, 107, 107, 0.3)
```

---

## 🔍 Responsividade

### Breakpoints

| Dispositivo | Width | Comportamento |
|-----------|-------|------------------|
| Desktop | > 768px | Menu horizontal na toolbar |
| Tablet | 481px - 768px | Dropdown menu |
| Mobile | ≤ 480px | Dropdown menu otimizado |

### Media Query
```css
@media (max-width: 768px) {
  .menu-sair {
    /* Estilos mobile */
  }
}
```

---

## 🎯 Indicadores Visuais

### Antes de Clicar (Desktop)
```
Toolbar normal com links:
📰 📎 📊 ... | 🚪 Sair ← Destaque suave
```

### Hover (Desktop)
```
Botão muda cor:
┌───────────────┐
│ 🚪 Sair       │ ← Vermelho brilhante + sombra
└───────────────┘ ✨
```

### Clique (Mobile)
```
Menu dropdown abre:
│ ...            │
│ 💳 Pagamentos │
├───────────────┤
│ 🚪 Sair       │ ← Destacado em vermelho
└───────────────┘
```

---

## 🚀 Sequência de Render

```
1. Componente Header monta
   └─ Verifica se usuário logado
      └─ Se logado, mostra menu com botão Sair

2. Usuário interage
   └─ Mouse hover
      └─ Classe :hover aplicada
         └─ Estilos de hover executam

3. Clique no botão
   └─ handleLogout() executada
      └─ Axios POST /auth/logout
         └─ localStorage.removeItem() x4
            └─ dispatchEvent('authChange')
               └─ navigate('/login')
                  └─ Redirecionamento

4. useEffect de authChange
   └─ Componentes sincronizam
      └─ App renderiza tela de login
```

---

## 🎬 Demonstração Visual Passo a Passo

### Cenário: Usuário em Desktop quer fazer Logout

```
PASSO 1: Localize o botão
╔════════════════════════════════════════════════════╗
║ ⚽ Bolão VIP  [grupo ▼]                           ║
║ Notícias | Palpites | Histórico | Ranking | Sair ║
║                                    aqui ↑ está! ✅ ║
╚════════════════════════════════════════════════════╝

PASSO 2: Passe mouse sobre botão
╔════════════════════════════════════════════════════╗
║ ⚽ Bolão VIP  [grupo ▼]                           ║
║ Notícias | Palpites | Histórico | Ranking | Sair ║
║                              ┌──────────────────┐ ║
║                              │ 🚪 Sair (hover) │ ║
║                              └──────────────────┘ ║
║                              ✨ Muda para vermelho║
╚════════════════════════════════════════════════════╝

PASSO 3: Clique no botão
╔════════════════════════════════════════════════════╗
║ ⚽ Bolão VIP  [grupo ▼]                           ║
║ Notícias | Palpites | Histórico | Ranking | ⏳   ║
║                       Processando logout...        ║
╚════════════════════════════════════════════════════╝

PASSO 4: Sistema redireciona
╔════════════════════════════════════════════════════╗
║                BOLÃO VIP - LOGIN                  ║
║                                                    ║
║   📧 Email:  _____________________                ║
║                                                    ║
║   🔐 Senha:  _____________________                ║
║                                                    ║
║   [ Entrar ]  [ Cadastro ]                        ║
║                                                    ║
║   ✅ Logout realizado com sucesso!                ║
╚════════════════════════════════════════════════════╝
```

---

**Versão**: 1.0
**Data**: 25 de Dezembro de 2025
**Status**: ✅ Visual Completo
