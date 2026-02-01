const pool = require('../database/conexao');
const { calcularPontuacao } = require('./pontuacaoService');

/**
 * Processa e persiste pontos jogo a jogo para uma rodada/grupo/campeonato
 * @param {number} rodada
 * @param {number|null} campeonatoId
 * @param {number|null} grupoId
 * @returns {Promise<{processados:number, atualizados:number}>}
 */
async function processarRodadaJogoAJogo(rodada, campeonatoId = null, grupoId = null) {
  const rodadaNum = Number(rodada?.rodada || rodada);
  const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10; // padrão 10 conforme projeto
  const grupoFiltro = grupoId ? Number(grupoId) : null;

  const filtros = [
    'p.rodada = ?',
    'j.placar_mandante IS NOT NULL',
    'j.placar_visitante IS NOT NULL',
    'p.campeonato_id = ?',
    'j.campeonato_id = ?'
  ];
  const params = [rodadaNum, campeonatoFiltro, campeonatoFiltro];

  if (grupoFiltro) {
    filtros.push('p.grupo_id = ?');
    params.push(grupoFiltro);
  }

  const [linhas] = await pool.query(`
    SELECT 
      p.id_usuario AS usuario_id,
      p.id_jogo,
      p.gols_casa AS placar_casa,
      p.gols_fora AS placar_fora,
      p.grupo_id,
      p.campeonato_id,
      p.rodada,
      j.partida_id,
      j.placar_mandante,
      j.placar_visitante
    FROM palpites p
    JOIN jogos j ON j.id = p.id_jogo
    WHERE ${filtros.join(' AND ')}
  `, params);

  let processados = 0;
  let atualizados = 0;

  for (const r of linhas) {
    processados++;

    const palpite = { placar_casa: r.placar_casa, placar_fora: r.placar_fora };
    const resultado = { placar_mandante: r.placar_mandante, placar_visitante: r.placar_visitante };
    const pontos = calcularPontuacao(palpite, resultado);

    // flags opcionais
    const acerto_exato = (r.placar_casa === r.placar_mandante) && (r.placar_fora === r.placar_visitante) ? 1 : 0;
    const vencedorPalpite = r.placar_casa > r.placar_fora ? 'mandante' : r.placar_casa < r.placar_fora ? 'visitante' : 'empate';
    const vencedorReal = r.placar_mandante > r.placar_visitante ? 'mandante' : r.placar_mandante < r.placar_visitante ? 'visitante' : 'empate';
    const vencedor_correto = (vencedorPalpite === vencedorReal && vencedorReal !== 'empate') ? 1 : 0;
    const gols_casa_corretos = (r.placar_casa === r.placar_mandante) ? 1 : 0;
    const gols_fora_corretos = (r.placar_fora === r.placar_visitante) ? 1 : 0;

    try {
      const [result] = await pool.query(`
        INSERT INTO ranking_pontos_partida
          (grupo_id, campeonato_id, rodada, partida_id, usuario_id, pontos, acerto_exato, vencedor_correto, gols_casa_corretos, gols_fora_corretos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pontos = VALUES(pontos),
          acerto_exato = VALUES(acerto_exato),
          vencedor_correto = VALUES(vencedor_correto),
          gols_casa_corretos = VALUES(gols_casa_corretos),
          gols_fora_corretos = VALUES(gols_fora_corretos),
          updated_at = CURRENT_TIMESTAMP
      `, [
        r.grupo_id || grupoFiltro,
        r.campeonato_id || campeonatoFiltro,
        r.rodada || rodadaNum,
        r.partida_id,
        r.usuario_id,
        Number(pontos.toFixed(2)),
        acerto_exato,
        vencedor_correto,
        gols_casa_corretos,
        gols_fora_corretos
      ]);
      if (result.affectedRows > 0) atualizados++;
    } catch (err) {
      console.error('❌ Erro ao persistir ranking_pontos_partida:', err.message);
    }
  }

  console.log(`📊 ranking_pontos_partida: rodada ${rodadaNum} processada. Registros: ${processados}, atualizados: ${atualizados}`);
  return { processados, atualizados };
}

/**
 * Agrega por rodada com paginação
 * Busca dados de ranking_pontos_partida e agrupa por usuário
 */
