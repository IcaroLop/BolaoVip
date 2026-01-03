const pool = require('../database/conexao');

(async () => {
  const conexao = await pool.getConnection();
  try {
    const [rows] = await conexao.query(`SELECT id, usuario_id, valor, status_pagamento FROM premios WHERE rodada = ? AND campeonato_id = ?`, [20, 69]);
    console.log(`Prêmios na rodada 20 / campeonato 69 (${rows.length}):`);
    rows.forEach(r => console.log(`- id=${r.id} usuario=${r.usuario_id} valor=${r.valor} status=${r.status_pagamento}`));
  } catch (err) {
    console.error('Erro ao listar prêmios:', err);
    process.exit(1);
  } finally {
    conexao.release();
    await pool.end();
  }
})();