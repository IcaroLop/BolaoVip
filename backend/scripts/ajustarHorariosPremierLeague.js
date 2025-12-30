// Ajusta horários de todos os jogos da Premier League (camp 69)
// Usa a API oficial para cada rodada e grava os horários convertidos para America/Manaus
require('dotenv').config();
const axios = require('axios');
const { DateTime } = require('luxon');
const pool = require('../database/conexao');

const API_BASE = 'https://api.api-futebol.com.br/v1';
const CAMPEONATO_ID = 69;
const TOTAL_RODADAS = 38;

async function ajustarRodada(rodada, token) {
  const url = `${API_BASE}/campeonatos/${CAMPEONATO_ID}/rodadas/${rodada}`;
  const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  const partidas = resp.data?.partidas || [];
  if (!partidas.length) return { rodada, atualizados: 0 };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let atualizados = 0;
    for (const p of partidas) {
      const partidaId = p.partida_id;
      const iso = p.data_realizacao_iso || p.data_realizacao;
      if (!iso) continue;
      const dtManaus = DateTime.fromISO(iso, { setZone: true }).setZone('America/Manaus');
      const dataSql = dtManaus.toFormat('yyyy-LL-dd HH:mm:ss');
      await conn.query(
        'UPDATE jogos SET data = ? WHERE partida_id = ? AND campeonato_id = ?',
        [dataSql, partidaId, CAMPEONATO_ID]
      );
      atualizados += 1;
    }
    await conn.commit();
    return { rodada, atualizados };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function main() {
  const token = process.env.API_FUTEBOL_TOKEN;
  if (!token) {
    console.error('❌ API_FUTEBOL_TOKEN não definido.');
    process.exit(1);
  }
  let total = 0;
  for (let r = 1; r <= TOTAL_RODADAS; r++) {
    try {
      const { atualizados } = await ajustarRodada(r, token);
      total += atualizados;
      console.log(`✅ Rodada ${r}: ${atualizados} jogos ajustados.`);
    } catch (err) {
      console.warn(`⚠️ Falha na rodada ${r}:`, err.response?.status || err.message);
    }
  }
  console.log(`\n🏁 Concluído: ${total} jogos atualizados.`);
  process.exit(0);
}

main();
