# Sistema de Notificações Push - Documentação Completa

## 🎯 Objetivo
Enviar notificações push aos usuários em **4 momentos específicos** antes do início de uma partida:
- **60 minutos** antes
- **30 minutos** antes  
- **15 minutos** antes
- **5 minutos** antes

## 📋 Arquitetura

### Tabelas Envolvidas

#### 1. `notificacoes_enviadas` (rodadas)
- Tabela original para notificações de rodadas
- Campos: `id`, `rodada_id`, `campeonato_id`, `tempo_alerta`, `notification_id`, `data_agendada`, `status`, `data_envio`
- Status: `agendada`, `enviada`, `cancelada`, `expirada`

#### 2. `notificacoes_enviadas_jogos` (nova)
- Tabela para notificações de jogos individuais
- Campos: `id`, `jogo_id`, `partida_id`, `rodada`, `campeonato_id`, `tempo_alerta`, `notification_id`, `data_agendada`, `data_enviada`, `status`, `titulo`, `mensagem`
- Estrutura idêntica à de rodadas, adaptada para jogos

### Serviços

#### `backend/services/notificacoesAgendadasService.js`

**Métodos principais:**

1. **`agendarNotificacoesRodadas()`**
   - Busca rodadas que começam nos próximos 70 minutos
   - Chama `agendarNotificacoesParaRodada()` para cada uma

2. **`agendarNotificacoesJogos()`** ⭐ NOVO
   - Busca jogos que começam nos próximos 70 minutos
   - Chama `agendarNotificacoesParaJogo()` para cada um

3. **`agendarNotificacoesParaRodada(rodada)`**
   - Cria 4 registros na tabela (60, 30, 15, 5 minutos antes)
   - Calcula `data_agendada` = tempo_do_evento - minutos_alerta
   - Usa transação para garantir atomicidade

4. **`agendarNotificacoesParaJogo(jogo)`** ⭐ NOVO
   - Idêntico ao anterior, mas para a tabela `notificacoes_enviadas_jogos`
   - Extrai título: `${time_mandante} vs ${time_visitante}`
   - Mensagem: `Jogo começa em ${minutos} minutos`

5. **`dispararNotificacoesPendentes()`** (MODIFICADO)
   - Busca notificações de RODADAS vencidas (status='agendada' E data_agendada <= NOW())
   - Busca notificações de JOGOS vencidas (mesma lógica)
   - Marca ambas como 'enviada' e registra `data_envio` / `data_enviada`
   - Executa até 20 notificações por execução

6. **`registrarNotificacaoEnviada(id)`**
   - Atualiza status para 'enviada' na tabela `notificacoes_enviadas`

7. **`registrarNotificacaoJogoEnviada(id)`** ⭐ NOVO
   - Atualiza status para 'enviada' na tabela `notificacoes_enviadas_jogos`

### Cron Jobs

#### `backend/jobs/cronJobs.js`

**`iniciarJobAgendarNotificacoes()`** (MODIFICADO)
- **Frequência**: A cada 2 minutos
- **O que faz**:
  1. Chama `agendarNotificacoesRodadas()`
  2. Chama `agendarNotificacoesJogos()` ⭐ NOVO
- **Resultado**: Encontra jogos dentro da janela de 70 minutos e cria registros de notificação

**`iniciarJobDispararNotificacoes()`**
- **Frequência**: A cada 1 minuto
- **O que faz**: Chama `dispararNotificacoesPendentes()` (que agora processa ambas as tabelas)
- **Resultado**: Envia notificações que estão vencidas

## 🔄 Fluxo Completo

### Passo 1: Detecção (A cada 2 minutos)

```
Cron Job → agendarNotificacoesJogos()
  ↓
SELECT jogos.* WHERE status='agendado' AND data BETWEEN NOW() AND NOW()+70min
  ↓
Para cada jogo:
  → Verifica se já existem notificações agendadas
  → Insere 4 registros em notificacoes_enviadas_jogos:
    - 60 min antes
    - 30 min antes
    - 15 min antes
    - 5 min antes
```

### Passo 2: Disparo (A cada 1 minuto)

```
Cron Job → dispararNotificacoesPendentes()
  ↓
SELECT * FROM notificacoes_enviadas_jogos 
WHERE status='agendada' AND data_agendada <= NOW()
  ↓
Para cada notificação vencida:
  → Registra envio (status = 'enviada')
  → Log no console/PM2
  ↓
Sistema frontend / push notifications recebe via:
  - Local Storage listener
  - Push API
  - Browser notifications
```

