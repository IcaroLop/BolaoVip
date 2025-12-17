# Sistema de Cron Jobs Automáticos - Bolão VIP

## Visão Geral

Sistema de agendamentos automáticos para manutenção e atualização de dados da aplicação Bolão VIP, utilizando `node-cron` com timezone configurado para America/Manaus (UTC-4).

## Jobs Implementados

### 1. Zerar Contador de Requisições (00:01 AM)

**Arquivo:** `backend/jobs/cronJobs.js` - `iniciarJobZerarContador()`

**Horário:** Todos os dias às 00:01 AM (America/Manaus)

**Função:**
- Zera o contador diário de requisições à API-Futebol
- Atualiza a coluna `requisicoes_api_futebol` da tabela `configuracoes`
- Permite que o sistema reinicie a contagem de requisições para o novo dia

**SQL Executado:**
```sql
UPDATE configuracoes 
SET requisicoes_api_futebol = 0 
WHERE id = 1
```

**Log de Sucesso:**
```
✅ [00:01] Contador de requisições zerado com sucesso. X linha(s) atualizada(s).
```

---

### 2. Atualizar Status das Rodadas (01:00 AM)

**Arquivo:** `backend/jobs/cronJobs.js` - `iniciarJobAtualizarStatusRodadas()`

**Horário:** Todos os dias às 01:00 AM (America/Manaus)

**Função:**
- Busca todos os campeonatos vinculados aos grupos criados
- Consulta a API-Futebol para obter o status atualizado de todas as rodadas
- Atualiza a tabela `rodadas_status` com informações de:
  - Status da rodada (agendada, ao_vivo, encerrada)
  - Próxima rodada
  - Metadados (fase, nome, slug, link)

**Fluxo de Execução:**
1. Busca campeonatos distintos da tabela `grupos`
2. Para cada campeonato, faz requisição GET para `/campeonatos/{id}/rodadas`
3. Insere ou atualiza cada rodada na tabela `rodadas_status`

**Endpoint da API-Futebol:**
```
GET https://api.api-futebol.com.br/v1/campeonatos/{campeonato_id}/rodadas
```

**Campos Atualizados:**
- `campeonato_id` - ID do campeonato
- `fase` - Fase da rodada (primeira-fase, oitavas-de-final, etc.)
- `rodada` - Número da rodada
- `nome` - Nome descritivo da rodada
- `slug` - Identificador slug
- `status` - Status atual (agendada, ao_vivo, encerrada)
- `proxima_rodada` - Número da próxima rodada
- `link` - URL de referência
- `atualizado_em` - Timestamp de atualização

**Log de Sucesso:**
```
✅ [01:00] Status das rodadas do campeonato {id} atualizado.
```

---

### 3. Planejar Agendamentos de Requisições (02:00 AM)

**Arquivo:** `backend/jobs/cronJobs.js` - `iniciarJobPlanejarAgendamentos()`

**Horário:** Todos os dias às 02:00 AM (America/Manaus)

**Função:**
- Gera o planejamento automático de requisições de placares para o dia
- Agrupa jogos por data/horário
- Respeita o limite diário de requisições (configurável em `configuracoes.limite_requisicoes_dia`)
- Persiste o plano na tabela `agendador_requisicoes`

**Fluxo de Execução:**
1. Chama `agendadorService.planejarPersistirAgenda()`
2. Agrupa jogos das rodadas atuais por data/hora
3. Calcula quantas requisições são necessárias
4. Verifica se está dentro do limite diário
5. Persiste o plano com status 'planejado'

**Tabela Utilizada:** `agendador_requisicoes`

**Campos Persistidos:**
- `data_hora` - Momento do disparo da requisição
- `campeonato_id` - ID do campeonato
- `rodada` - Número da rodada
- `grupo_chave` - Identificador do grupo (data+hora+campeonato+rodada)
- `requests_previstos` - Quantidade de requisições necessárias
- `status` - Status do agendamento (planejado, executado, falhou, adiado)

**Log de Sucesso:**
```
✅ [02:00] Planejamento de agendamentos concluído.
📊 [02:00] {mensagem}
📅 [02:00] Total de grupos planejados: X
📊 [02:00] Total de requisições previstas: Y
```

---

## Configuração

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no arquivo `.env`:

```env
# Token da API-Futebol (Produção ou Desenvolvimento)
API_FUTEBOL_TOKEN_PROD=live_xxxxx
API_FUTEBOL_TOKEN_DEV=test_xxxxx

# Porta do servidor (padrão: 3001)
PORT=3001
```

