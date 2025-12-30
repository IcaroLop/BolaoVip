# 💰 Sistema de Pagamento com Saldo - Bolão VIP

## ✅ Implementação Completa - Backend

Sistema que verifica saldo do usuário antes de gerar PIX, permitindo pagamento via saldo, PIX integral ou PIX parcial.

---

## 🎯 Fluxo Completo

### **1. Usuário Envia Palpites**

#### **Cenário A: Saldo Suficiente (≥ R$ 10,00)**
```
✅ Verifica saldo → R$ 10,00 ou mais
✅ Debita R$ 10,00 do saldo
✅ Registra palpites
✅ NÃO gera PIX
✅ Retorna: { pagamento_completo: true }
```

#### **Cenário B: Saldo Insuficiente (< R$ 10,00)**
```
❌ Verifica saldo → R$ 6,00 (exemplo)
🔄 Retorna opções:
{
  "saldo_insuficiente": true,
  "saldo_atual": 6.00,
  "valor_palpite": 10.00,
  "diferenca": 4.00
}
```

#### **Cenário B.1: Usuário Escolhe PIX Integral**
```
✅ Registra palpites
❌ NÃO debita saldo
✅ Gera PIX de R$ 10,00
✅ Retorna: { precisa_gerar_pix: true, valor_pix: 10.00 }
```

#### **Cenário B.2: Usuário Escolhe PIX Parcial**
```
✅ Debita R$ 6,00 do saldo
✅ Registra palpites
✅ Gera PIX de R$ 4,00 (diferença)
✅ Retorna: { precisa_gerar_pix: true, valor_pix: 4.00 }
```

---

## 🔒 Sistema de Bloqueio

### **Bloqueio Automático**
Usuário fica **bloqueado** quando:
- Possui PIX pendente (`status_pagamento = 'PENDENTE'`)
- Palpites registrados mas pagamento não confirmado

### **Consequências do Bloqueio**
- ❌ **Não pode** enviar novos palpites (outras rodadas)
- ❌ **Não pode** receber premiações
- ✅ **Pode** visualizar telas e histórico
- ✅ **Pode** pagar PIX pendente para desbloquear

### **Desbloqueio Automático**
- Ao confirmar pagamento PIX
- Sistema atualiza `status_pagamento = 'CONCLUIDO'`
- Usuário fica liberado automaticamente

---

## 📡 API Backend

### **POST /palpites/enviar**

**Request (Primeira chamada - sem opcao_pagamento):**
```json
{
  "rodada": 20,
  "palpites": [
    { "jogo_id": 1, "placar_casa": 2, "placar_fora": 1 },
    { "jogo_id": 2, "placar_casa": 0, "placar_fora": 0 }
  ],
  "grupoId": 5
}
```

**Response A - Saldo Suficiente:**
```json
{
  "mensagem": "Palpite confirmado! R$ 10.00 debitado do saldo.",
  "codigo_envio": "abc123...",
  "precisa_gerar_pix": false,
  "pagamento_completo": true
}
```

**Response B - Saldo Insuficiente:**
```json
{
  "saldo_insuficiente": true,
  "saldo_atual": 6.00,
  "valor_palpite": 10.00,
  "diferenca": 4.00,
  "mensagem": "Saldo insuficiente. Escolha uma opção de pagamento."
}
```

**Request (Segunda chamada - com opcao_pagamento):**
```json
{
  "rodada": 20,
  "palpites": [ ... ],
  "grupoId": 5,
  "opcao_pagamento": "pix_parcial"  // ou "pix_integral"
}
```

**Response - PIX Parcial:**
```json
{
  "mensagem": "R$ 6.00 debitado do saldo. Pague R$ 4.00 via PIX para confirmar.",
  "codigo_envio": "abc123...",
  "precisa_gerar_pix": true,
  "valor_pix": 4.00,
  "pagamento_completo": false
}
```

**Response - PIX Integral:**
```json
{
  "mensagem": "Palpites registrados. Pague R$ 10.00 via PIX para confirmar.",
  "codigo_envio": "abc123...",
  "precisa_gerar_pix": true,
  "valor_pix": 10.00,
  "pagamento_completo": false
}
```

---

### **GET /palpites/verificar-bloqueio**

**Headers:**
```
Authorization: Bearer <token>
```

**Response - Não Bloqueado:**
```json
{
  "bloqueado": false,
  "total_pendente": 0,
  "mensagem": "Nenhum pagamento pendente."
}
```

**Response - Bloqueado:**
```json
{
  "bloqueado": true,
  "total_pendente": 2,
  "mensagem": "Você possui 2 pagamento(s) pendente(s). Finalize o(s) pagamento(s) para enviar novos palpites e receber premiações."
}
```