## 📊 Exemplo de Timeline

**Jogo agendado para 09:46 (Manaus)**

| Horário (Manaus) | Ação | Status |
|---|---|---|
| 08:46 | Notificação "60 min antes" disparada | ✅ |
| 09:16 | Notificação "30 min antes" disparada | ✅ |
| 09:31 | Notificação "15 min antes" disparada | ✅ |
| 09:41 | Notificação "5 min antes" disparada | ✅ |
| 09:46 | Jogo começa | 🏟️ |

## 🛠️ Scripts de Teste

### 1. Criar Jogo de Teste
```bash
node backend/scripts/inserirJogoTeste.js
```
- Insere jogo 40 minutos no futuro
- Rodada vigente
- Campeonato 10 (Brasileirão)

### 2. Agendar Notificações (Manual)
```bash
node backend/scripts/agendarNotificacoesManual.js
```
- Executa o agendamento imediatamente (sem esperar cron)
- Lista as 4 notificações criadas
- Mostra tempos de disparo

### 3. Verificar Status
```bash
node backend/scripts/testarNotificacoesJogo.js
```
- Lista todas as notificações agendadas para o jogo de teste
- Mostra status, horário agendado, tempo restante

### 4. Limpar Jogo de Teste
```bash
node backend/helpers/limparJogoTeste.js
```
- Remove jogo e suas notificações
- Pronto para o próximo teste

## 🔧 Instalação e Ativação

### Pré-requisitos
✅ Tabela `notificacoes_enviadas_jogos` criada (script executado)
✅ Serviços modificados com novos métodos
✅ Cron jobs atualizados

### Verificação
```bash
# Testar a tabela
node backend/scripts/criarTabelaNotificacoesJogos.js
# Resposta esperada: "✅ Tabela notificacoes_enviadas_jogos criada com sucesso"
# ou "✅ Tabela notificacoes_enviadas_jogos já existe"
```

### Ativação em Produção
1. Certifique-se de que `DRY_RUN=false` no `.env`
2. Reinicie o servidor: `pm2 restart all`
3. Aguarde logs de agendamento: `pm2 logs | grep NotificacoesAgendadasService`
4. Sistema dispara automaticamente

## 📝 Logs Esperados

### Agendamento (a cada 2 minutos)
```
[NotificacoesAgendadasService] 📋 Encontrados 1 jogos próximos
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 123456: Time A vs Time B (60min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 123456: Time A vs Time B (30min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 123456: Time A vs Time B (15min antes)
[NotificacoesAgendadasService] ✅ Notificação agendada para jogo 123456: Time A vs Time B (5min antes)
```

### Disparo (a cada 1 minuto)
```
[NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
[NotificacoesAgendadasService] ✅ Notificação 123456123456789 processada: Time A vs Time B 60min antes
```

## ⚡ Características

- ✅ **4 notificações automáticas** por jogo
- ✅ **Sincronização com fuso horário** (America/Manaus)
- ✅ **Idempotente** (não cria duplicatas)
- ✅ **Transacional** (garante consistência)
- ✅ **Auditável** (rastreia status e timestamps)
- ✅ **Escalável** (suporta múltiplos jogos/rodadas simultâneos)

## 🧪 Teste de Integração Recomendado

```bash
# Terminal 1: Acompanhar logs
pm2 logs

# Terminal 2: Criar jogo de teste
node backend/scripts/inserirJogoTeste.js

# Terminal 2: Agendar notificações manualmente
node backend/scripts/agendarNotificacoesManual.js

# Observar no Terminal 1:
# 1. Logs de agendamento (a cada 2 min)
# 2. Logs de disparo (quando data_agendada <= NOW())
# 3. Status passando de 'agendada' para 'enviada'

# Terminal 2: Após o teste
node backend/helpers/limparJogoTeste.js
```

## 📞 Suporte

Para problemas:
1. Verifique timezone em `backend/.env` (TIMEZONE=America/Manaus)
2. Confirme que `pm2` está rodando: `pm2 list`
3. Verifique database: `SELECT * FROM notificacoes_enviadas_jogos`
4. Procure por erros: `pm2 logs | grep ERROR`
