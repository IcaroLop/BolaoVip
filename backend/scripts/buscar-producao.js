const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao banco de produção via tunnel (porta 3307)');

    // Buscar jogos da rodada 2 com times da Série A
    const times = ['Flamengo', 'Internacional', 'Bragantino', 'Atlético-MG', 'Santos', 'São Paulo', 'Remo', 'Mirassol', 'Palmeiras', 'Vitória', 'Grêmio', 'Botafogo'];
    
    const [jogos] = await connection.query(
      `SELECT id, time_mandante, time_visitante, data, placar_mandante, placar_visitante, status
       FROM jogos 
       WHERE campeonato_id = 10 AND rodada = 2 
       AND (time_mandante IN (?) OR time_visitante IN (?))
       ORDER BY data`,
      [times, times]
    );
    
    console.log('\n📊 Jogos encontrados:');
    console.log(JSON.stringify(jogos, null, 2));

    connection.release();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
})();
