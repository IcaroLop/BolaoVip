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
 */
async function obterRankingRodadaAggregado({ grupoId, campeonatoId = null, rodada, limit = 20, offset = 0 }) {
  const rodadaNum = Number(rodada);
  const grupoFiltro = grupoId ? Number(grupoId) : null;

  const where = ['rd.numero = ?'];
  const params = [rodadaNum];

  if (campeonatoId) {
    where.push('r.campeonato_id = ?');
    params.push(Number(campeonatoId));
  }

  // Compatibilidade: se um grupo foi selecionado, aceitar registros do grupo ou gerais (NULL).
  // Isso cobre rodadas antigas (grupo_id=2) e novas (grupo_id=NULL).
  if (grupoFiltro && grupoFiltro > 0) {
    where.push('(r.grupo_id = ? OR r.grupo_id IS NULL)');
    params.push(grupoFiltro);
  } else {
    // Sem grupo selecionado, retornar registros gerais e do grupo 2 (compatibilidade).
    where.push('(r.grupo_id IS NULL OR r.grupo_id = 2)');
  }

  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(`
    SELECT r.id_usuario AS usuario_id,
           u.nome AS nome_apostador,
           r.pontos_totais,
           r.posicao
    FROM ranking_rodada r
    JOIN usuarios u ON u.id = r.id_usuario
    JOIN rodadas rd ON r.rodada = rd.id
    WHERE ${where.join(' AND ')}
    ORDER BY r.posicao ASC
    LIMIT ? OFFSET ?
  `, params);

  // Retornar com posição corrigida para offset
  return rows.map((row, idx) => ({
    posicao: offset + idx + 1,
    id_usuario: row.usuario_id,
    nome_apostador: row.nome_apostador,
    pontos_totais: Number(row.pontos_totais),
    acertos_exatos: 0,
    vencedores_corretos: 0
  }));
}

/**
 * Resume quantas vezes cada usuário foi campeão, vice e lanterna por rodada
 */
async function obterResumoPosicoes({ grupoId, campeonatoId = null, rodadaFinal }) {
  const grupoFiltro = Number(grupoId);
  const rodadaMax = Number(rodadaFinal);

  const where = ['r.grupo_id = ?', 'r.rodada BETWEEN 1 AND ?'];
  const params = [grupoFiltro, rodadaMax];
  if (campeonatoId) {
    where.push('r.campeonato_id = ?');
    params.push(Number(campeonatoId));
  }

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

  const where = ['r.grupo_id = ?', 'r.rodada BETWEEN 1 AND ?'];
  const params = [grupoFiltro, rodadaMax];

  if (campeonatoId) {
    where.push('r.campeonato_id = ?');
    params.push(Number(campeonatoId));
  }

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

module.exports = {
  processarRodadaJogoAJogo,
  obterRankingRodadaAggregado,
  obterRankingGeralAggregado,
  obterResumoPosicoes
};
