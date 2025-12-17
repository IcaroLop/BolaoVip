const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');

async function calcularRankingRodada(rodada, campeonatoId = null, grupoId = null) {
  try {
    const rodadaNum = Number(rodada?.rodada || rodada);
    if (isNaN(rodadaNum) || rodadaNum <= 0) {
      console.error(`❌ Rodada inválida recebida em calcularRankingRodada:`, rodada);
      return;
    }

    const campeonatoIdNum = campeonatoId ? Number(campeonatoId) : null;
    const campeonatoFiltro = campeonatoIdNum || 10;
    const grupoIdNum = grupoId ? Number(grupoId) : null;

    console.log(`⚙️ Calculando ranking da rodada ${rodadaNum}...`);

    // Não calcular ranking se não houver nenhum jogo finalizado na rodada
    const [jogosFinalizados] = await pool.query(
      `SELECT COUNT(*) AS qtd
       FROM jogos
       WHERE rodada = ?
         ${campeonatoFiltro ? 'AND campeonato_id = ?' : ''}
         AND placar_mandante IS NOT NULL
         AND placar_visitante IS NOT NULL`,
      campeonatoFiltro ? [rodadaNum, campeonatoFiltro] : [rodadaNum]
    );
    if ((jogosFinalizados[0]?.qtd || 0) === 0) {
      console.warn(`⚠️ Rodada ${rodadaNum}: nenhum jogo finalizado. Ranking não será calculado.`);
      return;
    }

    const filtros = [
      'p.rodada = ?',
      `(j.status = 'finalizado' OR j.status = 'andamento')`
    ];
    const params = [rodadaNum];

    filtros.push('(p.campeonato_id = ? OR p.campeonato_id IS NULL)');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('(p.grupo_id = ? OR p.grupo_id IS NULL)');
      params.push(grupoIdNum);
    }

    const [palpites] = await pool.query(`
      SELECT p.id_usuario, p.id_jogo, p.gols_casa AS placar_casa, p.gols_fora AS placar_fora,
             j.placar_mandante, j.placar_visitante
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.partida_id
      WHERE ${filtros.join(' AND ')}
    `, params);

    const pontuacaoPorUsuario = {};

    palpites.forEach(p => {
      if (!pontuacaoPorUsuario[p.id_usuario]) pontuacaoPorUsuario[p.id_usuario] = 0;

      if (p.placar_mandante !== null && p.placar_visitante !== null) {
        const palpite = { placar_casa: p.placar_casa, placar_fora: p.placar_fora };
        const resultado = { placar_mandante: p.placar_mandante, placar_visitante: p.placar_visitante };
        const pontos = calcularPontuacao(palpite, resultado);
        pontuacaoPorUsuario[p.id_usuario] += pontos;
      }
    });

    const rankingArray = Object.entries(pontuacaoPorUsuario)
      .map(([id_usuario, pontosTotais]) => ({
        id_usuario: Number(id_usuario),
        pontosTotais: Number(pontosTotais.toFixed(2))
      }))
      .sort((a, b) => b.pontosTotais - a.pontosTotais);

    let posicao = 1;
    for (const r of rankingArray) {
      await pool.query(`
        INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, grupo_id, pontos_totais, posicao)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          campeonato_id = VALUES(campeonato_id),
          grupo_id = VALUES(grupo_id),
          pontos_totais = VALUES(pontos_totais),
          posicao = VALUES(posicao)
      `, [r.id_usuario, rodadaNum, campeonatoFiltro, grupoIdNum, r.pontosTotais, posicao]);
      posicao++;
    }

    console.log(`✅ Ranking da rodada ${rodadaNum} calculado e salvo com sucesso.`);
  } catch (err) {
    console.error(`❌ Erro ao calcular ranking da rodada ${rodada}:`, err.message);
  }
}

async function getRankingRodada(rodada, campeonatoId = null, grupoId = null) {
  try {
    const rodadaNum = Number(rodada?.rodada || rodada);
    const campeonatoIdNum = campeonatoId ? Number(campeonatoId) : null;
    const campeonatoFiltro = campeonatoIdNum || 10;
    const grupoIdNum = grupoId ? Number(grupoId) : null;

    // Garantir que só retornamos ranking de rodadas com jogos finalizados
    const [jogosFinalizados] = await pool.query(
      `SELECT COUNT(*) AS qtd
       FROM jogos
       WHERE rodada = ?
         ${campeonatoFiltro ? 'AND campeonato_id = ?' : ''}
         AND placar_mandante IS NOT NULL
         AND placar_visitante IS NOT NULL`,
      campeonatoFiltro ? [rodadaNum, campeonatoFiltro] : [rodadaNum]
    );
    if ((jogosFinalizados[0]?.qtd || 0) === 0) {
      return [];
    }

    const filtros = ['r.rodada = ?'];
    const params = [rodadaNum];

    filtros.push('(r.campeonato_id = ? OR r.campeonato_id IS NULL)');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('(r.grupo_id = ? OR r.grupo_id IS NULL)');
      params.push(grupoIdNum);
    }

    const [ranking] = await pool.query(`
      SELECT DISTINCT r.posicao, u.id as id_usuario, u.nome AS nome_apostador, r.pontos_totais
      FROM ranking_rodada r
      JOIN usuarios u ON r.id_usuario = u.id
      WHERE ${filtros.join(' AND ')}
      ORDER BY r.posicao ASC
    `, params);

    return ranking;
  } catch (err) {
    console.error(`❌ Erro ao buscar ranking da rodada ${rodada}:`, err.message);
    throw err;
  }
}

