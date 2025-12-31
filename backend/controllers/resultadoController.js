const pool = require('../database/conexao');
const { DateTime } = require('luxon');

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
    // **PRIORIDADE 1**: Busca primeira rodada com jogos PENDENTES (sem placar preenchido)
    try {
      const hasCampId = await ensureCampeonatoIdColumn();
      const sql = hasCampId
        ? `SELECT rodada FROM jogos 
           WHERE campeonato_id = ? AND placar_mandante IS NULL
           ORDER BY rodada ASC LIMIT 1`
        : `SELECT rodada FROM jogos 
           WHERE placar_mandante IS NULL
           ORDER BY rodada ASC LIMIT 1`;
      const params = hasCampId ? [campeonatoId] : [];
      const [pendentes] = await pool.query(sql, params);
      if (pendentes.length) {
        console.log(`[obterRodadaAtual] Encontrada rodada ${pendentes[0].rodada} com jogos pendentes`);
        return pendentes[0].rodada;
      }
    } catch (e) {
      console.warn('[obterRodadaAtual] Busca por pendentes falhou:', e.message);
    }

    // **PRIORIDADE 2**: Tenta rodadas_status com status 'andamento'
    try {
      const [p] = await pool.query(
        `SELECT rodada FROM rodadas_status
         WHERE campeonato_id = ? AND status = 'andamento'
         ORDER BY rodada ASC LIMIT 1`,
        [campeonatoId]
      );
      if (p.length) {
        console.log(`[obterRodadaAtual] Encontrada rodada ${p[0].rodada} com status 'andamento'`);
        return p[0].rodada;
      }
    } catch (e) {
      console.warn('[obterRodadaAtual] Busca em rodadas_status falhou:', e.message);
    }

    // **PRIORIDADE 3**: Tenta rodadas_status com status 'agendada' ou 'programada'
    try {
      const [p] = await pool.query(
        `SELECT rodada FROM rodadas_status
         WHERE campeonato_id = ? AND status IN ('agendada','programada')
         ORDER BY rodada ASC LIMIT 1`,
        [campeonatoId]
      );
      if (p.length) {
        console.log(`[obterRodadaAtual] Encontrada rodada ${p[0].rodada} com status 'agendada/programada'`);
        return p[0].rodada;
      }
    } catch (e) {
      console.warn('[obterRodadaAtual] Busca por agendada/programada falhou:', e.message);
    }

    // **PRIORIDADE 4**: Fallback para rodada_status (tabela alternativa)
    try {
      const [p2] = await pool.query(
        `SELECT rodada FROM rodada_status
         WHERE campeonato_id = ? AND status IN ('andamento','agendada','programada')
         ORDER BY rodada ASC LIMIT 1`,
        [campeonatoId]
      );
      if (p2.length) {
        console.log(`[obterRodadaAtual] Encontrada rodada ${p2[0].rodada} em rodada_status`);
        return p2[0].rodada;
      }
    } catch (e) {
      console.warn('[obterRodadaAtual] Busca em rodada_status falhou:', e.message);
    }

    // **ÚLTIMO RECURSO**: Busca maior rodada encerrada
    try {
      const [e] = await pool.query(
        `SELECT rodada FROM rodadas_status
         WHERE campeonato_id = ?
         ORDER BY rodada DESC LIMIT 1`,
        [campeonatoId]
      );
      if (e.length) {
        console.log(`[obterRodadaAtual] Usando rodada ${e[0].rodada} (encerrada)`);
        return e[0].rodada;
      }
    } catch (e) {
      console.warn('[obterRodadaAtual] Busca por encerrada falhou:', e.message);
    }
  }
  
  console.warn('[obterRodadaAtual] Nenhuma rodada encontrada para campeonato', campeonatoId);
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
      ? `SELECT id, partida_id, data, estadio,
           time_mandante, time_visitante,
           escudo_mandante, escudo_visitante,
           placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ? AND campeonato_id = ?
         ORDER BY data`
      : `SELECT id, partida_id, data, estadio,
           time_mandante, time_visitante,
           escudo_mandante, escudo_visitante,
           placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ?
         ORDER BY data`;

    const params = usaCampoCampeonato ? [rodadaVigente, campeonatoId] : [rodadaVigente];
    const [jogos] = await pool.query(sql, params);

    // Normaliza datas para America/Manaus e inclui string formatada
    const jogosFmt = jogos.map(j => {
      const dt = j.data ? DateTime.fromJSDate(j.data).setZone('America/Manaus') : null;
      return {
        ...j,
        data: dt ? dt.toISO({ suppressMilliseconds: true }) : null,
        data_formatada: dt ? dt.toFormat('dd/LL/yyyy HH:mm') : null
      };
    });

    res.json({ rodada: rodadaVigente, jogos: jogosFmt, campeonatoId });

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
      ? `SELECT id, partida_id, data, estadio,
           time_mandante, time_visitante,
           escudo_mandante, escudo_visitante,
           placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ? AND campeonato_id = ?
         ORDER BY data`
      : `SELECT id, partida_id, data, estadio,
           time_mandante, time_visitante,
           escudo_mandante, escudo_visitante,
           placar_mandante, placar_visitante, status
         FROM jogos
         WHERE rodada = ?
         ORDER BY data`;

    const params = usaCampoCampeonato ? [rodada, campeonatoId] : [rodada];
    const [jogos] = await pool.query(sql, params);

    // Normaliza datas para America/Manaus e inclui string formatada
    const jogosFmt = jogos.map(j => {
      const dt = j.data ? DateTime.fromJSDate(j.data).setZone('America/Manaus') : null;
      return {
        ...j,
        data: dt ? dt.toISO({ suppressMilliseconds: true }) : null,
        data_formatada: dt ? dt.toFormat('dd/LL/yyyy HH:mm') : null
      };
    });

    res.json({ rodada, jogos: jogosFmt, campeonatoId });

  } catch (err) {
    console.error('Erro ao buscar resultados da rodada:', err);
    res.status(500).json({ erro: 'Erro ao buscar resultados da rodada vigente.' });
  }
};
