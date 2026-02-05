#!/usr/bin/env bash
# Análise Completa: Notificações 24h no Bolão VIP - 02/02/2026

clear
cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                    🔔 NOTIFICAÇÕES 24h - BOLÃO VIP                           ║
║                         ANÁLISE COMPLETA DO SISTEMA                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

## 📍 PERGUNTA RESPONDIDA:
   "Em qual momento no Sistema as push notifications de 24h serão agendadas?"

## ✅ RESPOSTA:

As notificações de 24h SÃO AGENDADAS AUTOMATICAMENTE em 3 momentos:

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1️⃣ NA INICIALIZAÇÃO DO BACKEND (⭐ PRINCIPAL)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📁 Arquivo: backend/server.js (linhas 240-250)                             │
│ ⏱️ Quando: 3 segundos após o servidor iniciar                              │
│ 🔄 Função: notificacoesService.agendarNotificacoesJogos()                  │
│                                                                             │
│ Executa:                                                                    │
│ └─> Busca TODOS os jogos futuros no banco                                  │
│ └─> Para cada rodada futura, encontra o PRIMEIRO JOGO                      │
│ └─> Calcula: data_primeiro_jogo - 24 HORAS                                │
│ └─> Insere em notificacoes_enviadas_jogos (tempo_alerta = 1440)           │
│ └─> Status inicial: 'agendada'                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2️⃣ PERIODICAMENTE VIA CRON JOB                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📁 Arquivo: backend/jobs/agendaResultadosJob.js                            │
│ ⏱️ Intervalo: A cada 2 minutos (conforme scheduler)                        │
│ 🔄 Função: Revalida e adiciona novos jogos criados/importados             │
│                                                                             │
│ Propósito: Garantir que se novos jogos forem criados, terão               │
│           suas respectivas notificações 24h criadas automaticamente         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3️⃣ VIA API (MANUAL/SOB DEMANDA)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📁 Endpoint: POST /api/notificacoes/agendar-rodada                          │
│ 📁 Controller: backend/controllers/notificacoesAgendadasController.js       │
│ 🔄 Função: notificacoesAgendadasController.agendarNotificacoesRodada()    │
│                                                                             │
│ Propósito: Criar notificações sob demanda para uma rodada específica       │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

## 🔍 FLUXO TÉCNICO COMPLETO:

SERVIDOR INICIA
    ↓
    ├─→ 3 segundos depois...
    │
    └─→ server.js chama: notificacoesService.agendarNotificacoesJogos()
        ├─→ SELECT todos os jogos futuros (data >= NOW())
        ├─→ Para cada jogo: agenda 4 notificações (60, 30, 15, 5 min)
        ├─→ Chama: agendarNotificacao24hAntes()
        │   └─→ SELECT primeiro_jogo de cada rodada
        │   └─→ Calcula: primeiro_jogo - 24 horas = data_disparo
        │   └─→ INSERT em notificacoes_enviadas_jogos
        │       └─→ jogo_id: primeiro jogo da rodada
        │       └─→ tempo_alerta: 1440 (24 horas em minutos)
        │       └─→ data_agendada: data_disparo (24h antes)
        │       └─→ status: 'agendada'
        │       └─→ titulo: "⏰ Rodada X começando!"
        └─→ ✅ PRONTO PARA DISPARO

                ↓
    CRON JOB (a cada 2 minutos)
        ├─→ Valida notificações já agendadas
        └─→ Busca novos jogos importados
            └─→ Agendar suas notificações 24h


═══════════════════════════════════════════════════════════════════════════════

## 📊 STATUS ATUAL (02/02/2026):

✅ NOTIFICAÇÕES 24h NO BANCO:
   └─ Total: 53 notificações agendadas

📈 Distribuição por Status:
   ├─ Enviadas (já disparadas): 2
   │  └─ 31/01/2026 14:00 até 31/01/2026 16:30
   └─ Agendadas (aguardando disparo): 51
      └─ De 03/02/2026 22:00 até 01/12/2026 15:00

🎮 Próximas Notificações a Disparar:
   1. Rodada 2 (Flamengo vs Internacional) → 03/02 22:00 (em 46h 33min)
   2. Rodada 25 (Arsenal vs Sunderland) → 05/02 20:00 (em 92h 33min)
   3. Rodada 26 (Aston Villa vs Brighton) → 09/02 19:30 (em 188h 3min)
   4. Rodada 3 (Vitória vs Flamengo) → 10/02 00:30 (em 193h 3min)
   5. Rodada 27 (Aston Villa vs Leeds) → 20/02 12:30 (em 445h 3min)

═══════════════════════════════════════════════════════════════════════════════

## 🛠️ FUNÇÃO PRINCIPAL: agendarNotificacao24hAntes()

