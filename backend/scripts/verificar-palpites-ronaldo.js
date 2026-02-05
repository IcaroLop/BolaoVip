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
  const connection = await pool.getConnection();
  
  try {
    const [palpites] = await connection.query(
      `SELECT p.id, p.id_jogo, p.gols_casa, p.gols_fora, j.time_mandante, j.time_visitante
       FROM palpites p
       JOIN jogos j ON p.id_jogo = j.id
       WHERE p.id_usuario = 9 AND p.rodada = 2
       ORDER BY j.data ASC`
    );
    
    console.log('\n📊 Palpites existentes de Ronaldo de Lima Dantas na rodada 2:\n');
    palpites.forEach((p, index) => {
      console.log(`${index + 1}. ${p.time_mandante} ${p.gols_casa} x ${p.gols_fora} ${p.time_visitante}`);
    });
    console.log(`\nTotal: ${palpites.length} palpites`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
})();
