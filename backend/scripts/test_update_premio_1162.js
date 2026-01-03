const pool = require('../database/conexao');

(async () => {
  const conexao = await pool.getConnection();
  try {
    await conexao.query('UPDATE premios SET status_pagamento = ?, data_pagamento = NOW() WHERE id = ?', ['pago', 1162]);
    const [rows] = await conexao.query('SELECT id, status_pagamento, data_pagamento FROM premios WHERE id = ?', [1162]);
    console.log(rows);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    conexao.release();
    await pool.end();
  }
})();
