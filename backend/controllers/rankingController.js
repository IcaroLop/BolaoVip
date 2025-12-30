const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');
const saldoService = require('../services/saldoService');

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
      'j.placar_mandante IS NOT NULL',
      'j.placar_visitante IS NOT NULL'
    ];
    const params = [rodadaNum];

    filtros.push('p.campeonato_id = ?');
    filtros.push('j.campeonato_id = ?');
    params.push(campeonatoFiltro);
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('p.grupo_id = ?');
      params.push(grupoIdNum);
    }

    const [palpites] = await pool.query(`
      SELECT p.id_usuario, p.id_jogo, p.gols_casa AS placar_casa, p.gols_fora AS placar_fora,
             j.placar_mandante, j.placar_visitante
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.id
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

    filtros.push('r.campeonato_id = ?');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('r.grupo_id = ?');
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
    const { v4: uuidv4 } = require('uuid');
    const rodadaNum = Number(rodada?.rodada || rodada);
    const campeonatoIdNum = campeonatoId ? Number(campeonatoId) : null;
    const campeonatoFiltro = campeonatoIdNum || 10;
    const grupoIdNum = grupoId ? Number(grupoId) : null;

    console.log(`🏆 Gerando premiações para a rodada ${rodadaNum}${campeonatoIdNum ? ` (campeonato ${campeonatoIdNum})` : ''}${grupoIdNum ? ` grupo ${grupoIdNum}` : ''}...`);

    const filtros = ['rodada = ?'];
    const params = [rodadaNum];

    filtros.push('campeonato_id = ?');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('grupo_id = ?');
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

    // Premiação fixa configurada: campeão 120, vice 10, lanterna -20, demais -10
    const valorCampeao = 120.00;
    const valorVice = 10.00;
    const valorLanterna = -20.00;
    const valorDemais = -10.00;

    const filtroPremios = ['rodada = ?'];
    const paramsPremios = [rodadaNum];

    filtroPremios.push('campeonato_id = ?');
    paramsPremios.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtroPremios.push('grupo_id = ?');
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

    // Demais participantes pagam -10
    if (ranking.length > 3) {
      const demais = ranking.slice(2, ranking.length - 1);
      for (const r of demais) {
        await pool.query(`
          INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento)
          VALUES (?, ?, ?, ?, 'outro', ?, 'pendente')
        `, [r.id_usuario, rodadaNum, campeonatoFiltro, grupoIdNum, valorDemais]);
      }
    }

    console.log(`✅ Premiações da rodada ${rodadaNum} geradas com sucesso.`);

    // === PROCESSAR PREMIAÇÕES (CRÉDITOS) ===
    const filtroPositivos = [...filtroPremios, 'valor > 0', "status_pagamento = 'pendente'"];
    const paramsPositivos = [...paramsPremios];

    const [premiacoes] = await pool.query(
      `SELECT id, usuario_id, valor, tipo_premio FROM premios WHERE ${filtroPositivos.join(' AND ')}`,
      paramsPositivos
    );

    for (const p of premiacoes) {
      try {
        // Creditar saldo do premiado
        await saldoService.creditarSaldo(
          p.usuario_id,
          Number(p.valor),
          `Premiação ${p.tipo_premio} - Rodada ${rodadaNum}`,
          p.id,
          'premio'
        );
        
        // Marcar prêmio como pago
        await pool.query(
          "UPDATE premios SET status_pagamento = 'pago', data_pagamento = NOW() WHERE id = ?",
          [p.id]
        );
        
        const valorLog = Number(p.valor);
        console.log(`💰 Saldo creditado: R$ ${valorLog.toFixed(2)} para usuário ${p.usuario_id}`);
      } catch (err) {
        console.error(`❌ Erro ao creditar premiação para usuário ${p.usuario_id}:`, err.message);
      }
    }

    // === PROCESSAR DÉBITOS (PRÊMIOS NEGATIVOS) ===
    const filtroNegativos = [...filtroPremios, 'valor < 0', "status_pagamento = 'pendente'"];
    const paramsNegativos = [...paramsPremios];

    const [debitos] = await pool.query(
      `SELECT id, usuario_id, ABS(valor) AS valor_cobranca, tipo_premio FROM premios WHERE ${filtroNegativos.join(' AND ')}`,
      paramsNegativos
    );

    for (const d of debitos) {
      try {
        const saldoInfo = await saldoService.obterSaldoUsuario(d.usuario_id);
        const valorDebito = Number(d.valor_cobranca);
        const saldoDisponivel = Number(saldoInfo.saldo_disponivel || 0);
        const saldoAtual = Number(saldoInfo.saldo_atual || 0);
        const descricaoDebito = `Débito ${d.tipo_premio} - Rodada ${rodadaNum}`;

        // Caso 1: saldo cobre tudo
        if (saldoDisponivel >= valorDebito) {
          await saldoService.debitarSaldo(d.usuario_id, valorDebito, descricaoDebito, d.id, 'premio');
          await pool.query("UPDATE premios SET status_pagamento = 'pago', data_pagamento = NOW() WHERE id = ?", [d.id]);
          console.log(`💸 Débito automático: R$ ${valorDebito.toFixed(2)} do usuário ${d.usuario_id}`);
          continue;
        }

        let valorPix = 0;
        let valorDebitado = 0;

        // Caso 2: saldo positivo mas insuficiente
        if (saldoDisponivel > 0) {
          valorDebitado = saldoDisponivel;

          const conexao = await pool.getConnection();
          try {
            await conexao.beginTransaction();
            const [saldoRow] = await conexao.query('SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ? FOR UPDATE', [d.usuario_id]);
            const saldoAnt = Number(saldoRow?.[0]?.saldo_atual || 0);

            await conexao.query('UPDATE saldo_usuario SET saldo_atual = saldo_atual - ? WHERE usuario_id = ?', [valorDebitado, d.usuario_id]);

            await conexao.query(
              `INSERT INTO extrato_movimentacao 
               (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [d.usuario_id, 'premio_debitado', valorDebitado, saldoAnt, saldoAnt - valorDebitado, `${descricaoDebito} (parcial)`, d.id, 'premio', 'confirmado']
            );

            await conexao.commit();
          } catch (e) {
            if (conexao) await conexao.rollback();
            throw e;
          } finally {
            if (conexao) conexao.release();
          }

          valorPix = valorDebito - valorDebitado;
          await pool.query('UPDATE premios SET saldo_parcial = ? WHERE id = ?', [valorDebitado, d.id]);
          console.log(`⚠️ Saldo parcial debitado: R$ ${valorDebitado.toFixed(2)} de R$ ${valorDebito.toFixed(2)} para usuário ${d.usuario_id}. PIX será gerado para a diferença.`);

        } else if (saldoDisponivel === 0) {
          // Caso 3: saldo zerado
          valorPix = valorDebito;
          await pool.query('UPDATE premios SET saldo_parcial = NULL WHERE id = ?', [d.id]);
          console.log(`⚠️ Saldo zerado: criando PIX de R$ ${valorPix.toFixed(2)} para usuário ${d.usuario_id}.`);

        } else {
          // Caso 4: saldo negativo
          valorPix = valorDebito + Math.abs(saldoDisponivel);
          await pool.query('UPDATE premios SET saldo_parcial = NULL WHERE id = ?', [d.id]);
          console.log(`⚠️ Saldo negativo (R$ ${saldoAtual.toFixed(2)}): criando PIX de R$ ${valorPix.toFixed(2)} para usuário ${d.usuario_id}.`);
        }

        // Gerar PIX para o valor calculado
        const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
        const insertData = {
          id_usuario: d.usuario_id,
          codigo_envio,
          txid: codigo_envio,
          status: 'ATIVA',
          status_pagamento: 'PENDENTE',
          valor_original: valorPix,
          chave_pix: process.env.EFI_PIX_KEY || '',
          solicitacao_pagador: `Cobrança rodada ${rodadaNum}`,
          loc_id: null,
          loc_location: null,
          loc_tipo: null,
          pix_copiaecola: null,
          calendario_criacao: new Date(),
          calendario_expiracao: 259200,
          payload_raw: JSON.stringify({ origem: 'premios', rodada: rodadaNum, campeonato_id: campeonatoFiltro, grupo_id: grupoIdNum, premio_id: d.id, saldo_usado: valorDebitado }),
          webhook_recebido: false,
          webhook_payload: null
        };

        await pool.query('INSERT INTO pix_cobrancas SET ?', [insertData]);
        console.log(`🔔 Cobrança PIX criada: R$ ${valorPix.toFixed(2)} para usuário ${d.usuario_id}`);

      } catch (err) {
        console.error(`❌ Erro ao processar débito para usuário ${d.usuario_id}:`, err.message);
        const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
        const valorDebito = Number(d.valor_cobranca);
        await pool.query('INSERT INTO pix_cobrancas SET ?', [{
          id_usuario: d.usuario_id,
          codigo_envio,
          txid: codigo_envio,
          status: 'ATIVA',
          status_pagamento: 'PENDENTE',
          valor_original: valorDebito,
          chave_pix: process.env.EFI_PIX_KEY || '',
          solicitacao_pagador: `Cobrança rodada ${rodadaNum}`,
          calendario_criacao: new Date(),
          calendario_expiracao: 259200,
          payload_raw: JSON.stringify({ origem: 'premios', rodada: rodadaNum, erro_saldo: true })
        }]);
      }
    }

    console.log(`✅ Processamento de saldo concluído para a rodada ${rodadaNum}.`);
  } catch (error) {
    console.error(`❌ Erro ao gerar premiações da rodada ${rodada}:`, error.message);
  }
}

