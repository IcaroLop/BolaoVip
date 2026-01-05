# 🧪 Teste de Agendador e Notificações — Jogo Fictício

## 📋 Objetivo
Validar o sistema de agendamento de requisições e notificações push sem impactar a produção, usando um jogo fictício de teste.

---

## 🚀 Como Executar o Teste

### 1️⃣ Preparação no Servidor
```bash
# Entre no diretório do backend
cd /home/jelastic/ROOT/backend

# Adicione a flag DRY_RUN no .env
echo "DRY_RUN=true" >> .env

# Ou edite manualmente o .env e adicione:
# DRY_RUN=true
```

### 2️⃣ Inserir Jogo de Teste
```bash
# Execute o script de inserção (cria jogo daqui a 1h15min)
node scripts/inserirJogoTeste.js
```

**Saída esperada:**
```
📅 Criando jogo de TESTE:
   Hora servidor (Manaus): 2026-01-05T11:30:00.000-04:00
   Hora do jogo (Manaus): 2026-01-05T12:45:00.000-04:00
   Hora do jogo (UTC): 2026-01-05T16:45:00Z
✅ Jogo de teste inserido com sucesso!
   partida_id: 999999
   rodada: 21 (rodada vigente)
   campeonato_id: 10
```

### 3️⃣ Verificar Inserção
```bash
# Confirme que o jogo foi criado
node helpers/checkProximoJogo.js 999999

# Liste próximos jogos (deve aparecer o jogo de teste)
node helpers/listNextJogos.js
```

### 4️⃣ Reiniciar Servidor
```bash
# Reinicie para o agendador registrar o novo jogo
pm2 restart all
# OU
systemctl restart <seu-servico>
# OU
node server.js
```

### 5️⃣ Testar Agendamento
```bash
# Execute o teste do agendador (sem reiniciar servidor)
node helpers/runScheduleTest.js
```

**Saída esperada:**
```
🔍 Agendamento detalhes → Servidor agora: ... | tempoAteInicio_ms: ...
 Agendado grupo 1/1 no dia 2026-01-05 (local 05/01/2026 12:45) → 1000 requisições
```

### 6️⃣ Aguardar e Monitorar
```bash
# Acompanhe os logs em tempo real (crie o arquivo se não existir)
mkdir -p backend/logs
tail -f backend/logs/agendador.log

# OU monitore via PM2
pm2 logs
```

**No horário agendado, você verá:**
```
🚀 Iniciando consultas do grupo X/X no dia 2026-01-05 (Rodada 21)
📡 [1/1000] Disparando consulta — Servidor agora: ...
🧪 [DRY_RUN] Simulando consulta à rodada 21 (requisição NÃO enviada)
📡 [2/1000] Disparando consulta — Servidor agora: ...
🧪 [DRY_RUN] Simulando consulta à rodada 21 (requisição NÃO enviada)
...
```

### 7️⃣ Validar Notificações Push
- **Notificações SERÃO enviadas normalmente** (não são afetadas pelo DRY_RUN)
- Verifique no app se os usuários receberam a notificação de início do jogo
- Confirme o horário e conteúdo da notificação

---

## 🧹 Limpeza Após o Teste

### 1️⃣ Remover Jogo de Teste
```bash
node helpers/limparJogoTeste.js
```

### 2️⃣ Desativar Modo Teste
Edite o `.env` e **remova** ou **comente** a linha:
```bash
# DRY_RUN=true
```

Ou defina como `false`:
```bash
DRY_RUN=false
```

### 3️⃣ Reiniciar Servidor (Produção)
```bash
pm2 restart all
# OU
systemctl restart <seu-servico>
```

---

## ⚙️ Como Funciona o DRY_RUN

### 🔧 Modificações Implementadas

1. **Flag no .env:**
   - `DRY_RUN=true` → Modo teste (requisições simuladas)
   - `DRY_RUN=false` ou ausente → Modo produção (requisições reais)

2. **Scheduler (backend/services/scheduler.js):**
   ```javascript
   const DRY_RUN = process.env.DRY_RUN === 'true';
   
   if (DRY_RUN) {
     console.log(`🧪 [DRY_RUN] Simulando consulta à rodada ${rodada}`);
   } else {
     await consultarResultadosDaRodada(rodada);
   }
   ```

3. **Notificações Push:**
   - **NÃO são afetadas** pelo DRY_RUN
   - Continuam sendo enviadas normalmente para validação real

---

## 📊 Checklist de Validação

- [ ] Jogo de teste inserido com sucesso
- [ ] `DRY_RUN=true` configurado no `.env`
- [ ] Servidor reiniciado após inserção
- [ ] Agendador registrou o jogo de teste (`runScheduleTest.js`)
- [ ] Logs mostram agendamento para o horário correto
- [ ] No horário agendado, logs mostram `🧪 [DRY_RUN] Simulando consulta`
- [ ] Notificações push enviadas aos usuários
- [ ] Jogo de teste removido após validação
- [ ] `DRY_RUN` removido/desativado do `.env`
- [ ] Servidor reiniciado em modo produção

---

## 🔍 Troubleshooting

### Jogo não aparece no agendador
```bash
# Verifique se o jogo está no banco
node helpers/checkProximoJogo.js 999999

# Confirme que o servidor foi reiniciado após inserção
pm2 logs | grep "partida_id=999999"

# Verifique a rodada vigente
node -e "require('./database/conexao').query('SELECT rodada_vigente FROM configuracoes').then(r => console.log(r[0]))"
```

### Notificações não foram enviadas
- Verifique se o serviço de notificações está ativo
- Confirme que usuários têm tokens FCM válidos
- Cheque logs de erros no serviço de notificações

### DRY_RUN não funciona
```bash
# Confirme que a variável está no .env
cat .env | grep DRY_RUN

# Reinicie o servidor para carregar novo .env
pm2 restart all
```

---

## 📝 Observações Importantes

1. **Horário do Jogo:**
   - O script calcula automaticamente "agora + 1h15min"
   - Horário salvo em UTC no banco, convertido para Manaus pelo agendador

2. **Notificações Reais:**
   - Notificações push SÃO enviadas mesmo em DRY_RUN
   - Isso permite validar todo o fluxo de notificações

3. **Impacto Zero na Produção:**
   - Requisições à API NÃO são enviadas (DRY_RUN)
   - Jogo fictício usa rodada vigente atual (não conflita, será removido após teste)
   - partida_id 999999 não existe na API real

4. **Limpeza Obrigatória:**
   - Sempre execute `limparJogoTeste.js` após validação
   - Remova `DRY_RUN=true` do `.env` antes de voltar à produção

---

## ✅ Próximos Passos

Após validar com sucesso:
1. Documente os horários e comportamentos observados
2. Confirme que notificações chegaram no tempo esperado
3. Valide que requisições NÃO foram enviadas à API
4. Limpe o jogo de teste e volte ao modo produção
5. Monitore o próximo jogo real para confirmar funcionamento normal

---

**Criado em:** 2026-01-05  
**Versão:** 1.0  
**Modo:** Teste com DRY_RUN  
