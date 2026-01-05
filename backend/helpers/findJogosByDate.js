require('dotenv').config();
const pool = require('../database/conexao');

async function run() {
  try {
    const [rows] = await pool.query("SELECT id, partida_id, data FROM jogos WHERE data LIKE '%Jan 06 2026%' OR data LIKE '%2026-01-06%' OR data LIKE '%06/01/2026%' LIMIT 50");
    console.log('Matches:', rows.length);
    for (const r of rows) console.log(r);
  } catch (err) {
    console.error('Erro na query:', err.message || err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();