---

## 💾 Banco de Dados

### **Tabelas Utilizadas**

#### **palpites**
```sql
codigo_envio VARCHAR(26)  -- Vincula palpites ao pagamento
```

#### **pix_cobrancas**
```sql
codigo_envio VARCHAR(26)
status_pagamento ENUM('PENDENTE', 'CONCLUIDO', 'CANCELADO')
valor_original DECIMAL(10,2)
```

#### **saldo_usuario**
```sql
usuario_id INT
saldo_atual DECIMAL(10,2)
saldo_bloqueado DECIMAL(10,2)  -- Para futuras reservas
```

#### **extrato_movimentacao**
```sql
tipo VARCHAR(50)  -- 'palpite_debitado'
valor DECIMAL(10,2)  -- Valor debitado
referencia_id VARCHAR(26)  -- codigo_envio
referencia_tipo VARCHAR(50)  -- 'palpite'
saldo_anterior DECIMAL(10,2)
saldo_novo DECIMAL(10,2)
```

---

## 🔄 Fluxo de Dados

```
Frontend: Enviar Palpites
    ↓
Backend: Verificar Saldo
    ↓
Saldo >= 10? 
    ↓ SIM
    ├─> Debitar R$ 10,00
    ├─> Registrar extrato
    ├─> Salvar palpites
    └─> Retornar: pagamento_completo=true
    ↓ NÃO
    └─> Retornar: saldo_insuficiente=true com opções
    ↓
Frontend: Exibir Modal de Escolha
    ↓
Usuário Escolhe: PIX Integral ou PIX Parcial?
    ↓ PIX Integral
    ├─> Backend: Registrar palpites
    ├─> Backend: Gerar PIX R$ 10,00
    └─> Frontend: Exibir QR Code
    ↓ PIX Parcial
    ├─> Backend: Debitar saldo disponível
    ├─> Backend: Registrar palpites
    ├─> Backend: Gerar PIX da diferença
    └─> Frontend: Exibir QR Code
```

---

## 🧪 Cenários de Teste

### **Teste 1: Saldo Suficiente**
1. Usuário com saldo R$ 50,00
2. Enviar palpites da rodada 20
3. ✅ Esperado: Débito de R$ 10,00, sem PIX

### **Teste 2: Sem Saldo**
1. Usuário com saldo R$ 0,00
2. Enviar palpites
3. ✅ Esperado: Modal com opções
4. Escolher "PIX Integral"
5. ✅ Esperado: PIX de R$ 10,00

### **Teste 3: Saldo Parcial**
1. Usuário com saldo R$ 6,00
2. Enviar palpites
3. ✅ Esperado: Modal com opções
4. Escolher "PIX Parcial"
5. ✅ Esperado: Débito R$ 6,00 + PIX R$ 4,00

### **Teste 4: Bloqueio por Pendência**
1. Usuário com PIX pendente
2. Tentar enviar palpites de nova rodada
3. ✅ Esperado: Alerta de bloqueio, botão desabilitado

### **Teste 5: Desbloqueio Automático**
1. Usuário bloqueado
2. Admin confirma pagamento PIX
3. ✅ Esperado: Usuário desbloqueado automaticamente

---

## 📝 Logs e Debug

### **Console Logs Backend:**
```
[enviarPalpites] Saldo disponível: R$ 6.00, Valor palpite: R$ 10.00
[enviarPalpites] 💰 Saldo insuficiente. Diferença: R$ 4.00
[enviarPalpites] 💰💳 Saldo R$ 6.00 debitado + PIX de R$ 4.00
[verificarBloqueio] usuario=7, bloqueado=true, total_pendente=2
```

---

## ⚠️ Importante

1. **Palpites são registrados SEMPRE** (mesmo com PIX pendente)
2. **Saldo é debitado ANTES** de gerar PIX parcial
3. **Bloqueio impede** novos palpites E premiações
4. **Desbloqueio é automático** ao confirmar pagamento
5. **Reverter débito** requer intervenção manual do admin se PIX não for pago

---

## 🚀 Status Final

**Backend:** ✅ 100% Implementado  
- ✅ Verificação de saldo em enviarPalpites()
- ✅ Três opções de pagamento (saldo/PIX integral/PIX parcial)
- ✅ Endpoint /verificar-bloqueio
- ✅ Sistema de bloqueio por PIX pendente
- ✅ Logs detalhados

