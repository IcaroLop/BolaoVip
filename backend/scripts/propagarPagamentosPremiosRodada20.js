const pool = require('../database/conexao');

async function propagar() {
  const conexao = await pool.getConnection();
  const rodada = 20;
  const campeonatoId = 69;

  try {
    const [rows] = await conexao.query(
      `SELECT id, codigo_envio, id_usuario, payload_raw FROM pix_cobrancas
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.campeonato_id')) = ?
         AND status_pagamento = 'PAGO'`,
      [String(rodada), String(campeonatoId)]
    );

    if (rows.length === 0) {
      console.log('Nenhuma cobrança PAGO encontrada para propagar.');
      return;
    }

    console.log(`Encontradas ${rows.length} cobranças PAGO. Verificando payloads para premio_id...`);

    let atualizadas = 0;

    for (const r of rows) {
      // Extrair payload de forma robusta
      let payload = {};
      try {
        if (typeof r.payload_raw === 'string') payload = JSON.parse(r.payload_raw);
        else payload = r.payload_raw || {};
      } catch (e) {
        payload = {};
      }

      if (payload && payload.premio_id) {
        const [res] = await conexao.query(
          `UPDATE premios SET status_pagamento = 'pago', data_pagamento = NOW() WHERE id = ? AND status_pagamento = 'pendente'`,
          [payload.premio_id]
        );

        if (res && res.affectedRows > 0) {
          atualizadas++;
          console.log(`- Premio id=${payload.premio_id} marcado como pago (origem cobranca id=${r.id}).`);
        }
      }
    }

    console.log(`\n✅ Total de premios atualizados: ${atualizadas}`);
  } catch (err) {
    console.error('Erro ao propagar pagamentos para premios:', err.message || err);
    process.exit(1);
  } finally {
    conexao.release();
    await pool.end();
  }
}

propagar()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
