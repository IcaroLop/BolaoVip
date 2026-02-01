📢 QUANDO AS NOTIFICAÇÕES 24h SÃO AGENDADAS NO SISTEMA
========================================================

## 1. TRIGGER PRINCIPAL
→ Função: `agendarNotificacao24hAntes()` 
→ Localização: `backend/services/notificacoesAgendadasService.js` (linhas 200+)

### A) NA INICIALIZAÇÃO DO BACKEND
   - Arquivo: `backend/server.js` (linhas 240-250)
   - Delay: 3 segundos após startup
   - Função: `notificacoesService.agendarNotificacoesJogos()`
   - Status: ✅ AUTOMÁTICO ao iniciar servidor

### B) PERIODICAMENTE (VIA CRON JOB)
   - Arquivo: `backend/jobs/agendaResultadosJob.js`
   - Intervalo: Configurado no scheduler
   - Função: Verificar periodicamente jogos futuros

## 3. LÓGICA DE AGENDAMENTO 24h

```javascript
async agendarNotificacao24hAntes() {
  // 1. Busca todas as rodadas com jogos futuros
  // 2. Agrupa por rodada e encontra o PRIMEIRO JOGO
  // 3. Calcula: primeiro_jogo_data - 24 horas
  // 4. Insere em notificacoes_enviadas_jogos com tempo_alerta = 1440 (24h em minutos)
  // 5. Status inicial: 'agendada'
}
```

## 4. TABELAS ENVOLVIDAS

Tabela: `notificacoes_enviadas_jogos`
Colunas principais:
  - jogo_id: ID do primeiro jogo da rodada
  - rodada: Número da rodada
  - tempo_alerta: 1440 (minutos = 24 horas)
  - data_agendada: Quando a notificação deve sair (24h antes)
  - status: 'agendada' → 'enviada'
  - titulo: "⏰ Rodada X começando!"
  - mensagem: "Faltam 24h para o início dos jogos..."

## 5. FLUXO COMPLETO

┌─────────────────────────────────────────────┐
│  Backend inicia (server.js)                 │
│  +3 segundos                                │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ agendarNotificacoesJogos()                  │
│ - Busca todos os jogos futuros              │
│ - Agenda 60, 30, 15, 5 min antes            │
│ - Chama: agendarNotificacao24hAntes()       │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ agendarNotificacao24hAntes()                │
│ - SELECT primeiro jogo de cada rodada       │
│ - Calcula: primeiro_jogo - 24 horas         │
│ - INSERT em notificacoes_enviadas_jogos     │
│   (tempo_alerta = 1440)                     │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ Notificação agendada no banco               │
│ Aguardando cron job disparar no horário     │
└─────────────────────────────────────────────┘

## 6. DURAÇÃO DE AGENDAMENTO

Nota importante: Novos jogos são agendados de 2 em 2 minutos 
(conforme logs indicam) através do scheduler/cron.

Então as notificações 24h são recalculadas continuamente quando:
- ✅ Backend inicia
- ✅ Novo jogo é criado/importado
- ✅ Cron job executa agendamento periódico

## 7. PRÓXIMAS VERIFICAÇÕES

Para verificar se as notificações 24h REALMENTE estão sendo agendadas:

1. Reiniciar o backend:
   node backend/server.js

2. Monitorar logs procurando por:
   "✅ Notificação 24h agendada para Rodada X"

3. Consultar banco:
   SELECT * FROM notificacoes_enviadas_jogos 
   WHERE tempo_alerta = 1440 
   ORDER BY data_agendada DESC;

## 8. STATUS ATUAL

❌ Motivo de estar vazia agora:
- Não há jogos "agendados" para futuro próximo
- OU o Backend não foi iniciado depois do último agendamento
- OU as rodadas têm status diferente de 'agendado'

Solução: Verificar status dos jogos no banco:
   SELECT DISTINCT status FROM jogos;
   SELECT * FROM jogos WHERE data > NOW() LIMIT 5;
