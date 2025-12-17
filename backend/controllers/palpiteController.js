const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');
const { safeLogSistema } = require('../services/logService');

const { v4: uuidv4 } = require('uuid');
const { DateTime } = require('luxon');

async function resolverContextoCampeonatoEGrupo({ grupoId, campeonatoId, usuarioId }) {
  if (grupoId) {
    const [rows] = await pool.query(`
      SELECT g.campeonato_id
      FROM grupos g
      JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ? AND gm.status = 'ativo'
      WHERE g.id = ?
      LIMIT 1
    `, [usuarioId, grupoId]);

    if (!rows.length) {
      const erro = new Error('Grupo não encontrado ou usuário não participante.');
      erro.statusCode = 403;
      throw erro;
    }

    return { campeonatoId: rows[0].campeonato_id, grupoId };
  }

  if (campeonatoId) return { campeonatoId, grupoId: null };

  return { campeonatoId: null, grupoId: null };
}

exports.enviarPalpites = async (req, res) => {
  const { rodada, palpites, campeonatoId: bodyCampeonatoId, campeonato_id, grupoId, grupo_id } = req.body;
  const id_usuario = req.usuario?.id; // vindo do token

  if (!id_usuario) {
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'aviso',
      descricao: '[enviarPalpites] Tentativa de enviar palpites sem autenticação',
      contexto: JSON.stringify({ rodada, palpites: palpites?.length })
    });
    return res.status(400).json({ erro: 'Usuário não autenticado.' });
  }

  if (!Array.isArray(palpites) || palpites.length === 0) {
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'aviso',
      descricao: `[enviarPalpites] Nenhum palpite enviado. usuario=${id_usuario}`,
      contexto: JSON.stringify({ rodada })
    });
    return res.status(400).json({ erro: 'Nenhum palpite enviado.' });
  }

  // Garantir que grupoId é obrigatório
  const grupoIdRecebido = grupoId || grupo_id;
  if (!grupoIdRecebido) {
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'aviso',
      descricao: `[enviarPalpites] grupoId é obrigatório. usuario=${id_usuario}`,
      contexto: JSON.stringify({ rodada, palpites: palpites?.length })
    });
    return res.status(400).json({ erro: 'grupoId é obrigatório. Selecione um grupo antes de enviar palpites.' });
  }

  let contexto;
  try {
    contexto = await resolverContextoCampeonatoEGrupo({
      grupoId: grupoIdRecebido,
      campeonatoId: bodyCampeonatoId || campeonato_id,
      usuarioId: id_usuario
    });
  } catch (err) {
    const status = err.statusCode || 500;
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[enviarPalpites] Erro ao validar grupo/campeonato. usuario=${id_usuario}, grupoId=${grupoIdRecebido}, erro=${err.message}`,
      contexto: JSON.stringify({ rodada, palpites: palpites?.length })
    });
    return res.status(status).json({ erro: err.message || 'Erro ao validar grupo/campeonato.' });
  }

  // contexto agora sempre terá grupoId obrigatório
  const campeonatoIdFinal = contexto.campeonatoId;
  const grupoIdFinal = contexto.grupoId;

  if (!campeonatoIdFinal || !grupoIdFinal) {
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'aviso',
      descricao: `[enviarPalpites] Não foi possível resolver campeonato/grupo. usuario=${id_usuario}`,
      contexto: JSON.stringify({ rodada, campeonatoIdFinal, grupoIdFinal })
    });
    return res.status(400).json({ erro: 'Não foi possível resolver o campeonato/grupo. Verifique se o grupo está configurado corretamente.' });
  }

  // Gerar codigo_envio sanitizado (sem dashes) para garantir consistencia com pix_cobrancas
  const codigo_envio_raw = uuidv4();
  const codigo_envio = codigo_envio_raw.replace(/-/g, '').substring(0, 26);
  console.log(`[enviarPalpites] usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, codigo_envio=${codigo_envio}`);

  safeLogSistema({
    origem: 'palpiteController',
    nivel: 'info',
    descricao: `[enviarPalpites] Iniciando envio de palpites. usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, total_palpites=${palpites.length}`,
    contexto: JSON.stringify({ codigo_envio, campeonatoIdFinal })
  });

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    for (const palpite of palpites) {
     const { jogo_id, placar_casa, placar_fora } = palpite;
     const id_jogo = jogo_id;
     const palpite_mandante = placar_casa;
     const palpite_visitante = placar_fora;

      console.log('Palpite recebido:', palpite);
      await conexao.query(`
        INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          campeonato_id = VALUES(campeonato_id),
          grupo_id = VALUES(grupo_id),
          gols_casa = VALUES(gols_casa),
          gols_fora = VALUES(gols_fora),
          codigo_envio = VALUES(codigo_envio)
      `, [id_usuario, rodada, campeonatoIdFinal, grupoIdFinal, id_jogo, palpite_mandante, palpite_visitante, codigo_envio]);
    }

    await conexao.commit();
    console.log(`[enviarPalpites] ✅ Palpites salvos com sucesso. codigo_envio=${codigo_envio}, total_palpites=${palpites.length}`);

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[enviarPalpites] ✅ Palpites salvos com sucesso. usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, total_palpites=${palpites.length}`,
      contexto: JSON.stringify({ codigo_envio, campeonatoIdFinal })
    });

    res.json({
      mensagem: 'Palpites salvos com sucesso.',
      codigo_envio
    });

  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao salvar palpites:', err);
    
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[enviarPalpites] ❌ Erro ao salvar palpites. usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, erro=${err.message}`,
      contexto: JSON.stringify({ codigo_envio, total_palpites: palpites.length })
    });
    
    res.status(500).json({ erro: 'Erro ao salvar palpites.' });
  } finally {
    conexao.release();
  }
}


exports.buscarPalpitesDoUsuario = async (req, res) => {
  const usuarioId = req.usuario.id;
  const rodada = parseInt(req.params.rodada, 10);
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const campeonatoIdReq = req.query.campeonatoId || req.query.campeonato_id;

  try {
    const contexto = await resolverContextoCampeonatoEGrupo({
      grupoId,
      campeonatoId: campeonatoIdReq,
      usuarioId
    });

    const filtros = ['id_usuario = ?', 'rodada = ?'];
    const params = [usuarioId, rodada];

    // Não filtra por campeonato_id para permitir dados legados
    // if (contexto.campeonatoId) {
    //   filtros.push('campeonato_id = ?');
    //   params.push(contexto.campeonatoId);
    // }

    if (contexto.grupoId) {
      filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
      params.push(contexto.grupoId);
    }

    const [palpites] = await pool.query(
      `SELECT id_jogo AS partida_id, gols_casa, gols_fora
       FROM palpites
       WHERE ${filtros.join(' AND ')}`,
      params
    );

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[buscarPalpitesDoUsuario] Busca realizada. usuario=${usuarioId}, rodada=${rodada}, total_palpites=${palpites.length}`,
      contexto: JSON.stringify({ grupoId: contexto.grupoId, campeonatoId: contexto.campeonatoId })
    });

    res.json(palpites);
  } catch (error) {
    console.error('Erro ao buscar palpites do usuário:', error);
    
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[buscarPalpitesDoUsuario] ❌ Erro ao buscar palpites. usuario=${usuarioId}, rodada=${rodada}, erro=${error.message}`,
      contexto: JSON.stringify({ grupoId, campeonatoIdReq })
    });
    
    res.status(500).json({ erro: 'Erro ao buscar palpites do usuário' });
  }
};
// Verificar status de pagamento PIX para uma rodada
exports.verificarPagamentoPix = async (req, res) => {
  const id_usuario = req.usuario.id;
  const rodada = parseInt(req.params.rodada);
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const campeonatoIdReq = req.query.campeonatoId || req.query.campeonato_id;

  try {
    const contexto = await resolverContextoCampeonatoEGrupo({
      grupoId,
      campeonatoId: campeonatoIdReq,
      usuarioId: id_usuario
    });

    // Buscar códigos de envio dos palpites da rodada
    const [palpites] = await pool.query(`
      SELECT DISTINCT p.codigo_envio
      FROM palpites p
      WHERE p.id_usuario = ? AND p.rodada = ?
        ${contexto.campeonatoId ? 'AND p.campeonato_id = ?' : ''}
        ${contexto.grupoId ? 'AND p.grupo_id = ?' : ''}
    `, [
      id_usuario,
      rodada,
      ...(contexto.campeonatoId ? [contexto.campeonatoId] : []),
      ...(contexto.grupoId ? [contexto.grupoId] : [])
    ]);

    if (palpites.length === 0) {
      return res.json({
        pixPago: false,
        pixPendente: false,
        cobrancaId: null,
        dadosPix: null
      });
    }

    const codigosEnvio = palpites.map(p => p.codigo_envio);

    // Buscar cobrança mais recente
    const [cobrancas] = await pool.query(`
      SELECT c.*
      FROM pix_cobrancas c
      WHERE c.id_usuario = ? AND c.codigo_envio IN (?)
      ORDER BY c.id DESC
      LIMIT 1
    `, [id_usuario, codigosEnvio]);

    if (cobrancas.length === 0) {
      return res.json({
        pixPago: false,
        pixPendente: false,
        cobrancaId: null,
        dadosPix: null
      });
    }

    const cobranca = cobrancas[0];
    const pixPago = cobranca.status === 'pago' || cobranca.status_pagamento === 'PAGO';
    const pixPendente = !pixPago && (cobranca.status === 'ATIVA' || cobranca.status === 'CONCLUIDA' || cobranca.status_pagamento === 'PENDENTE');

    res.json({
      pixPago,
      pixPendente,
      cobrancaId: cobranca.id,
      dadosPix: pixPendente ? {
        qr_code: cobranca.pix_copiaecola,
        pix_copiaecola: cobranca.pix_copiaecola,
        txid: cobranca.txid,
        valor: cobranca.valor_original,
        expiracao: cobranca.calendario_expiracao
      } : null
    });
  } catch (err) {
    console.error('Erro ao verificar pagamento PIX:', err);
    res.status(500).json({ erro: 'Erro ao verificar status do pagamento' });
  }
};

exports.listarHistorico = async (req, res) => {
  const id_usuario = req.usuario.id;
  const rodada = parseInt(req.params.rodada);
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const campeonatoIdReq = req.query.campeonatoId || req.query.campeonato_id;

  try {
    const contexto = await resolverContextoCampeonatoEGrupo({
      grupoId,
      campeonatoId: campeonatoIdReq,
      usuarioId: id_usuario
    });

    // Baseia-se em jogos da rodada e faz LEFT JOIN dos palpites do usuário para listar todos os jogos
    const filtrosJogos = ['j.rodada = ?'];
    const params = [rodada];

    if (contexto.campeonatoId) {
      filtrosJogos.push('j.campeonato_id = ?');
      params.push(contexto.campeonatoId);
    }
    // Tabela jogos não possui grupo_id; o filtro de grupo será aplicado nos palpites (LEFT JOIN)

    // Left join palpites do usuário/rodada
    const [rows] = await pool.query(`
      SELECT 
        j.partida_id AS id_jogo,
        j.time_mandante,
        j.time_visitante,
        j.escudo_mandante,
        j.escudo_visitante,
        j.placar_mandante,
        j.placar_visitante,
        j.data,
        j.estadio,
        j.status,
        p.gols_casa AS palpite_casa,
        p.gols_fora AS palpite_fora
      FROM jogos j
      LEFT JOIN palpites p 
        ON p.id_jogo = j.partida_id 
       AND p.id_usuario = ? 
       AND p.rodada = ?
       ${contexto.grupoId ? 'AND p.grupo_id = ?' : ''}
      WHERE ${filtrosJogos.join(' AND ')}
      ORDER BY j.data ASC
    `, [id_usuario, rodada, ...(contexto.grupoId ? [contexto.grupoId] : []), ...params]);

    const historico = rows.map(p => {
      let pontos = 0;
      if (p.placar_mandante !== null && p.placar_visitante !== null) {
        pontos = calcularPontuacao(
          { placar_casa: p.palpite_casa, placar_fora: p.palpite_fora },
          { placar_mandante: p.placar_mandante, placar_visitante: p.placar_visitante }
        );
      }

      return {
        id_jogo: p.id_jogo,
        time_mandante: p.time_mandante,
        time_visitante: p.time_visitante,
        escudo_mandante: p.escudo_mandante,
        escudo_visitante: p.escudo_visitante,
        placar_mandante: p.placar_mandante,
        placar_visitante: p.placar_visitante,
        estadio: p.estadio,
        data: p.data,
        status: p.status,
        palpite_casa: p.palpite_casa,
        palpite_fora: p.palpite_fora,
        pontos: Number(pontos.toFixed(2))
      };
    });

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[listarHistorico] Histórico listado. usuario=${id_usuario}, rodada=${rodada}, total_registros=${historico.length}`,
      contexto: JSON.stringify({ grupoId: contexto.grupoId, campeonatoId: contexto.campeonatoId })
    });

    res.json(historico);
  } catch (err) {
    console.error('Erro ao listar histórico:', err);
    
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[listarHistorico] ❌ Erro ao listar histórico. usuario=${id_usuario}, rodada=${rodada}, erro=${err.message}`,
      contexto: JSON.stringify({ grupoId, campeonatoIdReq })
    });
    
    res.status(500).json({ erro: 'Erro ao listar histórico de palpites' });
  }
};



exports.getPalpitesUsuarioRodadaVigente = async (req, res) => {
  const { id_usuario } = req.params;
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const campeonatoIdReq = req.query.campeonatoId || req.query.campeonato_id;

  try {
    // 🔍 Buscar a rodada vigente diretamente da coluna 'rodada_vigente'
    const [configRows] = await pool.query(
      'SELECT rodada_vigente FROM configuracoes LIMIT 1'
    );

    if (configRows.length === 0 || !configRows[0].rodada_vigente) {
      return res.status(404).json({ mensagem: 'Rodada vigente não configurada.' });
    }

    const rodada = parseInt(configRows[0].rodada_vigente, 10);

    // 🔍 Verificar se a rodada já começou
    const [jogos] = await pool.query(
      'SELECT data FROM jogos WHERE rodada = ? ORDER BY data ASC LIMIT 1',
      [rodada]
    );

    if (jogos.length === 0) {
      return res.status(404).json({ mensagem: 'Rodada não encontrada.' });
    }

    const inicioRodada = DateTime.fromJSDate(jogos[0].data).setZone('America/Manaus');
    const agora = DateTime.now().setZone('America/Manaus');

    if (agora < inicioRodada) {
      return res.status(403).json({ mensagem: 'Os palpites ainda não podem ser visualizados. Rodada ainda não começou.' });
    }

    // 🔍 Buscar os palpites do usuário para a rodada vigente
    const contexto = await resolverContextoCampeonatoEGrupo({
      grupoId,
      campeonatoId: campeonatoIdReq,
      usuarioId: id_usuario
    });

    const filtros = ['p.rodada = ?', 'p.id_usuario = ?'];
    const params = [rodada, id_usuario];

    // Não filtra por campeonato_id para permitir dados legados
    // if (contexto.campeonatoId) {
    //   filtros.push('p.campeonato_id = ?');
    //   params.push(contexto.campeonatoId);
    // }

    if (contexto.grupoId) {
      filtros.push('(p.grupo_id = ? OR p.grupo_id IS NULL)');
      params.push(contexto.grupoId);
    }

    const [palpites] = await pool.query(`
      SELECT 
        p.id_jogo, 
        j.time_mandante, j.time_visitante,
        p.gols_casa, 
        p.gols_fora,
        j.data
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.partida_id
      WHERE ${filtros.join(' AND ')}
      ORDER BY j.data ASC
    `, params);

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[getPalpitesUsuarioRodadaVigente] Palpites da rodada vigente consultados. usuario=${id_usuario}, rodada=${rodada}, total_palpites=${palpites.length}`,
      contexto: JSON.stringify({ grupoId: contexto.grupoId, campeonatoId: contexto.campeonatoId })
    });

    res.json(palpites);
  } catch (error) {
    console.error('Erro ao buscar palpites do usuário:', error);
    
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[getPalpitesUsuarioRodadaVigente] ❌ Erro ao buscar palpites da rodada vigente. usuario=${id_usuario}, erro=${error.message}`,
      contexto: JSON.stringify({ grupoId, campeonatoIdReq })
    });
    
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};
