// Sincroniza a tabela jogos usando os dados crus armazenados em api_rodadas.partidas_json
// Executar manualmente após consultar/salvar rodadas da API-Futebol

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

function normalizarDataIso(valor, campeonatoId) {
  if (!valor) return null;
  try {
    // Tenta ler ISO com timezone original e converter para America/Manaus
    let dt = DateTime.fromISO(valor, { setZone: true });
    if (!dt.isValid) {
      // fallback dd/MM/yyyy HH:mm
      dt = DateTime.fromFormat(valor, 'dd/LL/yyyy HH:mm', { zone: 'America/Sao_Paulo' });
    }
    if (!dt.isValid) return null;

    // Converte para timezone de Manaus
    dt = dt.setZone('America/Manaus');

    return dt.toFormat('yyyy-LL-dd HH:mm:ss');
  } catch (e) {
    return null;
  }
}

async function processarPartidas(conexao, campeonatoId, rodada, partidas) {
  let total = 0;
  for (const p of partidas) {
    const partidaId = p.partida_id;
    if (!partidaId) continue;

    const dataIso = normalizarDataIso(p.data_realizacao_iso || p.data_realizacao || p.data, campeonatoId);
    const estadio = p.estadio?.nome_popular || p.estadio?.nome || null;
    const timeMandante = p.time_mandante?.nome_popular || p.time_mandante?.nome || null;
    const timeVisitante = p.time_visitante?.nome_popular || p.time_visitante?.nome || null;
    const escudoMandante = p.time_mandante?.escudo || null;
    const escudoVisitante = p.time_visitante?.escudo || null;
    const placarMandante = p.placar_mandante ?? null;
    const placarVisitante = p.placar_visitante ?? null;
    const status = p.status || null;

    await conexao.query(
      `INSERT INTO jogos (
         partida_id, rodada, campeonato_id, data, estadio,
         time_mandante, time_visitante,
         escudo_mandante, escudo_visitante,
         placar_mandante, placar_visitante, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rodada = VALUES(rodada),
         campeonato_id = VALUES(campeonato_id),
         data = VALUES(data),
         estadio = VALUES(estadio),
         time_mandante = VALUES(time_mandante),
         time_visitante = VALUES(time_visitante),
         escudo_mandante = VALUES(escudo_mandante),
         escudo_visitante = VALUES(escudo_visitante),
         placar_mandante = VALUES(placar_mandante),
         placar_visitante = VALUES(placar_visitante),
         status = VALUES(status)
      `,
      [
        partidaId, rodada, campeonatoId, dataIso, estadio,
        timeMandante, timeVisitante,
        escudoMandante, escudoVisitante,
        placarMandante, placarVisitante, status
      ]
    );
    total += 1;
  }
  return total;
}

async function main() {
  const conexao = await pool.getConnection();
  try {
    const [rows] = await conexao.query('SELECT campeonato_id, rodada, partidas_json FROM api_rodadas');
    if (!rows.length) {
      console.log('Nenhuma linha em api_rodadas para processar.');
      return;
    }

    await conexao.beginTransaction();
    let totalProcessado = 0;

    for (const row of rows) {
      const partidas = parsePartidas(row.partidas_json);
      const qtd = await processarPartidas(conexao, row.campeonato_id, row.rodada, partidas);
      totalProcessado += qtd;
      console.log(`Rodada ${row.rodada} (camp ${row.campeonato_id}): ${qtd} partidas sincronizadas.`);
    }

    await conexao.commit();
    console.log(`Concluído. Total de partidas sincronizadas: ${totalProcessado}.`);
  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao sincronizar jogos a partir de api_rodadas:', err);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

main();

function parsePartidas(partidasJson) {
  if (!partidasJson) return [];
  if (Array.isArray(partidasJson)) return partidasJson;
  if (typeof partidasJson === 'object') return partidasJson.partidas || partidasJson;
  if (typeof partidasJson === 'string') {
    try {
      const val = JSON.parse(partidasJson);
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object' && Array.isArray(val.partidas)) return val.partidas;
      return [];
    } catch (e) {
      console.warn('Partidas JSON inválido, ignorando linha:', e.message);
      return [];
    }
  }
  return [];
}
