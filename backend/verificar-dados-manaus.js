const pool = require('./database/conexao');
const { DateTime } = require('luxon');

(async () => {
  const [jogo] = await pool.query(`
    SELECT id, data, time_mandante, time_visitante FROM jogos 
    WHERE time_mandante = 'Flamengo' AND time_visitante = 'Internacional' LIMIT 1
  `);
  
  if (jogo.length === 0) {
    console.log('Jogo não encontrado');
    process.exit(0);
  }
  
  const j = jogo[0];
  console.log(`\n⚽ ${j.time_mandante} vs ${j.time_visitante}`);
  console.log(`Data armazenada: ${j.data}`);
  console.log(`Tipo: ${typeof j.data}`);
  
  const dataISO = j.data.toISOString();
  console.log(`ISO: ${dataISO}`);
  
  const dataManaus = DateTime.fromISO(dataISO, { zone: 'America/Manaus' })
    .setZone('America/Manaus');
  console.log(`Manaus (setZone): ${dataManaus.toFormat('yyyy-MM-dd HH:mm:ss')}`);
  
  console.log('\n📋 Notificações agendadas:');
  const [notifs] = await pool.query(`
    SELECT tempo_alerta, data_agendada, DATE_FORMAT(data_agendada, '%H:%i') as horario
    FROM notificacoes_enviadas_jogos 
    WHERE jogo_id = ?
    ORDER BY tempo_alerta DESC
  `, [j.id]);
  
  notifs.forEach(n => {
    console.log(`${n.tempo_alerta}min: ${n.horario}`);
  });
  
  process.exit(0);
})();
