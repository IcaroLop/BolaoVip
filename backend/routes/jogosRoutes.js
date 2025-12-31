const express = require('express');
const router = express.Router();
const pool = require('../database/conexao');
const { buscarJogosAoVivoComFallback } = require('../services/jogosAoVivoScraper');

// Jogos por rodada (legado)
router.get('/rodada/:rodada', async (req, res) => {
  const rodada = parseInt(req.params.rodada, 10);

  try {
    const [jogos] = await pool.query(
      `
      SELECT 
        partida_id, data, time_mandante, escudo_mandante,
        time_visitante, escudo_visitante, estadio,
        placar_mandante, placar_visitante, status
        FROM jogos
        WHERE rodada = ?
        ORDER BY data
    `,
      [rodada]
    );

    res.json(jogos);
  } catch (err) {
    console.error('Erro ao buscar jogos da rodada:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar jogos da rodada' });
  }
});

// Agenda de jogos: hoje, últimos N dias e próximos M dias (default 3) considerando horário de Manaus
router.get('/agenda', async (req, res) => {
  const diasPassados = Math.min(parseInt(req.query.diasPassados, 10) || 10, 30); // trava em 30 para segurança
  const diasFuturos = Math.min(parseInt(req.query.diasFuturos, 10) || 3, 15);

  try {
    const [jogos] = await pool.query(
      `
        SELECT 
          partida_id,
          rodada,
          data AS data_manaus,
          time_mandante,
          time_visitante,
          escudo_mandante,
          escudo_visitante,
          estadio,
          placar_mandante,
          placar_visitante,
          status
        FROM jogos
        WHERE DATE(data) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY data_manaus DESC
      `,
      [diasPassados, diasFuturos]
    );

    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' }); // yyyy-mm-dd

    const hoje = [];
    const proximos = [];
    const anteriores = [];

    jogos.forEach((j) => {
      const dataStr = new Date(j.data_manaus).toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
      const base = {
        partidaId: j.partida_id,
        rodada: j.rodada,
        data: j.data_manaus,
        timeMandante: j.time_mandante,
        timeVisitante: j.time_visitante,
        escudoMandante: j.escudo_mandante,
        escudoVisitante: j.escudo_visitante,
        estadio: j.estadio,
        placarMandante: j.placar_mandante,
        placarVisitante: j.placar_visitante,
        status: j.status
      };

      if (dataStr === hojeISO) hoje.push(base);
      else if (dataStr > hojeISO) proximos.push(base);
      else anteriores.push(base);
    });

    res.json({ hoje, proximos, anteriores });
  } catch (err) {
    console.error('Erro ao buscar agenda de jogos:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar agenda de jogos' });
  }
});

// Destaques: Brasil (agenda) + Mundo (ao vivo filtrado pelos principais campeonatos)
router.get('/agenda/destaques', async (req, res) => {
  const diasPassados = Math.min(parseInt(req.query.diasPassados, 10) || 10, 30);
  const diasFuturos = Math.min(parseInt(req.query.diasFuturos, 10) || 3, 15);
  const competicoesPrincipais = ['Brasileirão', 'Brasileirao', 'Série A', 'Serie A'];

  try {
    // Brasil: mesma lógica do /agenda
    const [jogos] = await pool.query(
      `
        SELECT 
          partida_id,
          rodada,
          data AS data_manaus,
          time_mandante,
          time_visitante,
          escudo_mandante,
          escudo_visitante,
          estadio,
          placar_mandante,
          placar_visitante,
          status
        FROM jogos
        WHERE DATE(data) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY data_manaus DESC
      `,
      [diasPassados, diasFuturos]
    );

    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
    const brasilHoje = [];
    const brasilProximos = [];
    const brasilAnteriores = [];

    jogos.forEach((j) => {
      const dataStr = new Date(j.data_manaus).toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
      const base = {
        partidaId: j.partida_id,
        rodada: j.rodada,
        data: j.data_manaus,
        timeMandante: j.time_mandante,
        timeVisitante: j.time_visitante,
        escudoMandante: j.escudo_mandante,
        escudoVisitante: j.escudo_visitante,
        estadio: j.estadio,
        placarMandante: j.placar_mandante,
        placarVisitante: j.placar_visitante,
        status: j.status
      };
      if (dataStr === hojeISO) brasilHoje.push(base);
      else if (dataStr > hojeISO) brasilProximos.push(base);
      else brasilAnteriores.push(base);
    });

    // Mundo: ao vivo filtrado
    let mundoAoVivo = [];
    try {
      const aoVivo = await buscarJogosAoVivoComFallback();
      mundoAoVivo = aoVivo
        .filter((j) => {
          const nome = (j.campeonato || '').toLowerCase();
          return competicoesPrincipais.some((c) => nome.includes(c.toLowerCase()));
        })
        .map((j) => ({
          campeonato: j.campeonato,
          status: j.status,
          timeMandante: j.timeCasa,
          timeVisitante: j.timeFora,
          escudoMandante: j.escudoCasa,
          escudoVisitante: j.escudoFora,
          placarMandante: j.placarCasa,
          placarVisitante: j.placarFora,
          horario: j.horario,
          local: j.local,
          idPartida: j.idPartida
        }));
    } catch (err) {
      console.error('Erro ao buscar ao vivo mundo:', err.message);
      mundoAoVivo = [];
    }

    res.json({
      brasil: { hoje: brasilHoje, proximos: brasilProximos, anteriores: brasilAnteriores },
      mundo: { aoVivo: mundoAoVivo }
    });
  } catch (err) {
    console.error('Erro ao buscar destaques de jogos:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar destaques de jogos' });
  }
});