async function calcularRankingGeral(req, res) {
  try {
    const [jogos] = await pool.query(`
      SELECT id, placar_mandante, placar_visitante
      FROM jogos
      WHERE placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL
    `);

    const resultados = {};
    jogos.forEach(j => {
      resultados[j.id] = {
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

/**
 * Verifica se o último jogo de uma rodada foi finalizado
 * @param {number} rodada - Número da rodada
 * @param {number} campeonatoId - ID do campeonato
 * @param {number} grupoId - ID do grupo (opcional)
 */
async function verificarRodadaFinalizada(rodada, campeonatoId = null, grupoId = null) {
  try {
    let query = `
      SELECT j.status, j.placar_mandante, j.placar_visitante
      FROM jogos j
      WHERE j.rodada = ?
    `;
    const params = [rodada];

    if (campeonatoId) {
      query += ` AND j.campeonato_id = ?`;
      params.push(campeonatoId);
    }

    // Nota: grupoId não é filtrado na tabela jogos, apenas campeonatoId
    // if (grupoId) {
    //   query += ` AND j.grupo_id = ?`;
    //   params.push(grupoId);
    // }

    const [resultado] = await pool.execute(query, params);

    if (resultado.length === 0) {
      return {
        rodadaFinalizada: false,
        motivoFalha: 'Nenhum jogo encontrado para esta rodada'
      };
    }

    // Verifica se TODOS os jogos da rodada foram finalizados (com placar)
    const todosFinalizados = resultado.every(jogo => {
      const statusFinalizado = ['finalizado', 'Finalizado', 'encerrado', 'Encerrado'].includes(jogo.status);
      const temPlacar = jogo.placar_mandante !== null && jogo.placar_visitante !== null;
      return statusFinalizado && temPlacar;
    });

    // Último jogo para referência
    const ultimoJogo = resultado[resultado.length - 1];

    return {
      rodadaFinalizada: todosFinalizados,
      ultimoStatus: ultimoJogo.status,
      temPlacar: ultimoJogo.placar_mandante !== null && ultimoJogo.placar_visitante !== null
    };
  } catch (err) {
    console.error(`❌ Erro ao verificar se rodada ${rodada} foi finalizada:`, err.message);
    throw err;
  }
}

/**
 * Gera pagamentos/cobranças da rodada (chamada manual pelo admin/financeiro)
 * FUNÇÃO CRÍTICA: Garante que seja executada apenas uma vez por rodada
 */
async function gerarPagamentosRodada(rodada, campeonatoId = null, grupoId = null) {
  try {
    console.log(`💳 Iniciando geração de pagamentos da rodada ${rodada}...`);

    // 1. Verificar se já foram gerados
    const [rodadas] = await pool.query(
      `SELECT pagamentos_gerados FROM rodadas WHERE numero = ?`,
      [rodada]
    );

    if (rodadas.length === 0) {
      console.warn(`⚠️ Rodada ${rodada} não encontrada`);
      return {
        sucesso: false,
        mensagem: 'Rodada não encontrada no banco de dados'
      };
    }

    if (rodadas[0].pagamentos_gerados) {
      console.warn(`⚠️ Pagamentos da rodada ${rodada} já foram gerados`);
      return {
        sucesso: false,
        mensagem: 'Pagamentos desta rodada já foram gerados'
      };
    }

    // 2. Verificar se rodada está finalizada
    const statusVerificacao = await verificarRodadaFinalizada(rodada, campeonatoId, grupoId);
    if (!statusVerificacao.rodadaFinalizada) {
      console.warn(`⚠️ Rodada ${rodada} ainda não foi finalizada`, statusVerificacao);
      return {
        sucesso: false,
        mensagem: 'Rodada não foi finalizada ou não tem todos os placares'
      };
    }

    // 3. Gerar prêmios (insere na tabela premios com status='pendente')
    console.log(`📊 Calculando ranking da rodada ${rodada}...`);
    await calcularRankingRodada(rodada, campeonatoId, grupoId);

    console.log(`🏆 Gerando premiações/cobranças da rodada ${rodada}...`);
    await gerarPremiacoesRodada(rodada, campeonatoId, grupoId);

    // 4. Marcar como gerado
    await pool.query(
      `UPDATE rodadas SET pagamentos_gerados = 1, pagamentos_gerados_em = NOW()
       WHERE numero = ?`,
      [rodada]
    );

    console.log(`✅ Pagamentos da rodada ${rodada} gerados com sucesso`);

    return {
      sucesso: true,
      mensagem: 'Pagamentos gerados com sucesso. Verifique a tela de Pagamentos para ações.'
    };
  } catch (err) {
    console.error(`❌ Erro ao gerar pagamentos da rodada ${rodada}:`, err.message);
    return {
      sucesso: false,
      mensagem: `Erro ao gerar pagamentos: ${err.message}`
    };
  }
}

/**
 * Endpoint controller - Verificar status da rodada (para frontend)
 */
async function verificarStatusRodada(req, res) {
  try {
    const rodada = Number(req.params.rodada);
    const campeonatoId = req.query.campeonatoId || null;
    const grupoId = req.query.grupoId || null;

    if (isNaN(rodada) || rodada <= 0) {
      return res.status(400).json({ erro: 'Rodada inválida' });
    }

    const statusRodada = await verificarRodadaFinalizada(rodada, campeonatoId, grupoId);
    const [rodadas] = await pool.execute(
      `SELECT pagamentos_gerados, pagamentos_gerados_em FROM rodadas WHERE numero = ?`,
      [rodada]
    );

    const pagamentosGerados = rodadas.length > 0 && rodadas[0].pagamentos_gerados;

    res.json({
      rodadaFinalizada: statusRodada.rodadaFinalizada,
      pagamentosGerados: pagamentosGerados,
      ultimoStatus: statusRodada.ultimoStatus,
      pagamentosGeradosEm: rodadas[0]?.pagamentos_gerados_em
    });
  } catch (err) {
    console.error('❌ Erro ao verificar status da rodada:', err.message);
    res.status(500).json({ erro: 'Erro ao verificar status da rodada' });
  }
}

/**
 * Endpoint controller - Gerar pagamentos (chamado pelo admin/financeiro)
 */
async function gerarPagamentosEndpoint(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const rodada = Number(req.params.rodada);
    const campeonatoId = req.query.campeonatoId || null;
    const grupoId = req.query.grupoId || null;

    if (isNaN(rodada) || rodada <= 0) {
      return res.status(400).json({ erro: 'Rodada inválida' });
    }

    // Verificar se usuário tem perfil Administrador ou Financeiro
    const [perfis] = await pool.query(`
      SELECT p.nome FROM perfis p
      JOIN usuario_perfis up ON up.perfil_id = p.id
      WHERE up.usuario_id = ? AND p.nome IN ('Administrador', 'Financeiro')
      LIMIT 1
    `, [usuarioId]);

    if (perfis.length === 0) {
      return res.status(403).json({ 
        erro: 'Acesso negado. Apenas Administrador ou Financeiro podem gerar pagamentos.' 
      });
    }

    console.log(`👤 Usuário ${usuarioId} (${perfis[0].nome}) iniciando geração de pagamentos da rodada ${rodada}`);

    const resultado = await gerarPagamentosRodada(rodada, campeonatoId, grupoId);

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.mensagem });
    }

    res.json({ 
      sucesso: true,
      mensagem: resultado.mensagem
    });
  } catch (err) {
    console.error('❌ Erro no endpoint de gerar pagamentos:', err.message);
    res.status(500).json({ erro: 'Erro ao gerar pagamentos' });
  }
}

module.exports = {
  calcularRankingRodada,
  gerarPremiacoesRodada,
  calcularRankingGeral,
  getRankingRodada,
  verificarRodadaFinalizada,
  gerarPagamentosRodada,
  verificarStatusRodada,
  gerarPagamentosEndpoint
};