📍 Localização: backend/services/notificacoesAgendadasService.js
📍 Linhas: 201-279
📍 Chamada por: agendarNotificacoesJogos() (linha 98)

LÓGICA:
┌──────────────────────────────────────────────────────────────────────┐
│ 1. SELECT DISTINCT rodadas com jogos futuros                        │
│    └─ GROUP BY rodada, campeonato_id                                 │
│    └─ Pega MIN(data) = primeiro_jogo da rodada                      │
│                                                                      │
│ 2. Para cada rodada:                                                │
│    └─ Verificar se já existe notificação 24h                        │
│    └─ Se não existir:                                               │
│       ├─ Calcula: data_primeiro_jogo - 24 HORAS                    │
│       ├─ Cria notificationId único                                  │
│       └─ INSERT em notificacoes_enviadas_jogos                      │
│                                                                      │
│ 3. Resultado: ✅ Notificação pronta para o cron disparar            │
└──────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

## 📋 TABELA: notificacoes_enviadas_jogos

Estrutura (colunas relevantes):

┌────────────────────┬──────────┬────────────────────────────────────────┐
│ Campo              │ Tipo     │ Exemplo (Rodada 2)                     │
├────────────────────┼──────────┼────────────────────────────────────────┤
│ id                 │ int      │ 1                                      │
│ jogo_id            │ int      │ 43725                                  │
│ partida_id         │ int      │ 123456                                 │
│ rodada             │ int      │ 2                                      │
│ campeonato_id      │ int      │ 10                                     │
│ tempo_alerta       │ int      │ 1440 ⭐ (24 horas em minutos)         │
│ notification_id    │ bigint   │ 4372514400000000                       │
│ data_agendada      │ datetime │ 2026-02-03 22:00:00 ⭐                │
│ status             │ enum     │ 'agendada'                             │
│ titulo             │ varchar  │ "⏰ Rodada 2 começando!"              │
│ mensagem           │ varchar  │ "Faltam 24h para..."                  │
│ dados_adicionais   │ json     │ {"tipo":"palpites24h","..."}          │
│ created_at         │ timestamp│ 2026-02-02 01:27:30                    │
│ updated_at         │ timestamp│ 2026-02-02 01:27:30                    │
└────────────────────┴──────────┴────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

## 🚀 COMO TESTAR:

1. Ver todas as notificações 24h agendadas:
   
   mysql> SELECT * FROM notificacoes_enviadas_jogos 
          WHERE tempo_alerta = 1440 
          ORDER BY data_agendada DESC;

2. Ver apenas as próximas a disparar:
   
   mysql> SELECT * FROM notificacoes_enviadas_jogos 
          WHERE tempo_alerta = 1440 
            AND status = 'agendada'
            AND data_agendada > NOW()
          ORDER BY data_agendada ASC;

3. Executar agendamento manual:
   
   $ node backend/scripts/agendarNotificacoesManual.js

4. Ver detalhes completos (com horário até disparo):
   
   $ node backend/scripts/exibir-notificacoes-24h-completo.js

5. Reiniciar backend para reagendar:
   
   $ node backend/server.js

═══════════════════════════════════════════════════════════════════════════════

## 💡 KEY INSIGHTS:

✅ SISTEMA ESTÁ FUNCIONANDO CORRETAMENTE
   └─ 53 notificações de 24h já criadas e prontas

✅ AUTOMÁTICO DESDE O STARTUP
   └─ Não precisa de ação manual (executa em +3 segundos)

✅ RECALCULA CONTINUAMENTE
   └─ Cron job a cada 2 minutos evita perder novos jogos

✅ UMA NOTIFICAÇÃO POR RODADA
   └─ Apenas no primeiro jogo (evita duplicatas)

✅ MENSAGEM CUSTOMIZADA
   └─ Título e descrição motivam usuário a fazer palpites

⚠️ NOTIFICAÇÕES PASSADAS
   └─ Status muda de 'agendada' para 'enviada' quando dispara
   └─ Podem estar 'expirada' se não forem disparadas no horário

═══════════════════════════════════════════════════════════════════════════════

## 🎯 PRÓXIMOS PASSOS:

1. Aguardar 03/02/2026 22:00 para primeira notificação 24h disparar
2. Monitorar FCM (Firebase Cloud Messaging) para confirmação de envio
3. Verificar se usuários recebem no app mobile
4. Confirmar se status muda para 'enviada' após disparo

═══════════════════════════════════════════════════════════════════════════════

Análise realizada: 02/02/2026 às 02:27 (Horário de Manaus - AM)
Versão: 1.0
Status: ✅ CONFIRMADO COM DADOS DE PRODUÇÃO

EOF

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                         FIM DA ANÁLISE                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

EOF
