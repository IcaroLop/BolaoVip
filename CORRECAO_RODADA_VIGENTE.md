# 🔧 Análise: Rodada Vigente Pulando para 22 (Rodada 21 em Andamento)

## ❌ Problema Identificado

Quando um jogo da rodada 21 está sendo disputado, o sistema indicava rodada 22 como vigente, ao invés de rodada 21.

### Causa Raiz

No arquivo `backend/services/scheduler.js`, a função `buscarRodadaVigente()` buscava apenas por:

```javascript
const rodadaVigente = response.data.find(r => r.status === 'agendada');
```

**Lógica incorreta:**
1. API retorna rodadas com status: `'agendada'`, `'em_andamento'`, `'encerrada'`
2. Quando rodada 21 está em andamento: seu status muda para `'em_andamento'`
3. Busca por `'agendada'` falha em rodada 21
4. Encontra rodada 22 com status `'agendada'`
5. Sistema marca rodada 22 como vigente ❌

## ✅ Solução Implementada

Modificada `buscarRodadaVigente()` com priorização correta:

```javascript
async function buscarRodadaVigente() {
  // Prioridade: rodada em andamento > rodada agendada > outra não encerrada
  let rodadaVigente = response.data.find(r => r.status === 'em_andamento');
  
  if (!rodadaVigente) {
    rodadaVigente = response.data.find(r => r.status === 'agendada');
  }
  
  if (!rodadaVigente) {
    rodadaVigente = response.data.find(r => r.status !== 'encerrada');
  }
  
  return rodadaVigente.rodada;
}
```

### Comportamento Esperado Agora

| Cenário | Antes ❌ | Depois ✅ |
|---------|---------|----------|
| Rodada 21 agendada, 22 próxima | 21 | 21 |
| Rodada 21 em andamento | 22 | 21 |
| Rodada 21 encerrada, 22 agendada | 22 | 22 |

## 🔍 Impacto

- **Agendamentos de placar:** Agora continuarão sendo criados para rodada 21 enquanto jogos estão em andamento ✅
- **Notificações:** Continuarão sendo enviadas para a rodada correta ✅
- **Classificação:** Será atualizada enquanto a rodada está em andamento ✅

## 📝 Histórico do Bug

1. Implementação inicial buscava apenas `status === 'agendada'`
2. Funcionava bem enquanto rodadas eram simplesmente "agendadas" ou "encerradas"
3. API começou a usar status intermediário `'em_andamento'`
4. Sistema não foi atualizado para essa mudança

## 🧪 Como Validar

Execute no servidor:

```bash
# Verificar status de rodadas
curl -H "Authorization: Bearer seu_token" \
  https://api.api-futebol.com.br/v1/campeonatos/10/rodadas | jq '.[] | {rodada: .rodada, status: .status}'

# Verificar rodada vigente no DB
mysql bolaovip -e "SELECT rodada_vigente, data_atualizacao_rodada FROM configuracoes LIMIT 1;"
```

---

**Status:** ✅ Corrigido e testado
