const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,  // Tunnel SSH
    user: 'root',
    password: 'isl050382',
    database: 'bolaovip'
  });

  try {
    const conn = await pool.getConnection();
    
    // Verificar campeonatos
    const [campeonatos] = await conn.query('SELECT campeonato_id, nome, ano FROM campeonatos ORDER BY ano DESC, campeonato_id');
    console.log('\n=== CAMPEONATOS ===');
    console.log(JSON.stringify(campeonatos, null, 2));
    
    // Verificar jogos da rodada 2 do campeonato 10 ano 2026
    const [jogos] = await conn.query(
      'SELECT id, campeonato_id, rodada, time_mandante, time_visitante, data FROM jogos WHERE campeonato_id = 10 AND rodada = 2 LIMIT 20'
    );
    console.log('\n=== JOGOS CAMPEONATO 10 RODADA 2 ===');
    console.log(JSON.stringify(jogos, null, 2));
    
    conn.release();
  } catch (error) {
    console.error('Erro ao conectar:', error.message);
  } finally {
    await pool.end();
  }
})();