async function obterRankingRodadaAggregado({ grupoId, campeonatoId = null, rodada, limit = 20, offset = 0 }) {
  const rodadaNum = Number(rodada);
  const grupoFiltro = grupoId ? Number(grupoId) : null;
  const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10;

  const where = ['r.rodada = ?'];
  const params = [rodadaNum];

  where.push('r.campeonato_id = ?');
  params.push(campeonatoFiltro);

  // Se grupo foi especificado, filtrar por esse grupo
  if (grupoFiltro && grupoFiltro > 0) {
    where.push('r.grupo_id = ?');
    params.push(grupoFiltro);
  }

  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(`
    SELECT r.usuario_id,
           u.nome AS nome_apostador,
           SUM(r.pontos) AS pontos_totais,
           SUM(r.acerto_exato) AS acertos_exatos,
           SUM(r.vencedor_correto) AS vencedores_corretos
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE ${where.join(' AND ')}
    GROUP BY r.usuario_id, u.nome
    ORDER BY pontos_totais DESC, acertos_exatos DESC, vencedores_corretos DESC
    LIMIT ? OFFSET ?
  `, params);

  // Retornar com posição corrigida para offset
  return rows.map((row, idx) => ({
    posicao: offset + idx + 1,
    id_usuario: row.usuario_id,
    nome_apostador: row.nome_apostador,
    pontos_totais: Number(row.pontos_totais),
    acertos_exatos: Number(row.acertos_exatos || 0),
    vencedores_corretos: Number(row.vencedores_corretos || 0)
  }));
}

/**
 * Resume quantas vezes cada usuário foi campeão, vice e lanterna por rodada
 */
async function obterResumoPosicoes({ grupoId, campeonatoId = null, rodadaFinal }) {
  const grupoFiltro = Number(grupoId);
  const rodadaMax = Number(rodadaFinal);
  const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10; // padrão 10

  const where = ['r.grupo_id = ?', 'r.campeonato_id = ?', 'r.rodada BETWEEN 1 AND ?'];
  const params = [grupoFiltro, campeonatoFiltro, rodadaMax];

  const [rows] = await pool.query(`
    SELECT r.rodada,
           r.usuario_id,
           u.nome AS nome_apostador,
           ROUND(SUM(r.pontos), 2) AS pontos_totais
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE ${where.join(' AND ')}
    GROUP BY r.rodada, r.usuario_id, u.nome
    ORDER BY r.rodada ASC, pontos_totais DESC
  `, params);

  const campeaoCount = new Map();
  const viceCount = new Map();
  const lanternaCount = new Map();

  const pushCount = (mapa, row, chave) => {
    if (!mapa.has(row.usuario_id)) {
      mapa.set(row.usuario_id, { id_usuario: row.usuario_id, nome: row.nome_apostador, campeao: 0, vice: 0, lanterna: 0 });
    }
    const entry = mapa.get(row.usuario_id);
    entry[chave] += 1;
  };

  const porRodada = new Map();
  for (const r of rows) {
    if (!porRodada.has(r.rodada)) porRodada.set(r.rodada, []);
    porRodada.get(r.rodada).push(r);
  }

  for (const rodada of porRodada.keys()) {
    const lista = porRodada.get(rodada) || [];
    if (lista.length === 0) continue;

    lista.sort((a, b) => Number(b.pontos_totais) - Number(a.pontos_totais));

    const maxPontos = Number(lista[0].pontos_totais);
    const minPontos = Number(lista[lista.length - 1].pontos_totais);

    const campeoes = lista.filter(l => Number(l.pontos_totais) === maxPontos);
    campeoes.forEach(c => pushCount(campeaoCount, c, 'campeao'));

    const distinctDesc = [...new Set(lista.map(l => Number(l.pontos_totais)))].sort((a, b) => b - a);
    const vicePontos = distinctDesc.find(v => v < maxPontos);
    if (vicePontos !== undefined) {
      const vices = lista.filter(l => Number(l.pontos_totais) === vicePontos);
      vices.forEach(v => pushCount(viceCount, v, 'vice'));
    }

    const lanternas = lista.filter(l => Number(l.pontos_totais) === minPontos);
    lanternas.forEach(l => pushCount(lanternaCount, l, 'lanterna'));
  }

  const campeoesArray = Array.from(campeaoCount.values()).map(item => ({
    id_usuario: item.id_usuario,
    nome: item.nome,
    campeao: item.campeao,
    vice: viceCount.get(item.id_usuario)?.vice || 0
  })).sort((a, b) => b.campeao - a.campeao || b.vice - a.vice || a.nome.localeCompare(b.nome));

  const lanternasArray = Array.from(lanternaCount.values()).sort((a, b) => b.lanterna - a.lanterna || a.nome.localeCompare(b.nome));

  return { campeoes: campeoesArray, lanternas: lanternasArray };
}

