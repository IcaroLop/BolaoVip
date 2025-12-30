const pool = require('../database/conexao');

(async () => {
  try {
    const usuarioId = 7;
    const [s] = await pool.query(
      'SELECT usuario_id, saldo_atual, saldo_bloqueado, atualizado_em FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );
    const [e] = await pool.query(
      'SELECT id, tipo, valor, status, saldo_anterior, saldo_novo, descricao, criado_em FROM extrato_movimentacao WHERE usuario_id = ? ORDER BY id DESC LIMIT 15',
      [usuarioId]
    );
    const [p] = await pool.query(
      'SELECT id, status, status_pagamento, valor_original, txid, data_pagamento FROM pix_cobrancas WHERE id_usuario = ? ORDER BY id DESC LIMIT 10',
      [usuarioId]
    );

    console.log(JSON.stringify({ saldo: s[0] || null, extrato: e, pix: p }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    try { pool.end(); } catch {}
  }
})();
