const pool = require('../database/conexao');

async function listar() {
  const conexao = await pool.getConnection();
  const rodada = 20;
  const campeonatoId = 69;

  try {
    const [rows] = await conexao.query(
      `SELECT id, id_usuario AS usuario_id, valor_original AS valor, status_pagamento, calendario_criacao, payload_raw
       FROM pix_cobrancas
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.campeonato_id')) = ?`,
      [String(rodada), String(campeonatoId)]
    );

    if (rows.length === 0) {
      console.log('Nenhuma cobrança encontrada para a rodada', rodada);
    } else {
      console.log(`Cobranças encontradas (${rows.length}):`);
      rows.forEach(r => console.log(`- id=${r.id} usuario=${r.usuario_id} valor=${r.valor} status=${r.status_pagamento}`));
    }
  } catch (err) {
    console.error('Erro ao listar cobranças:', err.message);
    process.exit(1);
  } finally {
    conexao.release();
    await pool.end();
  }
}

listar()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));