/**
 * Script: Listar notificações push programadas para o dia 4 de fevereiro
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

async function listarNotificacoesD4() {
  console.log('📱 NOTIFICAÇÕES PUSH PROGRAMADAS - DIA 4 DE FEVEREIRO (04/02/2026)');
  console.log('📡 Banco de Produção: 127.0.0.1:3307 (SSH Tunnel)\n');
  console.log('='.repeat(100));

  try {
    // 1. Contar total de notificações por hora
    console.log('\n⏰ RESUMO POR HORÁRIO:');
    const [notificacoesPorHora] = await conexaoProd.query(`
      SELECT 
        DATE_FORMAT(data_agendada, '%H:%i') as horario_disparo,
        COUNT(*) as total_notificacoes,
        GROUP_CONCAT(DISTINCT titulo) as jogos
      FROM notificacoes_enviadas_jogos
      WHERE DATE(data_agendada) = '2026-02-04'
      GROUP BY DATE_FORMAT(data_agendada, '%H:%i')
      ORDER BY MIN(data_agendada)
    `);
    console.table(notificacoesPorHora);

    // 2. Detalhar por jogo
    console.log('\n⚽ NOTIFICAÇÕES DETALHADAS POR JOGO (04/02/2026):');
    const [notificacoesPorJogo] = await conexaoProd.query(`
      SELECT 
        ne.id,
        j.partida_id,
        j.time_mandante,
        j.time_visitante,
        DATE_FORMAT(j.data, '%H:%i') as horario_jogo,
        ne.tempo_alerta as minutos_antes,
        ne.titulo,
        DATE_FORMAT(ne.data_agendada, '%H:%i') as disparo_em,
        ne.status,
        ne.mensagem
      FROM notificacoes_enviadas_jogos ne
      INNER JOIN jogos j ON j.partida_id = ne.partida_id
      WHERE DATE(ne.data_agendada) = '2026-02-04'
      ORDER BY j.data, ne.tempo_alerta DESC
    `);

    if (notificacoesPorJogo.length === 0) {
      console.log('❌ Nenhuma notificação encontrada para 04/02/2026');
      return;
    }

    // Agrupar por jogo
    const jogosPorHorario = {};
    for (const notif of notificacoesPorJogo) {
      const chave = `${notif.horario_jogo} - ${notif.time_mandante} x ${notif.time_visitante}`;
      if (!jogosPorHorario[chave]) {
        jogosPorHorario[chave] = [];
      }
      jogosPorHorario[chave].push(notif);
    }

    // Exibir agrupado
    for (const [jogo, notificacoes] of Object.entries(jogosPorHorario)) {
      console.log(`\n📌 ${jogo}`);
      console.log('-'.repeat(100));
      
      const tableData = notificacoes.map(n => ({
        'ID': n.id,
        'Disparo em': n.disparo_em,
        'Aviso (minutos antes)': n.minutos_antes,
        'Título': n.titulo,
        'Status': n.status,
        'Mensagem': n.mensagem ? n.mensagem.substring(0, 50) + '...' : '(sem mensagem)'
      }));
      
      console.table(tableData);
    }

    // 3. Timeline completa
    console.log('\n📅 TIMELINE COMPLETA DE DISPAROS (04/02/2026):');
    console.log('-'.repeat(100));
    const [timeline] = await conexaoProd.query(`
      SELECT 
        DATE_FORMAT(data_agendada, '%H:%i:%s') as momento_disparo,
        titulo as notificacao,
        CASE WHEN status = 'agendada' THEN '⏳ Aguardando'
             WHEN status = 'enviada' THEN '✅ Enviada'
             WHEN status = 'cancelada' THEN '❌ Cancelada'
             WHEN status = 'expirada' THEN '⏰ Expirada'
        END as status_visual
      FROM notificacoes_enviadas_jogos
      WHERE DATE(data_agendada) = '2026-02-04'
      ORDER BY data_agendada
    `);

    let contadorHora = '';
    for (const item of timeline) {
      const horaAtual = item.momento_disparo.substring(0, 2);
      if (horaAtual !== contadorHora) {
        contadorHora = horaAtual;
        console.log(`\n🕐 ${horaAtual}:00 - ${item.momento_disparo}`);
      }
      console.log(`   ${item.status_visual} ${item.notificacao}`);
    }

    // 4. Estatísticas finais
    console.log('\n\n📊 ESTATÍSTICAS DO DIA 04/02/2026:');
    console.log('-'.repeat(100));
    const [stats] = await conexaoProd.query(`
      SELECT 
        COUNT(*) as total_notificacoes,
        SUM(CASE WHEN ne.status = 'agendada' THEN 1 ELSE 0 END) as agendadas,
        SUM(CASE WHEN ne.status = 'enviada' THEN 1 ELSE 0 END) as enviadas,
        SUM(CASE WHEN ne.status = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN ne.status = 'expirada' THEN 1 ELSE 0 END) as expiradas,
        COUNT(DISTINCT CONCAT(j.time_mandante, ' vs ', j.time_visitante)) as total_jogos,
        MIN(DATE_FORMAT(ne.data_agendada, '%H:%i')) as primeiro_disparo,
        MAX(DATE_FORMAT(ne.data_agendada, '%H:%i')) as ultimo_disparo,
        TIMEDIFF(MAX(ne.data_agendada), MIN(ne.data_agendada)) as duracao_total
      FROM notificacoes_enviadas_jogos ne
      INNER JOIN jogos j ON j.partida_id = ne.partida_id
      WHERE DATE(ne.data_agendada) = '2026-02-04'
    `);

    const stat = stats[0];
    console.log(`
📱 Total de notificações:      ${stat.total_notificacoes}
   ├─ Agendadas (pendentes):    ${stat.agendadas}
   ├─ Enviadas:                 ${stat.enviadas}
   ├─ Canceladas:               ${stat.canceladas}
   └─ Expiradas:                ${stat.expiradas}

⚽ Jogos do dia 4:              ${stat.total_jogos}
⏰ Primeiro disparo:            ${stat.primeiro_disparo}
⏰ Último disparo:              ${stat.ultimo_disparo}
⌚ Duração total:               ${stat.duracao_total}
    `);

    console.log('='.repeat(100));
    console.log('\n✅ CONSULTA CONCLUÍDA!\n');

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err);
  } finally {
    await conexaoProd.end();
  }
}

listarNotificacoesD4();
