const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'isl050382',
  database: 'bolaovip'
});

(async () => {
  try {
    const conn = await pool.getConnection();
    
    // Buscar jogos da rodada 18 do campeonato 69
    const [jogos] = await conn.query(
      'SELECT partida_id, time_mandante, time_visitante, status, data FROM jogos WHERE rodada = 18 AND campeonato_id = 69 LIMIT 10'
    );
    
    console.log('\n✅ Jogos disponíveis na rodada 18 (Premier League - Campeonato 69):\n');
    jogos.forEach((jogo, idx) => {
      console.log(`${idx + 1}. ${jogo.time_mandante} vs ${jogo.time_visitante}`);
      console.log(`   Status: ${jogo.status}`);
      console.log(`   Data: ${jogo.data}`);
      console.log(`   Partida ID: ${jogo.partida_id}\n`);
    });
    
    conn.release();
    pool.end();
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