/**
 * Agrega geral acumulado até a rodadaFinal
 */
async function obterRankingGeralAggregado({ grupoId, campeonatoId = null, rodadaFinal, limit = 20, offset = 0 }) {
  const grupoFiltro = Number(grupoId);
  const rodadaMax = Number(rodadaFinal);
  const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10; // padrão 10 (Brasileirão)

  const where = ['r.grupo_id = ?', 'r.campeonato_id = ?', 'r.rodada BETWEEN 1 AND ?'];
  const params = [grupoFiltro, campeonatoFiltro, rodadaMax];

  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(`
    SELECT r.usuario_id,
           u.nome AS nome_apostador,
           ROUND(SUM(r.pontos), 2) AS pontos_totais,
           SUM(r.acerto_exato) AS acertos_exatos,
           SUM(r.vencedor_correto) AS vencedores_corretos
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE ${where.join(' AND ')}
    GROUP BY r.usuario_id, u.nome
    ORDER BY pontos_totais DESC, acertos_exatos DESC, vencedores_corretos DESC
    LIMIT ? OFFSET ?
  `, params);

  return rows.map((row, idx) => ({
    posicao: offset + idx + 1,
    id_usuario: row.usuario_id,
    nome_apostador: row.nome_apostador,
    pontos_totais: Number(row.pontos_totais),
    acertos_exatos: Number(row.acertos_exatos || 0),
    vencedores_corretos: Number(row.vencedores_corretos || 0)
  }));
}

/**
 * Obtém estatísticas completas de ranking para os 5 grids:
 * 1. Top 4 com mais acertos de placar exato (G4)
 * 2. Top 4 com mais acertos de vitórias (G4)
 * 3. Top 4 com mais acertos de gols (G4)
 * 4. Top 4 com mais W.Os (Z4)
 * 5. Top 4 com mais zeros por jogo (Z4)
 */
