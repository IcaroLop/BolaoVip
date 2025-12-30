# Implementação: Tratamento de Saldo Negativo para Palpites

## Resumo da Funcionalidade

Quando um usuário com saldo negativo tenta enviar palpites:
1. **PIX Integral Apenas**: Não oferece opção PIX Parcial quando saldo < 0
2. **Valor PIX Aumentado**: PIX = ABS(saldo_negativo) + R$ 10.00 (palpite)
3. **Discriminação Visual**: Modal mostra separadamente:
   - Débito a regularizar (R$ X)
   - Valor do palpite (R$ 10.00)
   - Total PIX necessário (R$ X + R$ 10.00)
4. **Processamento Conjunto**: Ao pagar PIX, regulariza débito E confirma palpite

---

## Mudanças Backend

### Arquivo: `backend/controllers/palpiteController.js`

#### 1. Detecção de Saldo Negativo (Linhas ~125-138)

```javascript
const saldoDisponivel = saldoUsuario.saldo_disponivel || 0;
const temSaldoNegativo = saldoDisponivel < 0;
const valorParaZerarDebito = temSaldoNegativo ? Math.abs(saldoDisponivel) : 0;

console.log(`[enviarPalpites] Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, Valor palpite: R$ ${VALOR_PALPITE.toFixed(2)}, Saldo negativo: ${temSaldoNegativo}`);
```

**O que faz:**
- Calcula se saldo está negativo
- Extrai valor do débito (valor absoluto do saldo negativo)
- Log para debugging

#### 2. Resposta Quando Saldo Insuficiente (Linhas ~140-160)

```javascript
if (saldoDisponivel < VALOR_PALPITE) {
  const diferenca = VALOR_PALPITE - saldoDisponivel;
  const totalPixNegativo = temSaldoNegativo ? valorParaZerarDebito + VALOR_PALPITE : diferenca;
  
  return res.status(200).json({
    saldo_insuficiente: true,
    saldo_atual: saldoDisponivel,
    valor_palpite: VALOR_PALPITE,
    diferenca: diferenca,
    saldo_negativo: temSaldoNegativo,
    valor_para_zerar_debito: valorParaZerarDebito,
    total_pix_necessario: totalPixNegativo,
    mensagem: temSaldoNegativo 
      ? `Saldo negativo de R$ ${Math.abs(saldoDisponivel).toFixed(2)}. Escolha PIX Integral para regularizar.`
      : 'Saldo insuficiente. Escolha uma opção de pagamento.'
  });
}
```

**Novos campos na resposta:**
- `saldo_negativo`: boolean indicando saldo < 0
- `valor_para_zerar_debito`: quanto falta para chegar a R$ 0
- `total_pix_necessario`: valor total do PIX (débito + palpite)

#### 3. Lógica de Pagamento PIX (Linhas ~176-210)

```javascript
} else if (opcao_pagamento === 'pix_integral') {
  // PIX integral - pode incluir cobertura de débito
  precisaGerarPix = true;
  valorPix = VALOR_PALPITE + valorParaZerarDebito; // Total: palpite + cobertura de débito
  valorDebito = valorParaZerarDebito;
  pagamentoInfo = temSaldoNegativo
    ? `Palpites registrados. Pague R$ ${valorPix.toFixed(2)} via PIX (R$ ${VALOR_PALPITE.toFixed(2)} palpite + R$ ${valorDebito.toFixed(2)} regularização).`
    : `Palpites registrados. Pague R$ ${valorPix.toFixed(2)} via PIX para confirmar.`;
    
} else if (opcao_pagamento === 'pix_parcial') {
  // PIX parcial - NÃO PERMITIR se saldo negativo
  if (temSaldoNegativo) {
    await conexao.rollback();
    return res.status(400).json({ 
      erro: 'PIX Parcial não está disponível com saldo negativo. Use PIX Integral para regularizar.' 
    });
  }
  // ... resto do pix_parcial
}
```

**Principais mudanças:**
- PIX Integral agora inclui `valorParaZerarDebito`
- PIX Parcial é bloqueado quando saldo negativo
- Mensagens diferenciadas para saldo negativo

#### 4. Response com Novos Campos (Linhas ~222-230)

```javascript
res.json({
  mensagem: pagamentoInfo,
  codigo_envio,
  precisa_gerar_pix: precisaGerarPix,
  valor_pix: valorPix,
  valor_palpite: VALOR_PALPITE,
  valor_debito: valorDebito,
  valor_debito_saldo: valorDebitoSaldo,
  saldo_negativo: temSaldoNegativo,
  pagamento_completo: !precisaGerarPix
});
```

---

## Mudanças Frontend

### Arquivo: `frontend/bolao-vip/src/components/OpcoesPagamentoModal.js`

#### 1. Novos Props

```javascript
const OpcoesPagamentoModal = ({ 
  isOpen, 
  onClose, 
  saldoAtual, 
  valorPalpite, 
  diferenca,
  saldoNegativo,              // ← NOVO
  valorDebitoNegativo,        // ← NOVO
  totalPixNecessario,         // ← NOVO
  onEscolherOpcao 
})
```

#### 2. Renderização Condicional

**Seção de Info Box:**
- Mostra "Saldo Negativo" no título quando `saldoNegativo === true`
- Exibe débito de regularização como item separado
- Mostra total PIX com discriminação: "(R$ X palpite + R$ Y regularização)"

**Seção de Botões:**
- PIX Integral muda a descrição quando negativo: "Regulariza débito + confirma palpite"
- PIX Parcial é oculto quando `temSaldoNegativo === true`

**Aviso:**
- Diferente para saldo negativo vs. saldo insuficiente
- Cor vermelha/alarme para situação de débito

#### 3. Novas Classes CSS

