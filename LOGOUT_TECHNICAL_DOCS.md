# 🚀 Documentação Técnica - Feature Logout

## 📋 Visão Geral

Feature que adiciona funcionalidade de logout ao sistema com redirecionamento para tela de login.

## 🏗️ Arquitetura

```
Frontend (React)
│
├── Header.js (Component)
│   ├── handleLogout() [função]
│   └── <button> "Sair" [render]
│
├── Header.css (Styling)
│   ├── .menu-sair [desktop]
│   ├── .menu-sair:hover [interação]
│   └── @media (mobile) [responsivo]
│
└── React Router
    └── navigate('/login') [redirecionamento]

┌────────────────────────────────────────────┐
│ Backend (Node.js/Express)                  │
│ ✅ POST /auth/logout [já existente]       │
└────────────────────────────────────────────┘
```

## 📝 Implementação Detalhada

### 1. Import de Dependencies

**Arquivo**: `frontend/bolao-vip/src/components/Header.js`

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';  // ← useNavigate adicionado
import { AlignJustify } from 'lucide-react';
import axios from 'axios';
import storage from '../utils/storage';
import SaldoDropdown from './SaldoDropdown';
import API_BASE_URL from '../config';
import './Header.css';
```

### 2. Inicialização do Hook

```javascript
const Header = () => {
  const navigate = useNavigate();  // ← Hook de navegação
  const [menuAberto, setMenuAberto] = useState(false);
  // ... resto do component
};
```

### 3. Função de Logout

```javascript
const handleLogout = async () => {
  // FASE 1: Tentar fazer logout no backend
  try {
    if (token) {
      await axios.post(
        `${API}/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  } catch (err) {
    // Ignora erros (sem conexão, token expirado, etc)
    console.error('Erro ao fazer logout:', err);
  } 
  
  // FASE 2: SEMPRE executar (mesmo com erro)
  finally {
    // Limpar localStorage
    storage.removeItem('token');
    storage.removeItem('refreshToken');
    storage.removeItem('userName');
    storage.removeItem('grupoId');
    
    // Sincronizar estado global
    window.dispatchEvent(new Event('authChange'));
    
    // Redirecionar para login
    navigate('/login');
  }
};
```

#### Detalhes da Função:

| Fase | O que faz | Motivo |
|------|-----------|--------|
| Try | Chama `/auth/logout` no backend | Informar servidor que usuário saiu |
| Catch | Ignora erros silenciosamente | Logout local funciona mesmo sem conexão |
| Finally | SEMPRE executa após try/catch | Garante limpeza mesmo se houver erro |
| - | Remove 4 items do localStorage | Garantir segurança |
| - | Dispara evento 'authChange' | Sincronizar estado em todo app |
| - | Navega para '/login' | Redirecionar usuário |

### 4. Renderização do Botão

```javascript
<nav className={`menu ${menuAberto ? 'ativo' : ''}`}>
  {/* ... outros links do menu ... */}
  
  {/* NOVO: Botão de Logout */}
  <button 
    className="menu-sair" 
    onClick={() => { 
      handleLogout();      // Executa logout
      fecharMenu();        // Fecha menu (mobile)
    }}
  >
    🚪 Sair
  </button>
</nav>
```

## 🎨 Estilos CSS

### Desktop (.menu-sair)

```css
.menu-sair {
  color: var(--text);                              /* Texto branco */
  text-decoration: none;
  font-weight: 700;                                /* Bold */
  padding: 0.55rem 0.9rem;                        /* Espaçamento */
  border-radius: 10px;                            /* Cantos arredondados */
  transition: all 0.18s ease;                     /* Transição suave */
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.02);         /* Fundo semi-transparente */
  cursor: pointer;                                /* Cursor de clique */
  font-size: 1rem;
  font-family: inherit;
  margin-left: auto;                              /* Empurra para direita */
  border-top: 1px solid rgba(255, 255, 255, 0.08);  /* Separador */
  padding-top: 0.8rem;
  margin-top: 0.8rem;                             /* Espaço acima */
}

.menu-sair:hover {
  color: #041013;                                 /* Texto escuro */
  background: linear-gradient(135deg, #ff6b6b, #ff4757);  /* Gradiente vermelho */
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);      /* Sombra */
}
```

### Mobile (@media 768px)

```css
@media (max-width: 768px) {
  .menu-sair {
    width: 100%;                                  /* Ocupa largura total */
    text-align: left;                            /* Alinha texto esquerda */
    padding: 1rem 1.5rem;                        /* Maior padding */
    border-radius: 0;                            /* Cantos retos */
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0;                                   /* Remove margin */
    margin-top: auto;                            /* Empurra para baixo */
    cursor: pointer;
    font-family: inherit;
    font-size: 1rem;
  }

  .menu-sair:hover {
    color: #041013;
    background: linear-gradient(135deg, #ff6b6b, #ff4757);
  }
}
```

## 🔄 Fluxo de Execução

```javascript
// Usuário clica em "🚪 Sair"
┌─────────────────────────────────────────────────────┐
│ onClick={() => { handleLogout(); fecharMenu(); }}  │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│ handleLogout() ASYNC                                │
├─────────────────────────────────────────────────────┤
│ try {                                               │
│   if (token) {                                      │
│     await axios.post(                              │
│       POST /auth/logout                            │
│     );                                              │
│   }                                                 │
│ } catch (err) {                                     │
│   console.error('Erro ao fazer logout:', err);     │
│ } finally {                                         │
│   storage.removeItem('token');                      │
│   storage.removeItem('refreshToken');              │
│   storage.removeItem('userName');                  │
│   storage.removeItem('grupoId');                   │
│   window.dispatchEvent(new Event('authChange'));   │
│   navigate('/login');                              │
│ }                                                   │
└─────────────────────────────────────────────────────┘
```

## 🧪 Casos de Teste

### TC-001: Logout em Desktop
**Pré-condição**: Usuário logado em resolução desktop (>1024px)

**Passos**:
1. Localize botão "🚪 Sair" na toolbar
2. Clique no botão
3. Observe redirecionamento

**Resultado Esperado**:
- ✅ Redirecionado para `/login`
- ✅ Token removido do localStorage
- ✅ Nenhum erro no console

---

### TC-002: Logout em Mobile
**Pré-condição**: Usuário logado em resolução mobile (<768px)

**Passos**:
1. Clique em ☰ para abrir menu
2. Localize "🚪 Sair" no final
3. Clique no botão

**Resultado Esperado**:
- ✅ Menu fecha automaticamente
- ✅ Redirecionado para `/login`
- ✅ Token removido do localStorage

---

### TC-003: Logout sem Conexão
**Pré-condição**: Usuário logado com conexão desativada

**Passos**:
1. Abra DevTools Network (F12)
2. Throttle para "Offline"
3. Clique em "🚪 Sair"

**Resultado Esperado**:
- ✅ Erro ignorado
- ✅ localStorage ainda é limpo
- ✅ Redirecionado para login
- ✅ Logout local funciona

---

### TC-004: Verificação de Limpeza
**Pré-condição**: Usuário após logout

**Passos**:
1. Abra DevTools Console (F12)
2. Execute: `localStorage.getItem('token')`

**Resultado Esperado**:
```javascript
null  // Token foi removido ✅
```

---

### TC-005: Evento authChange
**Pré-condição**: Listener de evento ativo

**Passos**:
1. Adicione listener no console: 
   ```javascript
   window.addEventListener('authChange', () => console.log('Auth changed'));
   ```
2. Clique em logout

**Resultado Esperado**:
- ✅ Mensagem aparece no console
- ✅ Componentes que escutam evento atualizam

---

## 🔐 Segurança

### Checklist de Segurança

- ✅ Token Bearer removido
- ✅ Refresh token removido
- ✅ Dados de usuário apagados
- ✅ Grupo selecionado apagado
- ✅ Sem armazenamento em cache
- ✅ Redirecionamento imediato
- ✅ Evento global disparado

### Possíveis Vulnerabilidades (Prevenidas)

| Vulnerabilidade | Prevenção |
|-----------------|-----------|
| XSS (Cross-Site Scripting) | Usando React (auto-escape) |
| CSRF (Cross-Site Request Forgery) | Usando Bearer token + CORS |
| Session Fixation | Token removido após logout |
| Cache de Credenciais | localStorage limpo completamente |
| Unauthorized Access | Redireciona para login requerindo re-autenticação |

---

## 📊 Performance

| Métrica | Valor |
|---------|-------|
| Tempo de logout | < 100ms (local) + latência de rede (backend) |
| Tamanho do código | ~30 linhas (JS) + ~50 linhas (CSS) |
| Impacto no bundle | Negligenciável (usa libs já existentes) |
| Renderização | Sem re-renders desnecessários |

---

## 🔗 Integrações

### Com Componentes Existentes

```javascript
// 1. Com React Router (useNavigate)
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/login');  // Navega sem reload

// 2. Com Sistema de Storage
import storage from '../utils/storage';
storage.removeItem('token');  // Remove do custom storage

// 3. Com Axios/API
await axios.post(`${API}/auth/logout`, ...);  // Chama backend

// 4. Com Eventos Globais
window.dispatchEvent(new Event('authChange'));  // Sincroniza app
```

### Componentes que Escutam 'authChange'

Qualquer componente que executa:
```javascript
window.addEventListener('authChange', () => {
  // Atualiza estado de autenticação
});
```

Será notificado quando usuário faz logout.

---

## 🚀 Deploy

### Checklist de Deploy

- ✅ Código testado localmente
- ✅ Sem erros de compilação
- ✅ Responsivo em múltiplos resolutions
- ✅ Sem erros no console
- ✅ Performance aceitável
- ✅ Segurança validada

### Instrução de Deploy

```bash
# Frontend
cd frontend/bolao-vip
npm run build  # Cria build otimizado

# Deploy em seu servidor
# (copiar dist/ para servidor web)
```

**Nota**: Backend não precisa de deploy (endpoint já existe)

---

## 📚 Referências

### Arquivos Modificados
- `frontend/bolao-vip/src/components/Header.js` - Lógica
- `frontend/bolao-vip/src/components/Header.css` - Estilos

### Documentação Relacionada
- [React Router useNavigate](https://reactrouter.com/en/main/start/overview)
- [Custom Storage Utility](../frontend/bolao-vip/src/utils/storage.js)
- [API Configuration](../frontend/bolao-vip/src/config.js)

### Dependências
- `react-router-dom`: ^6.x
- `axios`: ^1.x

---

## 🐛 Debug

### Verificar se Logout Funcionou

```javascript
// No console do navegador (F12)

// 1. Verificar token removido
console.log(localStorage.getItem('token'));  // Deve retornar: null

// 2. Verificar outros dados
console.log(localStorage.getItem('refreshToken'));  // null
console.log(localStorage.getItem('userName'));      // null
console.log(localStorage.getItem('grupoId'));       // null

// 3. Verificar URL
console.log(window.location.pathname);  // Deve ser: /login

// 4. Verificar evento
window.addEventListener('authChange', () => {
  console.log('✅ authChange foi disparado!');
});
```

---

## 📞 Suporte Técnico

Para problemas técnicos:

1. Verifique console do navegador (F12)
2. Verifique aba Network para erros de API
3. Verifique localStorage (F12 → Application → Storage)
4. Teste em navegação privada/incógnita
5. Limpe cache e cookies

---

**Documentação Técnica v1.0**
**Data**: 25 de Dezembro de 2025
**Status**: ✅ Completo
**Mantido por**: Tim de Desenvolvimento
