const pool = require('../database/conexao');

(async()=>{
  const conexao = await pool.getConnection();
  try {
    const [[palpitesCnt]] = await conexao.query('SELECT COUNT(*) AS cnt FROM palpites WHERE rodada=? AND campeonato_id=? AND id_usuario IN (1,2,3,4,5,6)', [20,69]);
    console.log('Palpites existentes (rodada20, users1..6):', palpitesCnt.cnt);

    const [[cobsCnt]] = await conexao.query("SELECT COUNT(*) AS cnt FROM pix_cobrancas WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.origem')) = 'palpites'", [String(20)]);
    console.log('Cobranças (origem=palpites,rodada20):', cobsCnt.cnt);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    conexao.release();
    await pool.end();
  }
})();
