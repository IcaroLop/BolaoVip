const pool = require('../database/conexao');

(async () => {
  const conexao = await pool.getConnection();
  try {
    const sql = "SELECT COUNT(*) AS cnt FROM pix_cobrancas WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.origem')) = 'palpites'";
    const [rows] = await conexao.query(sql, [String(20)]);
    console.log('Pix cobrancas origem=palpites rodada20:', rows[0].cnt);
  } catch (err) {
    console.error(err);
  } finally {
    conexao.release();
    await pool.end();
  }
})();
