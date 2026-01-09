const pool = require('../database/conexao');

async function getPremiacoesComDetalhesRodada(req, res) {
  try {
    const { rodada } = req.params;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;
    const grupoId = req.query.grupoId || req.query.grupo_id;

    const filtros = ['rodada = ?'];
    const params = [rodada];

    if (campeonatoId) {
      filtros.push('(campeonato_id = ? OR campeonato_id IS NULL)');
      params.push(Number(campeonatoId));
    }

    if (grupoId) {
      filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
      params.push(Number(grupoId));
    }

    // Buscar configuração de premiações
    const [premiacoes] = await pool.query(`
      SELECT DISTINCT tipo_premio, valor, status_pagamento
      FROM premios
      WHERE ${filtros.join(' AND ')}
    `, params);

    if (premiacoes.length === 0) {
      return res.status(404).json({ error: 'Nenhuma premiação encontrada para esta rodada.' });
    }

    // Buscar ranking da rodada para saber quantos participantes há
    const filtrosRanking = ['rodada = ?'];
    const paramsRanking = [rodada];
    if (campeonatoId) {
      filtrosRanking.push('(campeonato_id = ? OR campeonato_id IS NULL)');
      paramsRanking.push(Number(campeonatoId));
    }
    if (grupoId) {
      filtrosRanking.push('(grupo_id = ? OR grupo_id IS NULL)');
      paramsRanking.push(Number(grupoId));
    }

    const [ranking] = await pool.query(`
      SELECT id_usuario, posicao FROM ranking_rodada
      WHERE ${filtrosRanking.join(' AND ')}
      ORDER BY posicao ASC
    `, paramsRanking);

    const totalParticipantes = ranking.length;
    const lanternaPos = totalParticipantes;

    const resultado = premiacoes.map(premio => {
      let posicao, descricao, acao;
      
      if (premio.tipo_premio === 'campeao') {
        posicao = 1;
        descricao = 'Campeão';
        acao = 'RECEBE';
      } else if (premio.tipo_premio === 'vice') {
        posicao = 2;
        descricao = 'Vice';
        acao = 'RECEBE';
      } else if (premio.tipo_premio === 'lanterna') {
        posicao = lanternaPos;
        descricao = 'Lanterna';
        acao = 'PAGA';
      } else if (premio.tipo_premio === 'outro') {
        posicao = null;
        descricao = 'Demais participantes';
        acao = premio.valor < 0 ? 'PAGA' : 'RECEBE';
      }

      return {
        posicao,
        tipo_premio: descricao,
        valor_premio: Math.abs(Number(premio.valor)),
        acao: acao,
        status_pagamento: premio.status_pagamento?.toUpperCase() || 'PENDENTE'
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao buscar premiações com detalhes da rodada:', error.message);
    res.status(500).json({ error: 'Erro ao buscar premiações da rodada' });
  }
}

async function getPremiacoesRodada(req, res) {
  try {
    const { rodada } = req.params;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;
    const grupoId = req.query.grupoId || req.query.grupo_id;

    const filtros = ['rodada = ?'];
    const params = [rodada];

    if (campeonatoId) {
      filtros.push('(campeonato_id = ? OR campeonato_id IS NULL)');
      params.push(Number(campeonatoId));
    }

    if (grupoId) {
      filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
      params.push(Number(grupoId));
    }

    const [rows] = await pool.query(`
      SELECT tipo_premio, valor, status_pagamento, campeonato_id, grupo_id
      FROM premios
      WHERE ${filtros.join(' AND ')}
    `, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma premiação encontrada para esta rodada.' });
    }

    const resultado = rows.map(premio => {
      let posicao;
      if (premio.tipo_premio === 'campeao') posicao = 1;
      else if (premio.tipo_premio === 'vice') posicao = 2;
      else if (premio.tipo_premio === 'lanterna') posicao = 14; // ou calcule dinamicamente

      return {
        posicao,
        tipo_premio: formatarTipoPremio(premio.tipo_premio),
        valor_premio: Number(premio.valor),
        status_pagamento: premio.status_pagamento?.toUpperCase() || 'PENDENTE'
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao buscar premiações da rodada:', error.message);
    res.status(500).json({ error: 'Erro ao buscar premiações da rodada' });
  }
}

async function getPremiacoesPreviaRodada(req, res) {
  try {
    const { rodada } = req.params;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;
    const grupoId = req.query.grupoId || req.query.grupo_id;
    const rodadaNum = Number(rodada);
    
    // Buscar ranking da rodada
    const filtrosRanking = ['rd.numero = ?'];
    const paramsRanking = [rodadaNum];
    
    if (campeonatoId) {
      filtrosRanking.push('r.campeonato_id = ?');
      paramsRanking.push(Number(campeonatoId));
    }
    
    if (grupoId) {
      filtrosRanking.push('(r.grupo_id = ? OR r.grupo_id IS NULL)');
      paramsRanking.push(Number(grupoId));
    }

    const [ranking] = await pool.query(`
      SELECT r.id_usuario, r.posicao, u.nome
      FROM ranking_rodada r
      JOIN usuarios u ON r.id_usuario = u.id
      JOIN rodadas rd ON r.rodada = rd.id
      WHERE ${filtrosRanking.join(' AND ')}
      ORDER BY r.posicao ASC
    `, paramsRanking);

    if (ranking.length === 0) {
      return res.status(404).json({ error: 'Nenhum ranking encontrado para esta rodada.' });
    }

    const totalParticipantes = ranking.length;
    const campeaoUser = ranking[0];
    const viceUser = ranking[1] || null;
    const lanternaUser = ranking[totalParticipantes - 1];
    
    // Valores fixos de premiação (refletir do rankingController.gerarPremiacoesRodada)
    const valorCampeao = 120.00;
    const valorVice = 10.00;
    const valorLanterna = -20.00;
    const valorDemais = -10.00;
    
    const preview = [
      {
        posicao: 1,
        usuario_id: campeaoUser.id_usuario,
        nome_usuario: campeaoUser.nome,
        tipo_premio: 'Campeão',
        valor_premio: valorCampeao,
        acao: 'RECEBE',
        status_pagamento: 'PENDENTE'
      }
    ];
    
    if (viceUser) {
      preview.push({
        posicao: 2,
        usuario_id: viceUser.id_usuario,
        nome_usuario: viceUser.nome,
        tipo_premio: 'Vice',
        valor_premio: valorVice,
        acao: 'RECEBE',
        status_pagamento: 'PENDENTE'
      });
    }
    
    preview.push({
      posicao: totalParticipantes,
      usuario_id: lanternaUser.id_usuario,
      nome_usuario: lanternaUser.nome,
      tipo_premio: 'Lanterna',
      valor_premio: Math.abs(valorLanterna),
      acao: 'PAGA',
      status_pagamento: 'PENDENTE'
    });
    
    // Adicionar demais participantes
    for (let i = 1; i < ranking.length - 1; i++) {
      if (i !== 1) { // Skip vice (posição 2)
        preview.push({
          posicao: i + 1,
          usuario_id: ranking[i].id_usuario,
          nome_usuario: ranking[i].nome,
          tipo_premio: 'Demais participantes',
          valor_premio: Math.abs(valorDemais),
          acao: 'PAGA',
          status_pagamento: 'PENDENTE'
        });
      }
    }

    res.json(preview);
  } catch (error) {
    console.error('❌ Erro ao gerar prévia de premiações:', error.message);
    res.status(500).json({ error: 'Erro ao gerar prévia de premiações' });
  }
}

function formatarTipoPremio(tipo) {
  if (tipo === 'campeao') return 'Campeão';
  if (tipo === 'vice') return 'Vice';
  if (tipo === 'lanterna') return 'Lanterna';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

module.exports = {
  getPremiacoesRodada,
  getPremiacoesComDetalhesRodada,
  getPremiacoesPreviaRodada
};
