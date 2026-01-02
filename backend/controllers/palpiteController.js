const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');
const { safeLogSistema } = require('../services/logService');
const { criarNotificacao } = require('../services/notificacoesService');

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
  const { rodada, palpites, campeonatoId: bodyCampeonatoId, campeonato_id, grupoId, grupo_id, opcao_pagamento } = req.body;
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

  // NOVA LÓGICA: Verificar saldo e estado de pagamento da rodada antes de processar
  const VALOR_PALPITE = 15.00;
  const saldoService = require('../services/saldoService');
  
  // Buscar saldo do usuário
  let saldoUsuario;
  try {
    saldoUsuario = await saldoService.obterSaldoUsuario(id_usuario);
  } catch (err) {
    console.error('[enviarPalpites] Erro ao buscar saldo:', err);
    return res.status(500).json({ erro: 'Erro ao verificar saldo do usuário.' });
  }

  const saldoDisponivel = saldoUsuario.saldo_disponivel || 0;
  const temSaldoNegativo = saldoDisponivel < 0;
  const valorParaZerarDebito = temSaldoNegativo ? Math.abs(saldoDisponivel) : 0;
  
  console.log(`[enviarPalpites] Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}, Valor palpite: R$ ${VALOR_PALPITE.toFixed(2)}, Saldo negativo: ${temSaldoNegativo}`);

  // Verificar se já existe pagamento realizado para esta rodada (cobrança única por rodada)
  let pagamentoJaRealizado = false;
  let codigoEnvioExistente = null;
  try {
    const [pagos] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM palpites
       WHERE id_usuario = ? AND rodada = ?
         ${campeonatoIdFinal ? 'AND campeonato_id = ?' : ''}
         ${grupoIdFinal ? 'AND grupo_id = ?' : ''}
         AND status_pagamento = 'pago'`,
      [
        id_usuario,
        rodada,
        ...(campeonatoIdFinal ? [campeonatoIdFinal] : []),
        ...(grupoIdFinal ? [grupoIdFinal] : [])
      ]
    );
    pagamentoJaRealizado = (pagos[0]?.total || 0) > 0;

    // Buscar último codigo_envio desta rodada para reutilização (evitar múltiplas cobranças/PIX)
    const [prev] = await pool.query(
      `SELECT DISTINCT codigo_envio FROM palpites
       WHERE id_usuario = ? AND rodada = ?
         ${campeonatoIdFinal ? 'AND campeonato_id = ?' : ''}
         ${grupoIdFinal ? 'AND grupo_id = ?' : ''}
         AND codigo_envio IS NOT NULL
       ORDER BY codigo_envio DESC
       LIMIT 1`,
      [
        id_usuario,
        rodada,
        ...(campeonatoIdFinal ? [campeonatoIdFinal] : []),
        ...(grupoIdFinal ? [grupoIdFinal] : [])
      ]
    );
    if (prev.length > 0) {
      codigoEnvioExistente = prev[0].codigo_envio;
    }

    // Verificar no extrato se já houve débito por palpite nesta rodada
    if (!pagamentoJaRealizado) {
      const [extr] = await pool.query(
        `SELECT referencia_id AS codigo_envio
         FROM extrato_movimentacao
         WHERE usuario_id = ?
           AND tipo = 'palpite_debitado'
           AND status = 'confirmado'
           AND descricao LIKE ?
         ORDER BY id DESC
         LIMIT 1`,
        [id_usuario, `%Palpite rodada ${rodada}%`]
      );
      if (extr.length > 0) {
        pagamentoJaRealizado = true;
        codigoEnvioExistente = codigoEnvioExistente || extr[0].codigo_envio;
        console.log(`[enviarPalpites] Extrato indica débito já efetuado para rodada ${rodada}.`);
      }
    }
  } catch (e) {
    console.warn('[enviarPalpites] Aviso ao verificar pagamento da rodada:', e.message);
  }

  // Se não informou opcao_pagamento, está na primeira chamada - verificar saldo
  if (!opcao_pagamento) {
    if (saldoDisponivel < VALOR_PALPITE) {
      // SALDO INSUFICIENTE - retornar opções
      const diferenca = VALOR_PALPITE - saldoDisponivel;
      const totalPixNegativo = temSaldoNegativo ? valorParaZerarDebito + VALOR_PALPITE : diferenca;
      
      console.log(`[enviarPalpites] 💰 Saldo insuficiente. Diferença: R$ ${diferenca.toFixed(2)}, Saldo negativo: ${temSaldoNegativo}`);
      
      return res.status(200).json({
        saldo_insuficiente: true,
        saldo_atual: saldoDisponivel,
        valor_palpite: VALOR_PALPITE,
        diferenca: diferenca,
        saldo_negativo: temSaldoNegativo,
        valor_para_zerar_debito: valorParaZerarDebito,
        total_pix_necessario: totalPixNegativo,
        mensagem: temSaldoNegativo 
          ? `Saldo negativo de R$ ${Math.abs(saldoDisponivel).toFixed(2)}. Escolha PIX Integral para regularizar.`
          : 'Saldo insuficiente. Escolha uma opção de pagamento.'
      });
    }
    
    // SALDO SUFICIENTE - debitar e registrar palpites
    console.log(`[enviarPalpites] ✅ Saldo suficiente. Debitando R$ ${VALOR_PALPITE.toFixed(2)}...`);
  }

  // Escolher codigo_envio: reutiliza existente na rodada, senão gera novo
  const codigo_envio_raw = uuidv4();
  const codigo_envio_novo = codigo_envio_raw.replace(/-/g, '').substring(0, 26);
  const codigo_envio = codigoEnvioExistente || codigo_envio_novo;
  console.log(`[enviarPalpites] usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, codigo_envio=${codigo_envio}`);

  safeLogSistema({
    origem: 'palpiteController',
    nivel: 'info',
    descricao: `[enviarPalpites] Iniciando envio de palpites. usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, total_palpites=${palpites.length}, opcao_pagamento=${opcao_pagamento}`,
    contexto: JSON.stringify({ codigo_envio, campeonatoIdFinal, saldoDisponivel, opcao_pagamento })
  });

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Registrar/atualizar palpites primeiro
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

    // LÓGICA DE PAGAMENTO
    let precisaGerarPix = false;
    let valorPix = 0;
    let pagamentoInfo = '';
    let valorDebitoSaldo = 0;
    let valorDebito = 0;

    // Se já pago na rodada, não cobrar novamente
    if (pagamentoJaRealizado) {
      pagamentoInfo = `Palpites atualizados. Pagamento da rodada ${rodada} já efetuado.`;
      console.log(`[enviarPalpites] ℹ️ Pagamento já realizado na rodada ${rodada}. Não será gerada nova cobrança.`);
    } else {
      // Caso exista PIX pendente previamente, reutilizar (não criar nova cobrança)
      let pixPendenteExistente = null;
      if (codigoEnvioExistente) {
        const [cobr] = await pool.query(
          `SELECT * FROM pix_cobrancas WHERE id_usuario = ? AND codigo_envio = ? ORDER BY id DESC LIMIT 1`,
          [id_usuario, codigoEnvioExistente]
        );
        if (cobr.length > 0) {
          const c = cobr[0];
          const pendente = c.status_pagamento === 'PENDENTE' || c.status === 'ATIVA' || c.status === 'CONCLUIDA';
          if (pendente) pixPendenteExistente = c;
        }
      }

      if (pixPendenteExistente) {
        precisaGerarPix = true;
        valorPix = Number(pixPendenteExistente.valor_original || VALOR_PALPITE);
        pagamentoInfo = `Existe uma cobrança PIX pendente para esta rodada. Utilize o código já gerado para concluir o pagamento.`;
        console.log(`[enviarPalpites] 🔄 PIX pendente reutilizado (codigo_envio=${codigoEnvioExistente}).`);
      } else {
        // Fluxo padrão de cobrança
        if (!opcao_pagamento) {
          if (saldoDisponivel < VALOR_PALPITE) {
            const diferenca = VALOR_PALPITE - saldoDisponivel;
            const totalPixNegativo = temSaldoNegativo ? valorParaZerarDebito + VALOR_PALPITE : diferenca;
            console.log(`[enviarPalpites] 💰 Saldo insuficiente. Diferença: R$ ${diferenca.toFixed(2)}, Saldo negativo: ${temSaldoNegativo}`);
            await conexao.commit();
            return res.status(200).json({
              saldo_insuficiente: true,
              saldo_atual: saldoDisponivel,
              valor_palpite: VALOR_PALPITE,
              diferenca: diferenca,
              saldo_negativo: temSaldoNegativo,
              valor_para_zerar_debito: valorParaZerarDebito,
              total_pix_necessario: totalPixNegativo,
              mensagem: temSaldoNegativo 
                ? `Saldo negativo de R$ ${Math.abs(saldoDisponivel).toFixed(2)}. Escolha PIX Integral para regularizar.`
                : 'Saldo insuficiente. Escolha uma opção de pagamento.'
            });
          }
          // SALDO SUFICIENTE - debitar tudo
          console.log(`[enviarPalpites] ✅ Saldo suficiente. Debitando R$ ${VALOR_PALPITE.toFixed(2)}...`);
          await saldoService.debitarSaldo(id_usuario, VALOR_PALPITE, `Palpite rodada ${rodada} (código: ${codigo_envio})`, codigo_envio, 'palpite');
          // Marcar palpites da rodada como pagos
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pago', data_pagamento = NOW()
             WHERE id_usuario = ? AND rodada = ?
               ${campeonatoIdFinal ? 'AND campeonato_id = ?' : ''}
               ${grupoIdFinal ? 'AND grupo_id = ?' : ''}
               AND codigo_envio = ?`,
            [id_usuario, rodada, ...(campeonatoIdFinal ? [campeonatoIdFinal] : []), ...(grupoIdFinal ? [grupoIdFinal] : []), codigo_envio]
          );
          pagamentoInfo = `Palpite confirmado! R$ ${VALOR_PALPITE.toFixed(2)} debitado do saldo.`;
          console.log(`[enviarPalpites] ✅ Saldo debitado e palpites marcados como pagos.`);
        } else if (opcao_pagamento === 'pix_integral') {
          precisaGerarPix = true;
          valorPix = VALOR_PALPITE + valorParaZerarDebito;
          valorDebito = valorParaZerarDebito;
          pagamentoInfo = temSaldoNegativo
            ? `Palpites registrados. Pague R$ ${valorPix.toFixed(2)} via PIX (R$ ${VALOR_PALPITE.toFixed(2)} palpite + R$ ${valorDebito.toFixed(2)} regularização).`
            : `Palpites registrados. Pague R$ ${valorPix.toFixed(2)} via PIX para confirmar.`;
          // Marcar palpites como pendentes até confirmar PIX
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pendente', data_pagamento = NULL
             WHERE id_usuario = ? AND rodada = ?
               ${campeonatoIdFinal ? 'AND campeonato_id = ?' : ''}
               ${grupoIdFinal ? 'AND grupo_id = ?' : ''}
               AND codigo_envio = ?`,
            [id_usuario, rodada, ...(campeonatoIdFinal ? [campeonatoIdFinal] : []), ...(grupoIdFinal ? [grupoIdFinal] : []), codigo_envio]
          );
          console.log(`[enviarPalpites] 💳 PIX integral preparado para codigo_envio=${codigo_envio}.`);
        } else if (opcao_pagamento === 'pix_parcial') {
          if (temSaldoNegativo) {
            await conexao.rollback();
            return res.status(400).json({ 
              erro: 'PIX Parcial não está disponível com saldo negativo. Use PIX Integral para regularizar.' 
            });
          }
          const diferenca = VALOR_PALPITE - saldoDisponivel;
          await saldoService.debitarSaldo(id_usuario, saldoDisponivel, `Palpite rodada ${rodada} - Pagamento parcial (código: ${codigo_envio})`, codigo_envio, 'palpite');
          precisaGerarPix = true;
          valorPix = diferenca;
          valorDebitoSaldo = saldoDisponivel;
          pagamentoInfo = `R$ ${saldoDisponivel.toFixed(2)} debitado do saldo. Pague R$ ${diferenca.toFixed(2)} via PIX para confirmar.`;
          // Marcar palpites como pendentes até confirmar PIX
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pendente', data_pagamento = NULL
             WHERE id_usuario = ? AND rodada = ?
               ${campeonatoIdFinal ? 'AND campeonato_id = ?' : ''}
               ${grupoIdFinal ? 'AND grupo_id = ?' : ''}
               AND codigo_envio = ?`,
            [id_usuario, rodada, ...(campeonatoIdFinal ? [campeonatoIdFinal] : []), ...(grupoIdFinal ? [grupoIdFinal] : []), codigo_envio]
          );
          console.log(`[enviarPalpites] 💰💳 Saldo parcial debitado e PIX pendente preparado (codigo_envio=${codigo_envio}).`);
        }
      }
    }

    // Nota: Lógica de cobrança já tratada acima considerando pagamentoJáRealizado,
    // PIX pendente e opções de pagamento. Removido bloco duplicado que causava re-débito.

    await conexao.commit();
    console.log(`[enviarPalpites] ✅ Palpites salvos com sucesso. codigo_envio=${codigo_envio}, total_palpites=${palpites.length}`);

    // ✅ NOTIFICAÇÃO: Palpites Enviados com Sucesso
    const dadosNotificacao = {
      rodada,
      total_palpites: palpites.length,
      campeonato_id: campeonatoIdFinal,
      grupo_id: grupoIdFinal,
      codigo_envio,
      pagamento_opcao: opcao_pagamento,
      placares: palpites.map(p => ({
        jogo_id: p.jogo_id,
        casa: p.placar_casa,
        fora: p.placar_fora
      }))
    };

    const tituloNotificacao = '🎯 Palpite Enviado com Sucesso';
    const mensagemNotificacao = `${palpites.length} palpite(s) confirmado(s) para a rodada ${rodada}! Referência: ${codigo_envio}`;

    await criarNotificacao(
      id_usuario,
      'palpite_enviado',
      tituloNotificacao,
      mensagemNotificacao,
      dadosNotificacao
    ).catch(err => {
      console.error('Erro ao criar notificação de palpite:', err);
    });

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[enviarPalpites] ✅ Palpites salvos com sucesso. usuario=${id_usuario}, rodada=${rodada}, grupo=${grupoIdFinal}, total_palpites=${palpites.length}, opcao=${opcao_pagamento}`,
      contexto: JSON.stringify({ codigo_envio, campeonatoIdFinal, precisaGerarPix, valorPix })
    });

    res.json({
      mensagem: pagamentoInfo,
      codigo_envio,
      precisa_gerar_pix: precisaGerarPix,
      valor_pix: valorPix,
      valor_palpite: VALOR_PALPITE,
      valor_debito: valorDebito,
      valor_debito_saldo: valorDebitoSaldo,
      saldo_negativo: temSaldoNegativo,
      pagamento_completo: pagamentoJaRealizado ? true : !precisaGerarPix
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
    
    res.status(500).json({ erro: 'Erro ao salvar palpites: ' + err.message });
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
        ON p.id_jogo = j.id 
       AND p.id_usuario = ? 
       AND p.rodada = ?
       ${contexto.grupoId ? 'AND p.grupo_id = ?' : ''}
      WHERE ${filtrosJogos.join(' AND ')}
      ORDER BY j.data ASC
    `, [id_usuario, rodada, ...(contexto.grupoId ? [contexto.grupoId] : []), ...params]);

    const historico = rows.map(p => {
      // Interpretar objetos Date do MySQL como hora local de Manaus (MySQL DATETIME é 'naive')
      const dataManaus = p.data ? DateTime.fromObject({
        year: p.data.getFullYear(),
        month: p.data.getMonth() + 1,
        day: p.data.getDate(),
        hour: p.data.getHours(),
        minute: p.data.getMinutes(),
        second: p.data.getSeconds()
      }, { zone: 'America/Manaus' }) : null;
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
        data: dataManaus ? dataManaus.toISO({ suppressMilliseconds: true }) : null,
        data_formatada: dataManaus ? dataManaus.toFormat('dd/LL/yyyy HH:mm') : null,
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
  // Apesar do nome legado, esta função agora respeita a rodada informada na rota
  const { id_usuario, rodada: rodadaParam } = req.params;
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const campeonatoIdReq = req.query.campeonatoId || req.query.campeonato_id;

  try {
    const rodada = parseInt(rodadaParam, 10);
    if (isNaN(rodada) || rodada <= 0) {
      return res.status(400).json({ mensagem: 'Rodada inválida.' });
    }

    // Resolver contexto do usuário solicitado para validar grupo/campeonato
    const contexto = await resolverContextoCampeonatoEGrupo({
      grupoId,
      campeonatoId: campeonatoIdReq,
      usuarioId: id_usuario
    });

    // Montar filtros: por rodada + usuário, e por campeonato se fornecido
    const filtros = ['p.rodada = ?', 'p.id_usuario = ?'];
    const params = [rodada, id_usuario];

    if (contexto.campeonatoId) {
      filtros.push('j.campeonato_id = ?');
      params.push(contexto.campeonatoId);
    }

    if (contexto.grupoId) {
      filtros.push('(p.grupo_id = ? OR p.grupo_id IS NULL)');
      params.push(contexto.grupoId);
    }

    // Exibir apenas jogos já iniciados (andamento) ou concluídos (finalizado/encerrado)
    // Também inclui partidas com placar registrado, mesmo se o status tiver variação inesperada
    filtros.push("(LOWER(j.status) IN ('andamento','finalizado','encerrado') OR (j.placar_mandante IS NOT NULL AND j.placar_visitante IS NOT NULL))");

    const [rows] = await pool.query(`
      SELECT 
        p.id_jogo,
        j.time_mandante, j.time_visitante,
        p.gols_casa, p.gols_fora,
        j.placar_mandante, j.placar_visitante,
        j.data
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.id
      WHERE ${filtros.join(' AND ')}
      ORDER BY j.data ASC
    `, params);

    // Calcular pontos por jogo quando houver placar final
    const palpites = rows.map(p => {
      // Interpretar objetos Date do MySQL como hora local de Manaus
      const dataManaus = p.data ? DateTime.fromObject({
        year: p.data.getFullYear(),
        month: p.data.getMonth() + 1,
        day: p.data.getDate(),
        hour: p.data.getHours(),
        minute: p.data.getMinutes(),
        second: p.data.getSeconds()
      }, { zone: 'America/Manaus' }) : null;
      let pontos = 0;
      let categoria = 'errado';
      if (p.placar_mandante !== null && p.placar_visitante !== null) {
        pontos = calcularPontuacao(
          { placar_casa: p.gols_casa, placar_fora: p.gols_fora },
          { placar_mandante: p.placar_mandante, placar_visitante: p.placar_visitante }
        );

        // Classificação por categoria (exato/empate/vencedor/um_gol_correto/errado)
        const exato = p.gols_casa === p.placar_mandante && p.gols_fora === p.placar_visitante;
        const empateResultado = p.placar_mandante === p.placar_visitante;
        const empatePalpite = p.gols_casa === p.gols_fora;
        const vencedorResultado = Math.sign(p.placar_mandante - p.placar_visitante);
        const vencedorPalpite = Math.sign(p.gols_casa - p.gols_fora);
        const umGolCorreto = (p.gols_casa === p.placar_mandante) ^ (p.gols_fora === p.placar_visitante); // XOR

        if (exato) categoria = 'exato';
        else if (empateResultado && empatePalpite) categoria = 'empate';
        else if (vencedorResultado !== 0 && vencedorResultado === vencedorPalpite) categoria = 'vencedor';
        else if (umGolCorreto) categoria = 'um_gol_correto';
        else categoria = 'errado';
      }
      return {
        id_jogo: p.id_jogo,
        time_mandante: p.time_mandante,
        time_visitante: p.time_visitante,
        gols_casa: p.gols_casa,
        gols_fora: p.gols_fora,
        placar_mandante: p.placar_mandante,
        placar_visitante: p.placar_visitante,
        data: dataManaus ? dataManaus.toISO({ suppressMilliseconds: true }) : null,
        data_formatada: dataManaus ? dataManaus.toFormat('dd/LL/yyyy HH:mm') : null,
        pontos: Number(pontos.toFixed(2)),
        categoria
      };
    });

    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'info',
      descricao: `[getPalpitesUsuarioRodada] Consulta realizada. usuario=${id_usuario}, rodada=${rodada}, total=${palpites.length}`,
      contexto: JSON.stringify({ grupoId: contexto.grupoId, campeonatoId: contexto.campeonatoId })
    });

    res.json(palpites);
  } catch (error) {
    console.error('Erro ao buscar palpites do usuário:', error);
    
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[getPalpitesUsuarioRodada] ❌ Erro na consulta. usuario=${id_usuario}, rodada=${req.params.rodada}, erro=${error.message}`,
      contexto: JSON.stringify({ grupoId, campeonatoIdReq })
    });
    
    res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// Verificar se usuário tem pagamentos pendentes (bloqueado)
exports.verificarBloqueio = async (req, res) => {
  const id_usuario = req.usuario?.id;

  if (!id_usuario) {
    return res.status(400).json({ erro: 'Usuário não autenticado.' });
  }

  try {
    // Verificar se há PIX pendentes para este usuário
    const [pixPendentes] = await pool.query(`
      SELECT COUNT(*) as total
      FROM pix_cobrancas
      WHERE id_usuario = ?
        AND status_pagamento = 'PENDENTE'
        AND status = 'ATIVA'
    `, [id_usuario]);

    const totalPendente = pixPendentes[0]?.total || 0;
    const bloqueado = totalPendente > 0;

    console.log(`[verificarBloqueio] usuario=${id_usuario}, bloqueado=${bloqueado}, total_pendente=${totalPendente}`);

    res.json({
      bloqueado,
      total_pendente: totalPendente,
      mensagem: bloqueado 
        ? `Você possui ${totalPendente} pagamento(s) pendente(s). Finalize o(s) pagamento(s) para enviar novos palpites e receber premiações.`
        : 'Nenhum pagamento pendente.'
    });

  } catch (err) {
    console.error('[verificarBloqueio] Erro:', err);
    safeLogSistema({
      origem: 'palpiteController',
      nivel: 'erro',
      descricao: `[verificarBloqueio] ❌ Erro ao verificar bloqueio. usuario=${id_usuario}, erro=${err.message}`
    });
    res.status(500).json({ erro: 'Erro ao verificar bloqueio.' });
  }
};
