📋 RESUMO EXECUTIVO: NOTIFICAÇÕES 24h NO BOLÃO VIP
===================================================

## 🎯 RESPOSTA DIRETA

As notificações de 24h são agendadas AUTOMATICAMENTE em **3 momentos**:

### 1️⃣ NA INICIALIZAÇÃO DO BACKEND
   📁 Arquivo: `backend/server.js` (linhas 240-250)
   ⏱️ Quando: 3 segundos após o servidor iniciar
   🔄 Função: `notificacoesService.agendarNotificacoesJogos()`
   
   Executa:
   └─> busca todos os jogos futuros
   └─> agenda 4 notificações por jogo (60, 30, 15, 5 min)
   └─> chama `agendarNotificacao24hAntes()`
   
   └─> AQUI NASCEM as notificações de 24h!

### 2️⃣ PERIODICAMENTE (CRON JOB)
   📁 Arquivo: `backend/jobs/agendaResultadosJob.js`
   ⏱️ Quando: A cada 2 minutos (conforme scheduler)
   🔄 Função: Revalida e adiciona novos jogos criados

### 3️⃣ VIA API (MANUAL)
   📁 Endpoint: POST `/api/notificacoes/agendar-rodada`
   🔄 Controller: `notificacoesAgendadasController.js`
   📝 Uso: Para criar notificações sob demanda

---

## 🔍 DADOS REAIS DO BANCO (02/02/2026)

```
Notificações de 24h: ✅ 53 agendadas
Status: ✅ FUNCIONANDO

Distribuição de jogos:
┌──────────┬────────────┐
│ Status   │ Quantidade │
├──────────┼────────────┤
│ Finaliz. │    348     │
│ Agendad. │    188     │
│ NULL     │    368     │
└──────────┴────────────┘

Próximos: Rodada 24 (02/02) e Rodada 2 (04/02)
```

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA

### Função Principal: `agendarNotificacao24hAntes()`
📍 Localização: `backend/services/notificacoesAgendadasService.js` (linhas 201-279)

```
LÓGICA:
1. SELECT primeiro_jogo de cada rodada futura
   ↓
2. Calcula: primeiro_jogo_data - 24 HORAS
   ↓
3. INSERT em notificacoes_enviadas_jogos com tempo_alerta = 1440
   ↓
4. Status: 'agendada' (aguardando cron disparar)
```

### Estrutura do Agendamento

Tabela: `notificacoes_enviadas_jogos`

| Campo | Valor | Descrição |
|-------|-------|-----------|
| jogo_id | 43725 | ID do primeiro jogo da rodada |
| partida_id | 123456 | ID da partida na API externa |
| rodada | 2 | Número da rodada |
| tempo_alerta | **1440** | 24 horas em minutos |
| data_agendada | 2026-02-03 22:00 | Quando sair (24h antes) |
| status | agendada | Pronto para disparar |
| titulo | ⏰ Rodada 2 começando! | Texto exibido no app |
| mensagem | Faltam 24h para... | Descrição da notif |

---

## 📊 FLUXO VISUAL

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   Backend inicializa             ┃
┃   server.js executa             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓ +3 segundos
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  agendarNotificacoesJogos()      ┃
┃  busca jogos futuros             ┃
┃  agenda 4 tempos por jogo        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ agendarNotificacao24hAntes() ⭐  ┃
┃ separa por rodada                ┃
┃ calcula primeiro_jogo - 24h      ┃
┃ insere em BD                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  notificacoes_enviadas_jogos     ┃
┃  status: 'agendada'              ┃
┃  tempo_alerta: 1440              ┃
┃  data_agendada: 2026-02-03 22:00 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
            ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Cron job monitora (a cada 2min) ┃
┃  Se data_agendada <= NOW()       ┃
┃  → Dispara notificação push      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 📲 EXEMPLO REAL - RODADA 2

```
Primeiro jogo da rodada: Flamengo vs Internacional
Data: 04/02/2026 22:00 (UTC)

CÁLCULO:
04/02/2026 22:00 - 24 horas = 03/02/2026 22:00

RESULTADO:
✅ Notificação agendada para: 03/02/2026 22:00
   Título: "⏰ Rodada 2 começando!"
   Mensagem: "Faltam 24h para o início dos jogos..."
   CTA: "Confira e envie seus palpites!"
```

---

## 🔧 COMMANDS ÚTEIS

Ver todas as notificações 24h agendadas:
```sql
SELECT * FROM notificacoes_enviadas_jogos 
WHERE tempo_alerta = 1440 
ORDER BY data_agendada DESC;
```

Ver apenas as próximas:
```sql
SELECT * FROM notificacoes_enviadas_jogos 
WHERE tempo_alerta = 1440 
  AND status = 'agendada'
  AND data_agendada > NOW()
ORDER BY data_agendada ASC;
```

Executar agendamento manual:
```bash
node backend/scripts/agendarNotificacoesManual.js
```

Ver logs em tempo real:
```bash
node backend/server.js | grep "Notificação 24h"
```

---

## ⚡ KEY INSIGHTS

✅ O sistema JÁ ESTÁ PRONTO
✅ 53 notificações de 24h já agendadas
✅ Executa automaticamente na inicialização
✅ Recalcula a cada 2 minutos via cron job
✅ Uma notificação por rodada (no primeiro jogo)
⚠️ Passadas notificações podem estar com status 'enviada' ou 'expirada'

---

## 🎯 FLUXO DO USUÁRIO

```
1. Backend inicia → agendador ativa
2. Notificações de 24h criadas para próximas rodadas
3. Cron job espera hora de disparo
4. Em data_agendada: FCM envia push notification
5. Usuário clica → abre aba de palpites
6. Notificação marcada como 'enviada' no BD
```

---

Análise gerada: 02/02/2026 14:00
Versão: 1.0 - Confirmado com dados de produção ✅
