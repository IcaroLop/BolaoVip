const pool = require('../database/conexao');

(async () => {
  try {
    const conexao = await pool.getConnection();
    const nome = '%Premier League%';
    console.log('Query: SELECT campeonato_id, nome FROM campeonatos WHERE nome LIKE', nome);
    const [rows] = await conexao.query(`SELECT campeonato_id, nome FROM campeonatos WHERE nome LIKE ? LIMIT 10`, [nome]);
    console.log('Rows:', rows);
    conexao.release();
    await pool.end();
  } catch (err) {
    console.error('Erro no SELECT:', err);
    process.exit(1);
  }
})();