const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });
  
  console.log('\n🔍 STATUS DOS JOGOS NO BANCO\n');
  
  const [statusJogos] = await conn.query(`
    SELECT DISTINCT status, COUNT(*) as total 
    FROM jogos 
    GROUP BY status
  `);
  console.log('Distribuição por status:');
  console.table(statusJogos);
  
  const [jogosAgendados] = await conn.query(`
    SELECT id, rodada, time_mandante, time_visitante, data, status 
    FROM jogos 
    WHERE data > NOW()
    ORDER BY data ASC
    LIMIT 10
  `);
  
  console.log('\n📅 Próximos jogos (futuro):');
  if (jogosAgendados.length === 0) {
    console.log('❌ Nenhum jogo com data futura encontrado');
  } else {
    console.table(jogosAgendados);
  }
  
  const [notif24h] = await conn.query(`
    SELECT COUNT(*) as total_notif_24h 
    FROM notificacoes_enviadas_jogos 
    WHERE tempo_alerta = 1440
  `);
  console.log('\n📢 Notificações de 24h no banco:');
  console.table(notif24h);
  
  conn.end();
})().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
