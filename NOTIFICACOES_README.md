# 🔔 Sistema de Notificações - Bolão VIP

## ✅ Implementação Completa

Sistema de notificações em tempo real para usuários do Bolão VIP com botão flutuante responsivo e modal de visualização.

---

## 📦 Arquivos Criados

### **Backend:**
- ✅ `backend/scripts/criarTabelaNotificacoes.sql` - Script SQL para criar tabela
- ✅ `backend/services/notificacoesService.js` - Service com lógica de negócio
- ✅ `backend/controllers/notificacoesController.js` - Controller com endpoints
- ✅ `backend/routes/notificacoesRoutes.js` - Rotas da API
- ✅ `backend/services/integracaoNotificacoesService.js` - Helpers de integração
- ✅ `backend/server.js` - Routes registradas

### **Frontend:**
- ✅ `frontend/bolao-vip/src/components/ui/badge.jsx` - Badge component (Shadcn/ui)
- ✅ `frontend/bolao-vip/src/components/ui/dialog.jsx` - Dialog component (Shadcn/ui)
- ✅ `frontend/bolao-vip/src/components/ui/scroll-area.jsx` - ScrollArea component (Shadcn/ui)
- ✅ `frontend/bolao-vip/src/components/NotificacoesFloating.jsx` - Componente principal
- ✅ `frontend/bolao-vip/src/components/NotificacoesFloating.css` - Estilos responsivos
- ✅ `frontend/bolao-vip/src/components/Layout.js` - Componente adicionado

---

## 🗄️ Banco de Dados

### 1. Executar Script SQL

Execute no MySQL:

```sql
-- Copiar conteúdo de backend/scripts/criarTabelaNotificacoes.sql
CREATE TABLE IF NOT EXISTS notificacoes_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('palpite_enviado', 'pagamento_confirmado', 'inicio_rodada', 'resultado_publicado', 'premio_recebido', 'sistema') NOT NULL DEFAULT 'sistema',
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  dados_json JSON NULL,
  lida BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_leitura TIMESTAMP NULL,
  
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_lida (lida),
  INDEX idx_data_criacao (data_criacao),
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔌 API Endpoints

Todas as rotas requerem autenticação (`Authorization: Bearer <token>`).

### **GET /notificacoes/usuario**
Lista notificações do usuário logado.

**Query Params:**
- `nao_lidas=true` (opcional) - Retorna apenas não lidas
- `limite=50` (opcional) - Limite de resultados

**Response:**
```json
{
  "notificacoes": [
    {
      "id": 1,
      "tipo": "palpite_enviado",
      "titulo": "⚽ Palpite enviado - Rodada 20",
      "mensagem": "Seus palpites foram registrados!",
      "dados_json": { "rodada": 20, "codigo_pix": "abc123", "valor": 10.0 },
      "lida": false,
      "data_criacao": "2025-12-18T10:30:00",
      "data_leitura": null
    }
  ],
  "total_nao_lidas": 5
}
```

### **GET /notificacoes/contador**
Retorna apenas o contador de não lidas.

**Response:**
```json
{
  "total_nao_lidas": 5
}
```

### **PATCH /notificacoes/:id/marcar-lida**
Marca uma notificação como lida.

### **PATCH /notificacoes/marcar-todas-lidas**
Marca todas as notificações como lidas.

### **DELETE /notificacoes/:id**
Deleta uma notificação específica.

### **DELETE /notificacoes/limpar-lidas**
Deleta todas as notificações já lidas.

---

## 🎯 Como Integrar nos Fluxos

### **1. Ao Enviar Palpite**
Em `backend/controllers/palpiteController.js` após criar cobrança PIX:

```javascript
const integracaoNotif = require('../services/integracaoNotificacoesService');

// Após criar cobrança com sucesso
await integracaoNotif.notificarPalpiteEnviado(
  id_usuario,
  rodada,
  codigo_envio,
  10.00
);
```

### **2. Ao Confirmar Pagamento**
Em `backend/services/saldoService.js` após confirmar:

```javascript
const integracaoNotif = require('./integracaoNotificacoesService');

await integracaoNotif.notificarPagamentoConfirmado(
  usuario_id,
  valor,
  rodada  // opcional
);
```

### **3. Ao Iniciar Rodada**
Em `backend/services/scheduler.js`:

```javascript
const integracaoNotif = require('./integracaoNotificacoesService');