### Timezone

Todos os jobs utilizam o timezone `America/Manaus` (UTC-4) para garantir que os agendamentos sejam executados no horário local correto.

---

## Inicialização

Os cron jobs são inicializados automaticamente quando o servidor é iniciado. No arquivo `backend/server.js`:

```javascript
const { iniciarTodosJobs } = require('./jobs/cronJobs');

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  iniciarTodosJobs();
});
```

**Log de Inicialização:**
```
🚀 Iniciando sistema de cron jobs...
✅ Job de zerar contador agendado para 00:01 AM (America/Manaus)
✅ Job de atualizar status das rodadas agendado para 01:00 AM (America/Manaus)
✅ Job de planejar agendamentos agendado para 02:00 AM (America/Manaus)
✅ Todos os cron jobs foram agendados com sucesso!
```

---

## Testes Manuais

Para testar os jobs manualmente sem aguardar o horário agendado, utilize o script de testes:

### Testar Todos os Jobs
```bash
node backend/scripts/testarCronJobs.js todos
```

### Testar Job Específico
```bash
# Zerar contador
node backend/scripts/testarCronJobs.js zerar-contador

# Atualizar rodadas
node backend/scripts/testarCronJobs.js atualizar-rodadas

# Planejar agendamentos
node backend/scripts/testarCronJobs.js planejar-agendamentos
```

---

## Monitoramento

### Logs de Execução

Todos os jobs registram logs detalhados no console do servidor:

- ✅ Sucesso: Operações concluídas com sucesso
- ⚠️ Aviso: Situações que requerem atenção
- ❌ Erro: Falhas na execução

### Exemplo de Log Completo (01:00 AM)
```
🔄 [01:00] Iniciando job de atualização de status das rodadas...
📊 [01:00] Encontrados 2 campeonato(s) para atualizar.
🔍 [01:00] Buscando rodadas do campeonato 20...
📥 [01:00] Recebidas 38 rodadas do campeonato 20.
✅ [01:00] Status das rodadas do campeonato 20 atualizado.
🔍 [01:00] Buscando rodadas do campeonato 69...
📥 [01:00] Recebidas 38 rodadas do campeonato 69.
✅ [01:00] Status das rodadas do campeonato 69 atualizado.
✅ [01:00] Job de atualização de status das rodadas concluído.
```

---

## Estrutura de Arquivos

```
backend/
├── jobs/
│   ├── cronJobs.js                 # Definição dos 3 cron jobs
│   └── agendaResultadosJob.js      # Job legado (desabilitado)
├── scripts/
│   └── testarCronJobs.js           # Script de testes manuais
├── services/
│   └── agendadorService.js         # Serviço de planejamento
└── server.js                       # Inicialização dos jobs
```

---

## Dependências

- **node-cron** (^4.2.0): Agendador de tarefas cron
- **axios**: Requisições HTTP para API-Futebol
- **luxon**: Manipulação de datas e timezones
- **mysql2**: Conexão com banco de dados MySQL

---

## Troubleshooting

### Jobs não estão executando

1. Verifique se o servidor está rodando
2. Confirme que os logs de inicialização aparecem no console
3. Valide o timezone do sistema operacional

### Erro ao buscar rodadas da API

1. Verifique se o token da API-Futebol está configurado corretamente
2. Confirme que há saldo de requisições disponíveis
3. Teste o endpoint manualmente com Postman/cURL

### Tabela rodadas_status não atualiza

1. Verifique se a tabela existe no banco de dados
2. Execute o script de criação: `backend/scripts/BD/create_rodadas_status.sql`
3. Confirme que há grupos com `campeonato_id` definido

---

## Manutenção

### Alterar Horários de Execução

Edite os cron expressions no arquivo `backend/jobs/cronJobs.js`:

```javascript
// Formato: 'minuto hora dia mês dia-da-semana'
cron.schedule('1 0 * * *', ...)  // 00:01 AM
cron.schedule('0 1 * * *', ...)  // 01:00 AM
cron.schedule('0 2 * * *', ...)  // 02:00 AM
```

### Desabilitar Jobs Temporariamente

Comente a chamada no `server.js`:

```javascript
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  // iniciarTodosJobs(); // <-- Comentar esta linha
});
```

---

## Histórico de Versões

- **v1.0.0** (2025-12-15): Implementação inicial dos 3 cron jobs automáticos
