# 🚀 Guia de Deploy - Sistema de Notificações para Jogos

## 📋 Resumo das Alterações

- **2 commits** com todas as alterações
- **3 arquivos de código modificados**
- **3 scripts auxiliares** criados
- **1 migration SQL** para o banco de dados

### Commits no GitHub:
```
commit 7a690fa - feat: add notifications system for jogos (individual games)
commit 39ddb68 - db: add migration script for notificacoes_enviadas_jogos table
```

---

## 🔧 Passos para Deploy no Servidor

### 1️⃣ Atualizar Código do Repositório

```bash
# Conectar ao servidor
ssh seu_usuario@seu_servidor

# Navegar para o diretório da aplicação
cd /caminho/para/BolaoVIP

# Atualizar repositório
git pull origin master

# Output esperado:
# Updating abc1234..39ddb68
# Fast-forward
#  backend/jobs/cronJobs.js                          |  17 +-
#  backend/scripts/inserirJogoTeste.js               |  12 +-
#  backend/scripts/agendarNotificacoesManual.js      | +++ (novo)
#  backend/scripts/criarTabelaNotificacoesJogos.js   | +++ (novo)
#  backend/scripts/testarNotificacoesJogo.js         | +++ (novo)
#  backend/services/notificacoesAgendadasService.js  |  189 +-
#  backend/database/migrations/20260105_*.sql        | +++ (novo)
```

### 2️⃣ Criar Tabela no Banco de Dados

```bash
# Opção A: Executar migration SQL diretamente
mysql -u seu_usuario -p seu_banco < backend/database/migrations/20260105_criar_notificacoes_enviadas_jogos.sql

# Opção B: Usar Node.js script
cd backend
node scripts/criarTabelaNotificacoesJogos.js

# Output esperado:
# ✅ Tabela notificacoes_enviadas_jogos criada com sucesso
```

### 3️⃣ Reiniciar o Servidor

```bash
# Se estiver usando PM2
pm2 restart all

# OU se for systemd
systemctl restart seu_servico

# OU se for manual
cd backend
node server.js &
```

### 4️⃣ Validar Deploy

```bash
# Verificar se a tabela foi criada
mysql -u seu_usuario -p seu_banco -e "DESC notificacoes_enviadas_jogos;"

# Saída esperada:
# +-----------------+---------+------+-----+-------------------+
# | Field           | Type    | Null | Key | Extra             |
# +-----------------+---------+------+-----+-------------------+
# | id              | int     | NO   | PRI | auto_increment    |
# | jogo_id         | int     | NO   | MUL |                   |
# | partida_id      | int     | NO   |     |                   |
# | rodada          | int     | NO   |     |                   |
# | campeonato_id   | int     | YES  |     |                   |
# | tempo_alerta    | int     | NO   |     |                   |
# | notification_id | bigint  | YES  | UNI |                   |
# | data_agendada   | datetime| NO   | MUL |                   |
# | data_enviada    | datetime| YES  |     |                   |
# | status          | enum    | NO   |     | default agendada  |
# | titulo          | varchar | YES  |     |                   |
# | mensagem        | text    | YES  |     |                   |
# | created_at      | timestamp| NO  |     | CURRENT_TIMESTAMP|
# | updated_at      | timestamp| NO  |     | ON UPDATE CT     |
# +-----------------+---------+------+-----+-------------------+

# Verificar logs
pm2 logs | grep -i "notificacao"

# Confirmar que o cron job está rodando
pm2 logs | grep "Job de agendamento de notificações"
```

---

## 🧪 Testar Sistema de Notificações (Servidor)

### Inserir Jogo de Teste

```bash
cd backend

# Criar jogo de teste (40-50 minutos à frente)
node scripts/inserirJogoTeste.js

# Verificar notificações agendadas
node scripts/testarNotificacoesJogo.js

# Output esperado:
# ✅ Jogo de teste encontrado:
#       Partida ID: 999999
#       Data: Mon Jan 05 2026 10:19:32 GMT-0400
#       Jogo: Time Teste A vs Time Teste B
# 
# 📢 4 notificações agendadas:
#
#   ⏱️  60min antes
#       Status: agendada
#       Agendada para: 05/01/2026 09:19:32
#       Mensagem: "Jogo começa em 60 minutos"
```

### Agendar Notificações Manualmente (se necessário)

