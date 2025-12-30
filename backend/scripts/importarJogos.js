const axios = require('axios');
const pool = require('../database/conexao');
const { DateTime } = require('luxon');
const { calcularRankingRodada, gerarPremiacoesRodada } = require('../controllers/rankingController');
const { obterCampeonatoPreferido, obterTokenApiFutebol } = require('../services/apiFutebolHelper');

async function importarRodadas() {
  try {
    const token = obterTokenApiFutebol();
    const { urlBase } = await obterCampeonatoPreferido();

    for (let rodada = 20; rodada <= 38; rodada++) {
      const res = await axios.get(`${urlBase}/rodadas/${rodada}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const partidas = res.data.partidas;

      for (const p of partidas) {
        // Converte para America/Sao_Paulo -> America/Manaus e aplica -4h para Premier League (camp 69)
        const campeonatoId = res.data?.campeonato?.campeonato_id || null;
        let dt = DateTime.fromISO(p.data_realizacao_iso, { zone: 'America/Sao_Paulo' }).setZone('America/Manaus');
        if (campeonatoId === 69) {
          dt = dt.minus({ hours: 4 });
        }
        const dataHora = dt.toJSDate();
        await pool.query(`
          INSERT INTO jogos (
            partida_id, campeonato_id, rodada, data, time_mandante, time_visitante,
            escudo_mandante, escudo_visitante, estadio, placar_mandante, placar_visitante, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            campeonato_id = VALUES(campeonato_id),
            rodada = VALUES(rodada),
            data = VALUES(data),
            placar_mandante = VALUES(placar_mandante),
            placar_visitante = VALUES(placar_visitante),
            status = VALUES(status)
        `, [
          p.partida_id,
          res.data?.campeonato?.campeonato_id || null,
          rodada,
          dataHora,
          p.time_mandante.nome_popular,
          p.time_visitante.nome_popular,
          p.time_mandante.escudo,
          p.time_visitante.escudo,
          p.estadio?.nome_popular || '',
          p.placar_mandante,
          p.placar_visitante,
          p.status
        ]);
      }

      console.log(`Rodada ${rodada} importada com sucesso.`);

      // ⚙️ Calcula ranking da rodada
      await calcularRankingRodada(rodada);

      // 🏆 Gera premiações da rodada
      await gerarPremiacoesRodada(rodada);
    }

    console.log('✅ Todas as rodadas foram importadas e processadas com sucesso.');
  } catch (err) {
    console.error('Erro ao importar rodadas:', err.response?.data || err.message);
  }
}

importarRodadas();