async function gerarPremiacoesRodada(rodada, campeonatoId = null, grupoId = null) {
  try {
    const rodadaNum = Number(rodada?.rodada || rodada);
    const campeonatoIdNum = campeonatoId ? Number(campeonatoId) : null;
    const campeonatoFiltro = campeonatoIdNum || 10;
    const grupoIdNum = grupoId ? Number(grupoId) : null;

    console.log(`🏆 Gerando premiações para a rodada ${rodadaNum}${campeonatoIdNum ? ` (campeonato ${campeonatoIdNum})` : ''}${grupoIdNum ? ` grupo ${grupoIdNum}` : ''}...`);

    const filtros = ['rodada = ?'];
    const params = [rodadaNum];

    filtros.push('(campeonato_id = ? OR campeonato_id IS NULL)');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
      params.push(grupoIdNum);
    }

    const [ranking] = await pool.query(`
      SELECT id_usuario, pontos_totais FROM ranking_rodada
      WHERE ${filtros.join(' AND ')}
      ORDER BY pontos_totais DESC
    `, params);

    if (ranking.length < 3) {
      console.warn(`⚠️ Rodada ${rodadaNum}: ranking insuficiente para gerar premiações.`);
      return;
    }

    const campeaoId = ranking[0].id_usuario;
    const viceId = ranking[1].id_usuario;
    const lanternaId = ranking[ranking.length - 1].id_usuario;

    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(c.valor_original), 0) AS total
        FROM pix_cobrancas c
        WHERE c.status_pagamento = 'PAGO'
        AND EXISTS (
          SELECT 1 FROM palpites p
          WHERE p.codigo_envio = c.codigo_envio AND p.rodada = ?
          AND (p.campeonato_id = ? OR p.campeonato_id IS NULL)
          ${grupoIdNum ? 'AND (p.grupo_id = ? OR p.grupo_id IS NULL)' : ''}
          )
      `, grupoIdNum ? [rodadaNum, campeonatoFiltro, grupoIdNum] : [rodadaNum, campeonatoFiltro]);


    const totalPremio = Number(rows[0]?.total) || 0;
    const valorVice = 10.00;
    const valorLanterna = -20.00;
    const valorCampeao = Math.max(totalPremio - valorVice, 0);
    //const valorCampeao = 100.00;

    const filtroPremios = ['rodada = ?'];
    const paramsPremios = [rodadaNum];

    filtroPremios.push('(campeonato_id = ? OR campeonato_id IS NULL)');
    paramsPremios.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtroPremios.push('(grupo_id = ? OR grupo_id IS NULL)');
      paramsPremios.push(grupoIdNum);
    }

    await pool.query(`DELETE FROM premios WHERE ${filtroPremios.join(' AND ')}`, paramsPremios);

    await pool.query(`
      INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento)
      VALUES (?, ?, ?, ?, 'campeao', ?, 'pendente')
    `, [campeaoId, rodadaNum, campeonatoFiltro, grupoIdNum, valorCampeao]);

    await pool.query(`
      INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento)
      VALUES (?, ?, ?, ?, 'vice', ?, 'pendente')
    `, [viceId, rodadaNum, campeonatoFiltro, grupoIdNum, valorVice]);

    await pool.query(`
      INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento)
      VALUES (?, ?, ?, ?, 'lanterna', ?, 'pendente')
    `, [lanternaId, rodadaNum, campeonatoFiltro, grupoIdNum, valorLanterna]);

    console.log(`✅ Premiações da rodada ${rodadaNum} geradas com sucesso.`);
  } catch (error) {
    console.error(`❌ Erro ao gerar premiações da rodada ${rodada}:`, error.message);
  }
}

async function calcularRankingGeral(req, res) {
  try {
    const [jogos] = await pool.query(`
      SELECT partida_id, placar_mandante, placar_visitante
      FROM jogos
      WHERE placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL
    `);

    const resultados = {};
    jogos.forEach(j => {
      resultados[j.partida_id] = {
        placar_mandante: j.placar_mandante,
        placar_visitante: j.placar_visitante
      };
    });

    const [palpites] = await pool.query(`
      SELECT p.id_usuario, u.nome AS nome_usuario, p.id_jogo, p.gols_casa, p.gols_fora
      FROM palpites p
      JOIN usuarios u ON u.id = p.id_usuario
    `);

    const pontuacoes = {};

    palpites.forEach(p => {
      const resultado = resultados[p.id_jogo];
      if (!resultado) return;

      const pontos = calcularPontuacao(
        { placar_casa: p.gols_casa, placar_fora: p.gols_fora },
        resultado
      );

      if (!pontuacoes[p.id_usuario]) {
        pontuacoes[p.id_usuario] = { nome: p.nome_usuario, pontos: 0 };
      }

      pontuacoes[p.id_usuario].pontos += pontos;
    });

    const ranking = Object.entries(pontuacoes)
      .map(([id_usuario, dados]) => ({
        id_usuario: Number(id_usuario),
        nome: dados.nome,
        pontos: Number(dados.pontos.toFixed(2))
      }))
      .sort((a, b) => b.pontos - a.pontos);

    res.json(ranking);
  } catch (err) {
    console.error('Erro ao calcular ranking geral:', err.message);
    res.status(500).json({ erro: 'Erro ao calcular ranking geral' });
  }
}

module.exports = {
  calcularRankingRodada,
  gerarPremiacoesRodada,
  calcularRankingGeral,
  getRankingRodada
};