async function obterEstatisticasRanking({ grupoId, campeonatoId = null, rodadaFinal }) {
  const grupoFiltro = Number(grupoId);
  const rodadaMax = Number(rodadaFinal);
  const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10;

  // ==================== 1. PLACAR EXATO ====================
  const [placarExato] = await pool.query(`
    SELECT 
      u.id,
      u.nome,
      SUM(r.acerto_exato) AS acertos
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.grupo_id = ?
      AND r.campeonato_id = ?
      AND r.rodada BETWEEN 1 AND ?
    GROUP BY u.id, u.nome
    ORDER BY acertos DESC
    LIMIT 4
  `, [grupoFiltro, campeonatoFiltro, rodadaMax]);

  // ==================== 2. VITÓRIAS ====================
  const [vitorias] = await pool.query(`
    SELECT 
      u.id,
      u.nome,
      SUM(r.vencedor_correto) AS acertos
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.grupo_id = ?
      AND r.campeonato_id = ?
      AND r.rodada BETWEEN 1 AND ?
    GROUP BY u.id, u.nome
    ORDER BY acertos DESC
    LIMIT 4
  `, [grupoFiltro, campeonatoFiltro, rodadaMax]);

  // ==================== 3. GOLS (CASA OU FORA) ====================
  const [gols] = await pool.query(`
    SELECT 
      u.id,
      u.nome,
      SUM(CASE WHEN r.gols_casa_corretos = 1 OR r.gols_fora_corretos = 1 THEN 1 ELSE 0 END) AS acertos
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.grupo_id = ?
      AND r.campeonato_id = ?
      AND r.rodada BETWEEN 1 AND ?
    GROUP BY u.id, u.nome
    ORDER BY acertos DESC
    LIMIT 4
  `, [grupoFiltro, campeonatoFiltro, rodadaMax]);

  // ==================== 4. W.O (WALK OVER) ====================
  // Contar: (10 jogos × rodadas com placar) - quantidade de palpites por usuário
  // Apenas rodadas que têm pelo menos UM jogo com placar entram no cálculo
  const [jogosCount] = await pool.query(`
    SELECT 
      COUNT(DISTINCT rodada) AS total_rodadas
    FROM jogos
    WHERE campeonato_id = ?
      AND rodada BETWEEN 1 AND ?
      AND placar_mandante IS NOT NULL
  `, [campeonatoFiltro, rodadaMax]);

  const totalRodadas = jogosCount.length > 0 ? jogosCount[0].total_rodadas : 1;
  
  const [wo] = await pool.query(`
    SELECT 
      u.id,
      u.nome,
      (? * ?) - COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS wos
    FROM usuarios u
    LEFT JOIN palpites p ON p.id_usuario = u.id
      AND p.campeonato_id = ?
      AND p.rodada BETWEEN 1 AND ?
      AND p.grupo_id = ?
    WHERE u.id IN (
      SELECT DISTINCT id_usuario FROM palpites 
      WHERE grupo_id = ? AND campeonato_id = ?
    )
    GROUP BY u.id, u.nome
    HAVING wos > 0
    ORDER BY wos DESC
    LIMIT 4
  `, [10, totalRodadas, campeonatoFiltro, rodadaMax, grupoFiltro, grupoFiltro, campeonatoFiltro]);

  // ==================== 5. ZERO PONTOS ====================
  const [zeros] = await pool.query(`
    SELECT 
      u.id,
      u.nome,
      SUM(CASE WHEN r.pontos = 0 THEN 1 ELSE 0 END) AS zeros
    FROM ranking_pontos_partida r
    JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.grupo_id = ?
      AND r.campeonato_id = ?
      AND r.rodada BETWEEN 1 AND ?
    GROUP BY u.id, u.nome
    ORDER BY zeros DESC
    LIMIT 4
  `, [grupoFiltro, campeonatoFiltro, rodadaMax]);

  return {
    placarExato: placarExato.map((row, idx) => ({
      posicao: idx + 1,
      id_usuario: row.id,
      nome: row.nome,
      acertos: Number(row.acertos || 0)
    })),
    vitorias: vitorias.map((row, idx) => ({
      posicao: idx + 1,
      id_usuario: row.id,
      nome: row.nome,
      acertos: Number(row.acertos || 0)
    })),
    gols: gols.map((row, idx) => ({
      posicao: idx + 1,
      id_usuario: row.id,
      nome: row.nome,
      acertos: Number(row.acertos || 0)
    })),
    wo: wo.map((row, idx) => ({
      posicao: idx + 1,
      id_usuario: row.id,
      nome: row.nome,
      acertos: Number(row.wos || 0)
    })),
    zeros: zeros.map((row, idx) => ({
      posicao: idx + 1,
      id_usuario: row.id,
      nome: row.nome,
      acertos: Number(row.zeros || 0)
    }))
  };
}

/**
 * ✅ NOVO: Atualiza os grids de ranking para TODOS os grupos após processar resultados
 * Chamado automaticamente quando uma rodada é processada
 * @param {number} rodada - Número da rodada processada
 */
async function atualizarGridsTodosGrupos(rodada) {
  try {
    // Buscar todos os grupos que têm palpites nesta rodada
    const [grupos] = await pool.query(`
      SELECT DISTINCT grupo_id FROM palpites WHERE rodada = ? AND grupo_id IS NOT NULL
    `, [rodada]);

    if (grupos.length === 0) {
      console.log(`📊 Nenhum grupo com palpites na rodada ${rodada}`);
      return;
    }

    console.log(`📊 Atualizando grids para ${grupos.length} grupo(s) na rodada ${rodada}...`);

    for (const { grupo_id } of grupos) {
      try {
        // Simplesmente chamar obterEstatisticasRanking
        // Ele tira os dados diretamente da tabela ranking_pontos_partida
        // que já foi atualizada por processarRodadaJogoAJogo
        const stats = await obterEstatisticasRanking(grupo_id, 10, rodada);
        console.log(`  ✅ Grupo ${grupo_id}: ${stats.placarExato.length} + ${stats.vitorias.length} + ${stats.gols.length} + ${stats.wo.length} + ${stats.zeros.length} grids atualizados`);
      } catch (err) {
        console.error(`  ❌ Erro ao atualizar grids do grupo ${grupo_id}:`, err.message);
      }
    }

    console.log(`✅ Todos os grids atualizados para a rodada ${rodada}`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar grids de todos os grupos:`, err.message);
  }
}

module.exports = {
  processarRodadaJogoAJogo,
  obterRankingRodadaAggregado,
  obterRankingGeralAggregado,
  obterResumoPosicoes,
  obterEstatisticasRanking,
  atualizarGridsTodosGrupos
};
