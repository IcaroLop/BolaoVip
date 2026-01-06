#!/usr/bin/env node
/**
 * Verifica valor RAW (sem conversão) do campo data no banco
 */

const pool = require('../database/conexao');

async function verificarRaw() {
  try {
    console.log('Verificando valor RAW do campo data no banco...\n');

    const [jogos] = await pool.query(`
      SELECT 
        id,
        partida_id,
        time_mandante,
        time_visitante,
        data,
        CAST(data AS CHAR) as data_raw
      FROM jogos
      WHERE partida_id IN (26862, 26854, 26853)
      ORDER BY data
    `);

    console.log('='.repeat(80));
    jogos.forEach(j => {
      console.log(`\nID: ${j.id} (Partida ${j.partida_id})`);
      console.log(`${j.time_mandante} vs ${j.time_visitante}`);
      console.log(`data (objeto): ${j.data}`);
      console.log(`data (raw):    ${j.data_raw}`);
    });
    console.log('\n' + '='.repeat(80));

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

verificarRaw();
