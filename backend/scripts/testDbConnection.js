const pool = require('../database/conexao');

(async () => {
  try {
    const conexao = await pool.getConnection();
    console.log('Conexão com o banco estabelecida com sucesso.');
    const [rows] = await conexao.query('SELECT COUNT(*) AS cnt FROM campeonatos');
    console.log('campeonatos count:', rows[0].cnt);
    conexao.release();
    await pool.end();
  } catch (err) {
    console.error('Erro de conexão:', err.message);
    console.error(err);
    process.exit(1);
  }
})();