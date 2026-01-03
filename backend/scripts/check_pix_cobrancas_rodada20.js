const pool = require('../database/conexao');

(async () => {
  const conexao = await pool.getConnection();
  try {
    const sql = "SELECT id, id_usuario, valor_original, status_pagamento, payload_raw FROM pix_cobrancas WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.campeonato_id')) = ? LIMIT 50";
    const [rows] = await conexao.query(sql, [String(20), String(69)]);
    console.log('Found:', rows.length);
    rows.forEach(r => console.log(r.id, r.id_usuario, r.valor_original, r.status_pagamento, typeof r.payload_raw, r.payload_raw && r.payload_raw.toString ? r.payload_raw.toString().substring(0, 200) : JSON.stringify(r.payload_raw).substring(0,200)));
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    conexao.release();
    await pool.end();
  }
})();
