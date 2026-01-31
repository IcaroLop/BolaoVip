const pool = require('./database/conexao');

(async () => {
  const [resultado] = await pool.query('SELECT COUNT(*) as total FROM notificacoes_enviadas_jogos');
  console.log('Total de notificações:', resultado[0].total);
  
  const [sample] = await pool.query(`
    SELECT 
      n.id, n.jogo_id, n.tempo_alerta, n.data_agendada,
      j.time_mandante, j.time_visitante, j.data as jogo_data,
      DATE_FORMAT(n.data_agendada, '%Y-%m-%d %H:%i:%s') as agendada_formatada
    FROM notificacoes_enviadas_jogos n
    JOIN jogos j ON n.jogo_id = j.id
    WHERE j.time_mandante = 'Flamengo' AND j.time_visitante = 'Internacional'
    LIMIT 10
  `);
  
  console.log('\nAmostra de notificações para Flamengo x Internacional:');
  sample.forEach(row => {
    console.log(`Alerta ${row.tempo_alerta}min: Agendado para ${row.agendada_formatada} | Jogo: ${row.jogo_data}`);
  });
  
  process.exit(0);
})();
