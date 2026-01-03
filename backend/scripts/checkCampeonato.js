const pool = require('../database/conexao');

async function check() {
  const conexao = await pool.getConnection();
  try {
    const nome = '%Premier League%';
    const [rows] = await conexao.query(
      `SELECT id AS campeonato_id, nome FROM campeonatos WHERE nome LIKE ? LIMIT 10`,
      [nome]
    );

    if (rows.length === 0) {
      console.log('Nenhum campeonato encontrado com nome LIKE', nome);
    } else {
      console.log('Resultados encontrados:');
      rows.forEach(r => console.log(`- id=${r.campeonato_id} | nome=${r.nome}`));
    }
  } catch (err) {
    console.error('Erro ao consultar campeonatos:', err.message);
    process.exit(1);
  } finally {
    conexao.release();
    await pool.end();
  }
}

check()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));