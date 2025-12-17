const pool = require('../database/conexao');

let hasCampeonatoIdColumn = null;

async function ensureCampeonatoIdColumn() {
  if (hasCampeonatoIdColumn !== null) return hasCampeonatoIdColumn;
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jogos' AND COLUMN_NAME = 'campeonato_id'`
  );
  hasCampeonatoIdColumn = cols[0]?.qtd > 0;
  return hasCampeonatoIdColumn;
}

async function obterCampeonatoIdPorGrupo(grupoId) {
  if (!grupoId) return null;
  const [grupos] = await pool.query('SELECT campeonato_id FROM grupos WHERE id = ?', [grupoId]);
  return grupos[0]?.campeonato_id || null;
}

async function obterRodadaAtual(campeonatoId) {
  if (campeonatoId) {
    // Tenta primeiro na tabela 'rodadas_status'; se não existir, usa 'rodada_status'
    let preferenciais = [];
    try {
      const [p] = await pool.query(
        `SELECT rodada FROM rodadas_status
         WHERE campeonato_id = ? AND status IN ('andamento','agendada','programada')
         ORDER BY rodada ASC LIMIT 1`,
        [campeonatoId]
      );
      preferenciais = p;
    } catch (e) {
      const [p2] = await pool.query(
        `SELECT rodada FROM rodada_status
         WHERE campeonato_id = ? AND status IN ('andamento','agendada','programada')
         ORDER BY rodada ASC LIMIT 1`,
        [campeonatoId]
      );
      preferenciais = p2;
    }
    if (preferenciais.length) return preferenciais[0].rodada;
    let encerradas = [];
    try {
      const [e] = await pool.query(
        `SELECT rodada FROM rodadas_status
         WHERE campeonato_id = ?
         ORDER BY rodada DESC LIMIT 1`,
        [campeonatoId]
      );
      encerradas = e;
    } catch (e) {
      const [e2] = await pool.query(
        `SELECT rodada FROM rodada_status
         WHERE campeonato_id = ?
         ORDER BY rodada DESC LIMIT 1`,
        [campeonatoId]
      );
      encerradas = e2;
    }
    if (encerradas.length) return encerradas[0].rodada;
  }
  // Sem fallback em 'jogos': quando não houver status em rodada_status/rodadas_status
  // para o campeonato informado, retornamos null para indicar ausência de rodada vigente.
  return null;
}

exports.buscarResultadosRodadaVigente = async (req, res) => {
  try {
    const grupoId = req.query.grupoId ? parseInt(req.query.grupoId, 10) : null;
    const campeonatoIdParam = req.query.campeonatoId ? parseInt(req.query.campeonatoId, 10) : null;

    // Validar que pelo menos um identificador foi fornecido
    if (!grupoId && !campeonatoIdParam) {
      return res.status(400).json({ erro: 'grupoId ou campeonatoId é obrigatório.' });
    }

    const campeonatoId = campeonatoIdParam || (grupoId ? await obterCampeonatoIdPorGrupo(grupoId) : null);
    const rodadaVigente = await obterRodadaAtual(campeonatoId);

    if (!rodadaVigente) {
      // Retorna 200 com rodada=null para permitir navegação manual no frontend
      return res.status(200).json({ rodada: null, jogos: [], campeonatoId });
    }

    const usaCampoCampeonato = campeonatoId ? await ensureCampeonatoIdColumn() : false;

    const sql = usaCampoCampeonato
      ? `SELECT partida_id, data, estadio,
               time_mandante, time_visitante,
               escudo_mandante, escudo_visitante,
               placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ? AND campeonato_id = ?
         ORDER BY data`
      : `SELECT partida_id, data, estadio,
               time_mandante, time_visitante,
               escudo_mandante, escudo_visitante,
               placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ?
         ORDER BY data`;

    const params = usaCampoCampeonato ? [rodadaVigente, campeonatoId] : [rodadaVigente];
    const [jogos] = await pool.query(sql, params);

    res.json({ rodada: rodadaVigente, jogos, campeonatoId });

  } catch (err) {
    console.error('Erro ao buscar resultados da rodada:', err);
    res.status(500).json({ erro: 'Erro ao buscar resultados da rodada vigente.' });
  }
};

exports.buscarResultadosRodada = async (req, res) => {
  try {
    const rodada = parseInt(req.params.rodada, 10);
    const grupoId = req.query.grupoId ? parseInt(req.query.grupoId, 10) : null;
    const campeonatoIdParam = req.query.campeonatoId ? parseInt(req.query.campeonatoId, 10) : null;

    // Validar que pelo menos um identificador foi fornecido
    if (!grupoId && !campeonatoIdParam) {
      return res.status(400).json({ erro: 'grupoId ou campeonatoId é obrigatório.' });
    }

    const campeonatoId = campeonatoIdParam || (grupoId ? await obterCampeonatoIdPorGrupo(grupoId) : null);

    const usaCampoCampeonato = campeonatoId ? await ensureCampeonatoIdColumn() : false;

    const sql = usaCampoCampeonato
      ? `SELECT partida_id, data, estadio,
               time_mandante, time_visitante,
               escudo_mandante, escudo_visitante,
               placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ? AND campeonato_id = ?
         ORDER BY data`
      : `SELECT partida_id, data, estadio,
               time_mandante, time_visitante,
               escudo_mandante, escudo_visitante,
               placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ?
         ORDER BY data`;

    const params = usaCampoCampeonato ? [rodada, campeonatoId] : [rodada];
    const [jogos] = await pool.query(sql, params);

    res.json({ rodada, jogos, campeonatoId });

  } catch (err) {
    console.error('Erro ao buscar resultados da rodada:', err);
    res.status(500).json({ erro: 'Erro ao buscar resultados da rodada vigente.' });
  }
};