// Agenda unificada: um quadro com ao vivo e agendados (Brasil + principais ligas do mundo)
router.get('/agenda/destaques/unificado', async (req, res) => {
  const diasPassados = Math.min(parseInt(req.query.diasPassados, 10) || 10, 30);
  const diasFuturos = Math.min(parseInt(req.query.diasFuturos, 10) || 3, 15);
  const competicoesPrincipais = [
    'Brasileirão', 'Brasileirao', 'Serie A', 'Série A', 'Premier League', 'La Liga',
    'Champions League', 'UEFA Champions League', 'Europa League', 'Bundesliga', 'DFB',
    'Ligue 1', 'Serie A TIM', 'Libertadores', 'Sudamericana', 'FA Cup', 'Copa do Brasil',
    'Copa do Rey', 'Coppa Italia'
  ];

  try {
    // Brasil (hoje/proximos)
    const [jogos] = await pool.query(
      `
        SELECT 
          partida_id,
          rodada,
          data AS data_manaus,
          time_mandante,
          time_visitante,
          escudo_mandante,
          escudo_visitante,
          estadio,
          placar_mandante,
          placar_visitante,
          status
        FROM jogos
        WHERE DATE(data) BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY data_manaus ASC
      `,
      [diasPassados, diasFuturos]
    );

    const hojeISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
    const listaUnificada = [];

    jogos.forEach((j) => {
      const dataStr = new Date(j.data_manaus).toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
      const status = j.status || (dataStr > hojeISO ? 'agendado' : 'encerrado');
      listaUnificada.push({
        origem: 'brasil',
        campeonato: 'Brasileirão Série A',
        partidaId: j.partida_id,
        rodada: j.rodada,
        data: j.data_manaus,
        timeMandante: j.time_mandante,
        timeVisitante: j.time_visitante,
        escudoMandante: j.escudo_mandante,
        escudoVisitante: j.escudo_visitante,
        estadio: j.estadio,
        placarMandante: j.placar_mandante,
        placarVisitante: j.placar_visitante,
        status
      });
    });

    // Mundo: desativado (somente api-futebol será usada; fontes externas removidas)

    // Ordena por data/hora ascendente, ao vivo primeiro
    listaUnificada.sort((a, b) => {
      const aoVivoA = (a.status || '').toLowerCase().includes('ao vivo') || (a.status || '').toLowerCase().includes('em_andamento');
      const aoVivoB = (b.status || '').toLowerCase().includes('ao vivo') || (b.status || '').toLowerCase().includes('em_andamento');
      if (aoVivoA && !aoVivoB) return -1;
      if (!aoVivoA && aoVivoB) return 1;
      const da = new Date(a.data || 0).getTime();
      const db = new Date(b.data || 0).getTime();
      return da - db;
    });

    res.json({ jogos: listaUnificada });
  } catch (err) {
    console.error('Erro ao montar agenda unificada:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar agenda unificada' });
  }
});

module.exports = router;