```bash
# Se as notificações não foram agendadas automaticamente
node scripts/agendarNotificacoesManual.js

# Output esperado:
# 🚀 Iniciando agendamento manual de notificações...
# 
# [NotificacoesAgendadasService] 📋 Encontrados 1 jogos próximos
# [NotificacoesAgendadasService] ✅ Notificação agendada para jogo 999999: ...
# 
# 📢 4 notificações agendadas:
```

### Monitorar Logs

```bash
# Acompanhar em tempo real
pm2 logs | grep -E "(Notificacao|Disparando|agendada)"

# Saída esperada (quando as notificações dispararem):
# [NotificacoesAgendadasService] 🚀 Disparando 1 notificações...
# [NotificacoesAgendadasService] ✅ Notificação 9999660 processada: Time Teste A vs Time Teste B (60min antes)
# [NotificacoesAgendadasService] ✅ Notificação 9999630 processada: Time Teste A vs Time Teste B (30min antes)
# ...
```

---

## 📊 Funcionamento no Servidor

### Quando um novo jogo é adicionado:

1. **Job de agendamento** (a cada 2 minutos):
   - Busca jogos com `status = 'agendado'` e data dentro de 70 minutos
   - Cria 4 notificações no banco (60, 30, 15, 5 minutos antes)
   - Marca como `status = 'agendada'`

2. **Job de disparo** (a cada 1 minuto):
   - Busca notificações com `data_agendada <= NOW()`
   - Marca como `status = 'enviada'`
   - Log indica que foi processada

3. **Clientes recebem**:
   - Push notification nativa do celular
   - Apresentada em horários: 60, 30, 15 e 5 minutos antes do jogo

---

## 🧹 Limpeza Após Testes

```bash
cd backend

# Remover jogo de teste
node helpers/limparJogoTeste.js

# Verificar que foi removido
mysql -u seu_usuario -p seu_banco -e "SELECT COUNT(*) FROM notificacoes_enviadas_jogos WHERE jogo_id IN (SELECT id FROM jogos WHERE partida_id = 999999);"

# Output esperado:
# 0 (zero notificações)
```

---

## ✅ Checklist de Deployment

- [ ] `git pull origin master` executado com sucesso
- [ ] Migration SQL aplicada (`notificacoes_enviadas_jogos` criada)
- [ ] Servidor reiniciado (`pm2 restart all`)
- [ ] Tabela verificada (`DESC notificacoes_enviadas_jogos`)
- [ ] Cron jobs verificados (`pm2 logs | grep "Job de agendamento"`)
- [ ] Jogo de teste criado (`node scripts/inserirJogoTeste.js`)
- [ ] Notificações visíveis no banco (`node scripts/testarNotificacoesJogo.js`)
- [ ] Logs indicam agendamento correto
- [ ] Jogo de teste removido (`node helpers/limparJogoTeste.js`)

---

## 🆘 Troubleshooting

### Tabela não criada
```bash
# Verificar permissões MySQL
mysql -u root -p seu_banco -e "SHOW GRANTS FOR seu_usuario;"

# Se necessário, dar permissões
mysql -u root -p seu_banco -e "GRANT ALL PRIVILEGES ON seu_banco.* TO 'seu_usuario'@'localhost';"
```

### Notificações não agendadas
```bash
# Verificar se o cron job está rodando
pm2 logs | grep "agendamento de notificações"

# Reiniciar o servidor
pm2 restart all

# Rodar agendamento manualmente
cd backend
node scripts/agendarNotificacoesManual.js
```

### Erro: Foreign key constraint
```bash
# Se tabela jogos não existir ou erro de constraint
# Verificar que a tabela `jogos` existe:
mysql -u seu_usuario -p seu_banco -e "DESC jogos;"

# Usar migration script ao invés do Node.js:
mysql -u seu_usuario -p seu_banco < backend/database/migrations/20260105_criar_notificacoes_enviadas_jogos.sql
```

---

## 📝 Notas Importantes

1. **Backward Compatibility**: Todas as mudanças são aditivas, não afetam código existente
2. **Performance**: Índices criados em tabela para queries rápidas
3. **Notificações Reais**: Sistema funciona em produção imediatamente
4. **Dados de Teste**: Use `partida_id=999999` para testes sem impactar dados reais

---

## 📞 Suporte

Se tiver problemas:
1. Verifique logs: `pm2 logs`
2. Confirme tabela SQL: `mysql ... DESC notificacoes_enviadas_jogos;`
3. Teste manualmente: `node scripts/testarNotificacoesJogo.js`
4. Reinicie servidor: `pm2 restart all`

---

**Criado em:** 2026-01-05  
**Versão:** 1.0  
**Status:** Pronto para Deploy