**Frontend:** ✅ 100% Implementado  
- ✅ Modal de escolha de pagamento (OpcoesPagamentoModal.js)
- ✅ Verificação de bloqueio ao carregar
- ✅ Integração com novo fluxo da API
- ✅ Alerta visual de bloqueio
- ✅ Desabilitação de envio quando bloqueado
- ✅ Suporte a PIX integral, PIX parcial e saldo total

**Testes:** ⏳ Aguardando

---

## 🎨 Frontend - Componentes Criados

### **OpcoesPagamentoModal.js**
Modal responsivo com duas opções:
- **PIX Integral**: Pagar R$ 10,00 via PIX (não usa saldo)
- **Usar Saldo + PIX**: Debita saldo disponível + PIX da diferença

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: function,
  saldoAtual: number,
  valorPalpite: number,
  diferenca: number,
  onEscolherOpcao: function
}
```

### **PalpitePage.js - Modificações**

**Novos Estados:**
```javascript
const [usuarioBloqueado, setUsuarioBloqueado] = useState(false);
const [totalPendente, setTotalPendente] = useState(0);
const [mensagemBloqueio, setMensagemBloqueio] = useState('');
const [mostrarOpcoesModal, setMostrarOpcoesModal] = useState(false);
const [dadosSaldoInsuficiente, setDadosSaldoInsuficiente] = useState(null);
const [quadroEmProcessamento, setQuadroEmProcessamento] = useState(null);
```

**Fluxo de Envio Modificado:**
1. Usuário preenche palpites
2. Clica em "Enviar Palpites"
3. **Verificação de bloqueio** - Se bloqueado, exibe alerta e bloqueia
4. **Backend verifica saldo:**
   - Saldo suficiente → Debita e confirma (sem PIX)
   - Saldo insuficiente → Retorna opções
5. **Modal aparece** com 2 opções
6. Usuário escolhe → Reenvia com `opcao_pagamento`
7. Backend processa:
   - PIX Integral → Não debita saldo, gera PIX R$ 10,00
   - PIX Parcial → Debita saldo, gera PIX da diferença

**Alerta de Bloqueio:**
```javascript
{usuarioBloqueado && (
  <div style={{ backgroundColor: '#ff4444', ... }}>
    ⛔ {mensagemBloqueio}
  </div>
)}
```

---

## 📱 Responsividade

**OpcoesPagamentoModal:**
- Desktop: 600px largura
- Tablet (≤768px): 95vw, fontes reduzidas
- Mobile (≤640px): 95vw, layout ajustado
- Small (≤425px): Botões em coluna, texto reduzido
- Ultra-small (≤375px): 98vw, padding mínimo

**Dark Theme:** Gradiente #1a1a2e → #16213e, bordas rgba(255,255,255,0.1)

---

## 🧪 Como Testar

### **Teste 1: Saldo Suficiente**
```sql
-- Dar saldo ao usuário
UPDATE saldo_usuario SET saldo_atual = 50.00 WHERE usuario_id = 7;
```
1. Enviar palpites
2. ✅ Esperado: Mensagem "R$ 10.00 debitado do saldo"
3. ✅ Sem modal, sem PIX

### **Teste 2: Sem Saldo**
```sql
UPDATE saldo_usuario SET saldo_atual = 0.00 WHERE usuario_id = 7;
```
1. Enviar palpites
2. ✅ Esperado: Modal aparece
3. Escolher "PIX Integral"
4. ✅ Esperado: QR Code de R$ 10,00

### **Teste 3: Saldo Parcial**
```sql
UPDATE saldo_usuario SET saldo_atual = 6.00 WHERE usuario_id = 7;
```
1. Enviar palpites
2. ✅ Esperado: Modal com diferença R$ 4,00
3. Escolher "Usar Saldo + PIX"
4. ✅ Esperado: Saldo debitado R$ 6,00 + QR Code R$ 4,00

### **Teste 4: Bloqueio**
```sql
-- Criar PIX pendente
INSERT INTO pix_cobrancas (id_usuario, codigo_envio, status_pagamento, status, valor_original) 
VALUES (7, 'teste123', 'PENDENTE', 'ATIVA', 10.00);
```
1. Carregar tela Meus Palpites
2. ✅ Esperado: Alerta vermelho no topo
3. Tentar enviar palpites
4. ✅ Esperado: Bloqueado, mensagem de erro

### **Teste 5: Desbloqueio**
```sql
UPDATE pix_cobrancas SET status_pagamento = 'CONCLUIDO' WHERE id_usuario = 7;
```
1. Recarregar página
2. ✅ Esperado: Alerta desaparece, pode enviar palpites

---

**Sistema 100% implementado e pronto para testes!** 🎉
