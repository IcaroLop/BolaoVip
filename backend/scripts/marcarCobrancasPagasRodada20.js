const pool = require('../database/conexao');

async function marcarPagas() {
  const conexao = await pool.getConnection();
  const rodada = 20;
  const campeonatoId = 69;

  try {
    const [rows] = await conexao.query(
      `SELECT id, codigo_envio, id_usuario, payload_raw FROM pix_cobrancas
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.campeonato_id')) = ?
         AND status_pagamento = 'PENDENTE'`,
      [String(rodada), String(campeonatoId)]
    );

    if (rows.length === 0) {
      console.log('Nenhuma cobrança pendente encontrada para pagamento.');
      return;
    }

    console.log(`Encontradas ${rows.length} cobranças pendentes. Marcando como pagas...`);

    let atualizadas = 0;

    for (const r of rows) {
      // Atualizar pix_cobrancas
      await conexao.query(
        `UPDATE pix_cobrancas SET status_pagamento = 'PAGO', status = 'pago', data_pagamento = NOW() WHERE id = ?`,
        [r.id]
      );

      // Tentar extrair premio_id do payload (payload_raw pode ser string ou objeto)
      let payload = {};
      try {
        if (typeof r.payload_raw === 'string') payload = JSON.parse(r.payload_raw);
        else payload = r.payload_raw || {};
      } catch (e) {
        payload = {};
      }

      if (payload && payload.premio_id) {
        await conexao.query(
          `UPDATE premios SET status_pagamento = 'pago', data_pagamento = NOW() WHERE id = ? AND status_pagamento = 'pendente'`,
          [payload.premio_id]
        );
      }

      atualizadas++;
      console.log(`- Cobrança id=${r.id} (codigo_envio=${r.codigo_envio}) marcada como PAGO`);
    }

    console.log(`\n✅ Total de cobranças marcadas como pagas: ${atualizadas}`);
  } catch (err) {
    console.error('Erro ao marcar cobranças como pagas:', err.message || err);
    process.exit(1);
  } finally {
    conexao.release();
    await pool.end();
  }
}

marcarPagas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));