const pool = require('../database/conexao');
const { DateTime } = require('luxon');
const { consultarResultadosDaRodada } = require('../services/consultaResultadosService');
const moment = require('moment-timezone');

async function proximoAgendamento(req, res) {
  try {
    const [jogos] = await pool.query(`
      SELECT rodada, MIN(data) AS data
      FROM jogos
      WHERE placar_mandante IS NULL OR placar_visitante IS NULL
      GROUP BY rodada
      ORDER BY rodada ASC
      LIMIT 1
    `);

    if (jogos.length === 0) {
      return res.status(404).json({ erro: 'Nenhum jogo pendente encontrado.' });
    }

    const proximoJogo = jogos[0];

    // Convertendo para horário de Brasília (UTC-3)
    const dataBrasilia = DateTime.fromJSDate(new Date(proximoJogo.data), { zone: 'utc' })
      .setZone('America/Manaus');

    const data_formatada = dataBrasilia.toFormat('dd/LL/yyyy HH:mm');
    const data_proxima_consulta = dataBrasilia.toISO(); // formato ISO local

    const quantidade_jogos = jogos.length;

    res.json({
      rodada: proximoJogo.rodada,
      data_proxima_consulta,
      data_formatada,
      quantidade_jogos
    });

  } catch (err) {
    console.error('Erro ao buscar próximo agendamento:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar próximo agendamento.' });
  }
}

const historicoAgendamentos = async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const [linhas] = await pool.query(`
      SELECT 
        rodada,
        COUNT(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 END) AS jogos_com_resultado,
        COUNT(*) AS total_jogos
      FROM jogos
      GROUP BY rodada
      ORDER BY MIN(data) ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const historico = [];

    for (const linha of linhas) {
      const [jogosRodada] = await pool.query(`
        SELECT data
        FROM jogos
        WHERE rodada = ?
        ORDER BY data ASC
      `, [linha.rodada]);

      const horarios = jogosRodada.map(j => 
        moment.tz(j.data, 'America/Manaus').format('DD/MM/YYYY HH:mm')
      );

      let status = 'Aguardando';
      if (linha.jogos_com_resultado === linha.total_jogos) status = 'Concluído';
      else if (linha.jogos_com_resultado > 0) status = 'Parcial';

      historico.push({
        rodada: linha.rodada,
        status,
        horarios
      });
    }

    res.json(historico);
  } catch (err) {
    console.error('Erro ao buscar histórico de agendamentos:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
};

async function consultarRodadaManual(req, res) {
  const rodada = parseInt(req.params.rodada, 10);

  try {
    await consultarResultadosDaRodada(rodada);
    res.json({ mensagem: `Consulta manual da rodada ${rodada} realizada com sucesso.` });
  } catch (err) {
    console.error('Erro ao consultar rodada manual:', err.message);
    res.status(500).json({ erro: 'Erro ao consultar rodada manual' });
  }
}

module.exports = {
  proximoAgendamento,
  historicoAgendamentos,
  consultarRodadaManual
};

