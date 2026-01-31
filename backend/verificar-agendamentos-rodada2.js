/**
 * Script: Verificar agendamentos da rodada 2 do campeonato_id=10
 * Conexão: Banco de PRODUÇÃO via SSH tunnel (porta 3307)
 */

const mysql = require('mysql2/promise');

const conexaoProd = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 5
});

async function verificarAgendamentos() {
  console.log('🔍 VERIFICANDO AGENDAMENTOS - RODADA 2 (Campeonato_ID=10)');
  console.log('📡 Conectando em: 127.0.0.1:3307 (SSH Tunnel - PRODUÇÃO)\n');
  console.log('='.repeat(80));

  try {
    // Verificar conexão atual
    const [connInfo] = await conexaoProd.query(`
      SELECT 
        @@hostname as servidor,
        @@port as porta,
        DATABASE() as banco,
        USER() as usuario,
        VERSION() as versao
    `);
    console.log('✅ CONEXÃO ESTABELECIDA:');
    console.log(connInfo[0]);
    console.log('='.repeat(80));
    console.log('');

    // 1. Verificar grupos existentes
    console.log('📋 GRUPOS CADASTRADOS:');
    const [grupos] = await conexaoProd.query(`
      SELECT id, nome, campeonato_id, 
             DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') as criado_em
      FROM grupos
      ORDER BY id
    `);
    console.table(grupos);

    // 2. Verificar jogos da rodada 2, campeonato 10
    console.log('⚽ JOGOS - RODADA 2 (Campeonato 10):');
    const [jogos] = await conexaoProd.query(`
      SELECT 
        partida_id,
        DATE_FORMAT(data, '%d/%m/%Y %H:%i') as data_jogo,
        time_mandante,
        time_visitante,
        CONCAT(COALESCE(placar_mandante, '-'), ' x ', COALESCE(placar_visitante, '-')) as placar,
        status
      FROM jogos
      WHERE campeonato_id = 10 AND rodada = 2
      ORDER BY data
    `);
    console.table(jogos);

    // 3. Verificar agendamentos de placares
    console.log('🗓️  AGENDAMENTOS DE REQUISIÇÕES (Rodada 2, Camp 10):');
    const [agendamentos] = await conexaoProd.query(`
      SELECT 
        id,
        DATE_FORMAT(data_hora, '%d/%m/%Y %H:%i:%s') as disparo_agendado,
        grupo_chave,
        requests_previstos,
        executados,
        tipo,
        status
      FROM agendador_requisicoes
      WHERE campeonato_id = 10 AND rodada = 2
      ORDER BY data_hora
      LIMIT 20
    `);
    if (agendamentos.length === 0) {
      console.log('❌ Nenhum agendamento encontrado para rodada 2, campeonato 10\n');
    } else {
      console.table(agendamentos);
    }

    // 4. Verificar status da rodada
    console.log('📊 STATUS DA RODADA (Rodada 2, Camp 10):');
    const [statusRodada] = await conexaoProd.query(`
      SELECT 
        campeonato_id,
        rodada,
        fase,
        nome,
        status,
        proxima_rodada,
        DATE_FORMAT(atualizado_em, '%d/%m/%Y %H:%i') as atualizado_em
      FROM rodadas_status
      WHERE campeonato_id = 10 AND rodada = 2
    `);
    if (statusRodada.length === 0) {
      console.log('❌ Nenhum registro de status encontrado para rodada 2, campeonato 10\n');
    } else {
      console.table(statusRodada);
    }

    // 5. Verificar notificações enviadas
    console.log('🔔 NOTIFICAÇÕES (Rodada 2, Camp 10):');
    const [notificacoes] = await conexaoProd.query(`
      SELECT 
        id,
        partida_id,
        tempo_alerta,
        status,
        titulo,
        DATE_FORMAT(data_agendada, '%d/%m/%Y %H:%i') as agendada_para,
        DATE_FORMAT(data_enviada, '%d/%m/%Y %H:%i') as enviada_em
      FROM notificacoes_enviadas_jogos
      WHERE campeonato_id = 10 AND rodada = 2
      ORDER BY data_agendada
      LIMIT 20
    `);
    if (notificacoes.length === 0) {
      console.log('❌ Nenhuma notificação encontrada para rodada 2, campeonato 10\n');
    } else {
      console.table(notificacoes);
    }

    // 6. Resumo de agendamentos por campeonato
    console.log('📈 RESUMO GERAL DE AGENDAMENTOS:');
    const [resumo] = await conexaoProd.query(`
      SELECT 
        campeonato_id,
        rodada,
        COUNT(*) as total_agendamentos,
        SUM(CASE WHEN status = 'planejado' THEN 1 ELSE 0 END) as planejados,
        SUM(CASE WHEN status = 'executado' THEN 1 ELSE 0 END) as executados,
        MIN(DATE_FORMAT(data_hora, '%d/%m/%Y')) as primeiro_disparo,
        MAX(DATE_FORMAT(data_hora, '%d/%m/%Y')) as ultimo_disparo
      FROM agendador_requisicoes
      GROUP BY campeonato_id, rodada
      ORDER BY campeonato_id, rodada
      LIMIT 10
    `);
    console.table(resumo);

    // 7. Configurações atuais
    console.log('⚙️  CONFIGURAÇÕES DO SISTEMA:');
    const [config] = await conexaoProd.query(`
      SELECT 
        rodada_vigente,
        requisicoes_api_futebol as requisicoes_usadas,
        limite_requisicoes_dia as limite_diario,
        DATE_FORMAT(data_atualizacao_rodada, '%d/%m/%Y') as ultima_atualizacao
      FROM configuracoes
      LIMIT 1
    `);
    console.table(config);

    console.log('='.repeat(80));
    console.log('✅ VERIFICAÇÃO CONCLUÍDA!\n');

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err);
  } finally {
    await conexaoProd.end();
  }
}

verificarAgendamentos();