```css
.info-valor.negativo          /* Saldo negativo em vermelho */
.info-valor.debito            /* Débito em vermelho */
.info-valor.total-pix         /* Total PIX em laranja */
.info-item.negativo-info      /* Container com borda vermelha */
.info-detalhe                 /* Discriminação de valores */
.opcoes-aviso.negativo-aviso  /* Aviso com fundo alarme */
```

### Arquivo: `frontend/bolao-vip/src/pages/PalpitePage.js`

#### 1. Novas Propriedades em `dadosSaldoInsuficiente`

```javascript
setDadosSaldoInsuficiente({
  saldo_atual: res.data.saldo_atual,
  valor_palpite: res.data.valor_palpite,
  diferenca: res.data.diferenca,
  saldo_negativo: res.data.saldo_negativo || false,              // ← NOVO
  valor_para_zerar_debito: res.data.valor_para_zerar_debito || 0, // ← NOVO
  total_pix_necessario: res.data.total_pix_necessario || res.data.valor_palpite // ← NOVO
});
```

#### 2. Props Passados ao Modal

```javascript
<OpcoesPagamentoModal
  isOpen={mostrarOpcoesModal}
  onClose={() => { ... }}
  saldoAtual={dadosSaldoInsuficiente.saldo_atual}
  valorPalpite={dadosSaldoInsuficiente.valor_palpite}
  diferenca={dadosSaldoInsuficiente.diferenca}
  saldoNegativo={dadosSaldoInsuficiente.saldo_negativo}              // ← NOVO
  valorDebitoNegativo={dadosSaldoInsuficiente.valor_para_zerar_debito} // ← NOVO
  totalPixNecessario={dadosSaldoInsuficiente.total_pix_necessario}  // ← NOVO
  onEscolherOpcao={handleEscolherOpcaoPagamento}
/>
```

---

## Fluxo de Dados - Exemplo Prático

### Cenário: Saldo Negativo de R$ 5.00

1. **Usuario tenta enviar palpite:**
   - Saldo: -R$ 5.00
   - Valor palpite: R$ 10.00
   - Status: Saldo insuficiente

2. **Backend calcula:**
   - `temSaldoNegativo = true`
   - `valorParaZerarDebito = 5.00`
   - `totalPixNegativo = 5.00 + 10.00 = 15.00`

3. **Backend retorna:**
   ```json
   {
     "saldo_insuficiente": true,
     "saldo_atual": -5.00,
     "valor_palpite": 10.00,
     "diferenca": 15.00,
     "saldo_negativo": true,
     "valor_para_zerar_debito": 5.00,
     "total_pix_necessario": 15.00,
     "mensagem": "Saldo negativo de R$ 5.00. Escolha PIX Integral para regularizar."
   }
   ```

4. **Frontend exibe modal com:**
   - Seu saldo: **R$ -5.00** (em vermelho)
   - Débito para regularizar: **R$ 5.00** (em vermelho)
   - Valor do palpite: **R$ 10.00** (em azul)
   - Total PIX necessário: **R$ 15.00** (em laranja)
     - *(R$ 10.00 palpite + R$ 5.00 regularização)*
   - **Apenas um botão:** PIX Integral
   - (PIX Parcial está oculto)

5. **Usuario escolhe PIX Integral:**
   - Frontend envia: `opcao_pagamento: 'pix_integral'`
   - Backend gera PIX de R$ 15.00
   - PIX modal exibe: QR Code + cópia e cola

6. **Ao pagar PIX de R$ 15.00:**
   - Sistema registra palpites
   - Sistema regulariza débito (saldo passa de -5.00 para 0.00)
   - Status muda para "Pagamento confirmado"

---

## Validações e Restrições

1. **PIX Parcial Bloqueado:**
   ```javascript
   if (temSaldoNegativo && opcao_pagamento === 'pix_parcial') {
     return res.status(400).json({ 
       erro: 'PIX Parcial não está disponível com saldo negativo...'
     });
   }
   ```

2. **Valor PIX Correto:**
   - Saldo negativo: PIX = ABS(saldo) + R$ 10.00
   - Saldo insuficiente positivo: PIX = (R$ 10.00 - saldo)
   - Saldo suficiente: Sem PIX (usa saldo)

3. **Mensagens Diferenciadas:**
   - Negativo: "Saldo negativo... regularize"
   - Insuficiente: "Escolha uma opção de pagamento"

---

## Checklist de Testes

- [ ] Usuário com saldo -R$ 5.00 tenta enviar palpite
- [ ] Modal mostra "Saldo Negativo" no título
- [ ] Modal exibe débito, palpite e total PIX separadamente
- [ ] PIX Parcial não aparece (oculto)
- [ ] PIX Integral mostra mensagem de regularização
- [ ] Ao escolher PIX Integral, valor é R$ 15.00
- [ ] Após pagar PIX, saldo volta para 0.00
- [ ] Palpites são registrados corretamente
- [ ] Usuario com saldo positivo insuficiente ainda tem PIX Parcial
- [ ] Mensagens de aviso diferem entre negativo e insuficiente

---

## Arquivos Modificados

1. ✅ `backend/controllers/palpiteController.js` - Detecção e cálculo negativo
2. ✅ `frontend/bolao-vip/src/components/OpcoesPagamentoModal.js` - UI negativo
3. ✅ `frontend/bolao-vip/src/components/OpcoesPagamentoModal.css` - Estilos
4. ✅ `frontend/bolao-vip/src/pages/PalpitePage.js` - Props e passagem de dados

---

## Próximas Etapas (Opcional)

1. Adicionar notificação explicando regularização de débito
2. Log no sistema quando saldo negativo é regularizado
3. Relatório para Admin sobre usuários com saldo negativo
4. Limpar timeout para PIX quando saldo negativo (débito crítico)

