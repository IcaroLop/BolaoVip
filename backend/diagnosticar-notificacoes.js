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

(async () => {
  try {
    // Contar quantas notificações temos por jogo
    const [stats] = await conexaoProd.query(`
      SELECT 
        j.id as jogo_id,
        j.time_mandante,
        j.time_visitante,
        j.rodada,
        COUNT(ne.id) as total_notificacoes,
        MIN(DATE(ne.created_at)) as criada_em
      FROM jogos j
      LEFT JOIN notificacoes_enviadas_jogos ne ON j.id = ne.jogo_id
      WHERE j.rodada = 2 AND j.campeonato_id = 10
      GROUP BY j.id
      ORDER BY j.data ASC
      LIMIT 10
    `);

    console.log('📊 Status das notificações para Rodada 2 do Brasileirão:\n');
    stats.forEach(row => {
      console.log(`${row.time_mandante} vs ${row.time_visitante}`);
      console.log(`  📝 Notificações: ${row.total_notificacoes} | Criadas em: ${row.criada_em}`);
    });

    // Ver as datas específicas armazenadas
    console.log('\n\n🔍 VERIFICANDO DADOS ESPECÍFICOS DE UMA NOTIFICAÇÃO:\n');
    const [sample] = await conexaoProd.query(`
      SELECT 
        j.id, j.time_mandante, j.time_visitante, j.data as jogo_data,
        ne.id as notif_id, ne.tempo_alerta, ne.data_agendada, ne.created_at
      FROM jogos j
      JOIN notificacoes_enviadas_jogos ne ON j.id = ne.jogo_id
      WHERE j.rodada = 2 AND j.campeonato_id = 10
      LIMIT 4
    `);

    sample.forEach(row => {
      console.log(`Jogo: ${row.time_mandante} vs ${row.time_visitante}`);
      console.log(`  Jogo marcado para: ${row.jogo_data}`);
      console.log(`  Alerta ${row.tempo_alerta} min agendado para: ${row.data_agendada}`);
      console.log(`  Criado em: ${row.created_at}\n`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