await integracaoNotif.notificarInicioRodada(rodadaAtual, dataInicio);
```

### **4. Ao Publicar Resultados**
Em `backend/services/consultaResultadosService.js`:

```javascript
const integracaoNotif = require('./integracaoNotificacoesService');

await integracaoNotif.notificarResultadosPublicados(rodada);
```

### **5. Ao Distribuir Prêmios**
Em `backend/controllers/rankingController.js`:

```javascript
const integracaoNotif = require('../services/integracaoNotificacoesService');

await integracaoNotif.notificarPremioRecebido(
  usuario_id,
  rodada,
  posicao,
  valorPremio,
  'RECEBE'  // ou 'PAGA'
);
```

---

## 🎨 Componente Frontend

### **Recursos:**
- ✅ Botão flutuante (FAB) no canto inferior direito
- ✅ Badge com contador de não lidas
- ✅ Modal responsivo com lista de notificações
- ✅ Scroll infinito para muitas notificações
- ✅ Marcar como lida (individual ou todas)
- ✅ Deletar notificações
- ✅ Limpar todas as lidas
- ✅ Ícones personalizados por tipo
- ✅ Polling automático a cada 30s
- ✅ Suporte completo a dark mode

### **Responsividade:**
- Desktop: `500px` largura
- Tablet (≤768px): `450px` largura
- Mobile (≤640px): `95vw` largura
- Small Mobile (≤425px): Ajustes de padding e fontes
- Ultra Small (≤375px): Layout otimizado

### **Tipos de Notificações:**
- `palpite_enviado` → ⚽ (verde)
- `pagamento_confirmado` → 💰 (verde)
- `inicio_rodada` → 📢 (azul)
- `resultado_publicado` → 🏆 (amarelo)
- `premio_recebido` → 🎉 (verde)
- `sistema` → 🔔 (cinza)

---

## 🧪 Testar Sistema

### **1. Criar notificação de teste via MySQL:**
```sql
INSERT INTO notificacoes_usuarios (usuario_id, tipo, titulo, mensagem, dados_json)
VALUES (7, 'sistema', '🎉 Bem-vindo!', 'Sistema de notificações ativo!', '{"teste": true}');
```

### **2. Testar via API (Postman/Thunder Client):**
```bash
# Listar notificações
GET http://192.168.56.127:3001/notificacoes/usuario
Authorization: Bearer <seu_token>

# Contador
GET http://192.168.56.127:3001/notificacoes/contador
Authorization: Bearer <seu_token>
```

### **3. Ver no Frontend:**
1. Fazer login
2. Ver botão 🔔 no canto inferior direito
3. Badge aparece se houver não lidas
4. Clicar para abrir modal

---

## 📊 Estrutura de Dados JSON

### **Exemplo para Palpite:**
```json
{
  "rodada": 20,
  "codigo_pix": "abc123...",
  "valor": 10.0
}
```

### **Exemplo para Pagamento:**
```json
{
  "valor": 10.0,
  "rodada": 20
}
```

### **Exemplo para Resultado:**
```json
{
  "rodada": 20,
  "pontos": 15.5
}
```

---

## 🚀 Próximos Passos (Opcional)

1. **WebSocket em tempo real** - Substituir polling por WebSocket
2. **Push Notifications** - Notificações do navegador
3. **Email/SMS** - Enviar notificações importantes por email
4. **Filtros por tipo** - Filtrar notificações no modal
5. **Som de notificação** - Alert sonoro para novas notificações
6. **Histórico completo** - Página dedicada com paginação

---

## 🐛 Troubleshooting

### **Botão não aparece:**
- Verificar se está logado (token no localStorage)
- Verificar console do navegador para erros
- Verificar se Layout.js inclui `<NotificacoesFloating />`

### **Erro 401 na API:**
- Token expirado ou inválido
- Fazer logout e login novamente

### **Notificações não carregam:**
- Verificar se tabela `notificacoes_usuarios` existe
- Verificar se routes estão registradas em `server.js`
- Verificar logs do backend no console

---

## ✅ Status Final

**Backend:** ✅ 100% Implementado  
**Frontend:** ✅ 100% Implementado  
**Database:** ✅ Script SQL criado  
**Integração:** ✅ Helpers prontos  
**Responsividade:** ✅ Todas as telas  
**Dark Mode:** ✅ Suportado  
**Shadcn/ui:** ✅ Utilizado  

**Sistema pronto para uso!** 🎉
