const saldoService = require('../services/saldoService');

/**
 * GET /saldo/usuario - Obtém saldo do usuário autenticado
 */
exports.obterSaldo = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const saldo = await saldoService.obterSaldoUsuario(usuarioId);
    
    res.json(saldo);
  } catch (err) {
    console.error('Erro ao obter saldo:', err);
    res.status(500).json({ erro: 'Erro ao obter saldo' });
  }
};

/**
 * GET /saldo/extrato - Obtém extrato de movimentações
 */
exports.obterExtrato = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { tipo, status, dataInicio, dataFim, pagina = 1, limite = 50 } = req.query;
    
    const filtros = {
      tipo,
      status,
      dataInicio,
      dataFim,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    };

    const extrato = await saldoService.obterExtrato(usuarioId, filtros);
    
    res.json(extrato);
  } catch (err) {
    console.error('Erro ao obter extrato:', err);
    res.status(500).json({ erro: 'Erro ao obter extrato' });
  }
};

/**
 * POST /saldo/deposito - Cria depósito PIX via EFI (gera QRCode + CopiaECola)
 * Modo PRODUÇÃO: Gera PIX pendente, aguarda confirmação via webhook ou fallback
 */
exports.criarDeposito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { valor } = req.body;

    // Validações
    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido' });
    }

    if (valor < 10) {
      return res.status(400).json({ erro: 'Valor mínimo de depósito é R$ 10,00' });
    }

    if (valor > 50000) {
      return res.status(400).json({ erro: 'Valor máximo de depósito é R$ 50.000,00' });
    }

    console.log(`[saldoController.criarDeposito] Iniciando depósito PIX. usuario=${usuarioId}, valor=${valor}`);

    // Usar o novo serviço de depósito PIX
    const { criarDepositoPix } = require('../services/depositoPixService');
    const resultado = await criarDepositoPix(usuarioId, valor);
    
    console.log(`[saldoController.criarDeposito] ✅ Depósito PIX criado com sucesso. deposito_id=${resultado.deposito_id}`);
    console.log(`[saldoController.criarDeposito] Resposta para frontend (completa):`, {
      sucesso: resultado.sucesso,
      deposito_id: resultado.deposito_id,
      txid: resultado.txid,
      valor: resultado.valor,
      pix_copiaecola_length: resultado.pix_copiaecola ? resultado.pix_copiaecola.length : 0,
      qrcode_url_length: resultado.qrcode_url ? resultado.qrcode_url.length : 0,
      calendario_expiracao: resultado.calendario_expiracao
    });
    res.json(resultado);
  } catch (err) {
    console.error('[saldoController.criarDeposito] ❌ Erro ao criar depósito:', err);
    res.status(500).json({ erro: err.message || 'Erro ao criar depósito' });
  }
};


/**
 * POST /saldo/deposito-dev - Depósito instantâneo para desenvolvimento (cria e confirma automaticamente)
 */
exports.criarDepositoDev = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { valor } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido' });
    }

    console.log(`[criarDepositoDev] Iniciando depósito dev. usuario=${usuarioId}, valor=${valor}`);

    // 1. Criar depósito pendente
    const criarRes = await saldoService.criarDeposito(usuarioId, valor, 'Depósito via PIX (DEV - Confirmado automaticamente)');
    const movimentacaoId = criarRes.movimentacao_id;

    console.log(`[criarDepositoDev] Depósito pendente criado. movimentacao_id=${movimentacaoId}`);

    // 2. Confirmar imediatamente (simula recebimento do PIX)
    const confirmarRes = await saldoService.confirmarDeposito(usuarioId, movimentacaoId);

    console.log(`[criarDepositoDev] Depósito confirmado e creditado. saldoNovo=${confirmarRes.saldoNovo}`);

    // 3. Obter saldo atualizado
    const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);

    res.json({
      sucesso: true,
      mensagem: `Depósito de R$ ${parseFloat(valor).toFixed(2)} confirmado automaticamente (modo DEV)`,
      movimentacao_id: movimentacaoId,
      saldo_novo: confirmarRes.saldoNovo,
      saldo: saldoAtualizado
    });
  } catch (err) {
    console.error('[criarDepositoDev] Erro ao criar depósito dev:', err);
    res.status(500).json({ erro: err.message || 'Erro ao processar depósito' });
  }
};

/**
 * POST /saldo/confirmar-deposito/:movimentacaoId - Confirma um depósito
 */
exports.confirmarDeposito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { movimentacaoId } = req.params;

    const resultado = await saldoService.confirmarDeposito(usuarioId, parseInt(movimentacaoId));
    
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao confirmar depósito:', err);
    res.status(500).json({ erro: err.message || 'Erro ao confirmar depósito' });
  }
};

/**
 * POST /saldo/saque-dev - Saque instantâneo para desenvolvimento (cria e confirma automaticamente com débito)
 */
exports.criarSaqueDev = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { valor } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido' });
    }

    console.log(`[criarSaqueDev] Iniciando saque dev. usuario=${usuarioId}, valor=${valor}`);

    // 1. Verificar saldo disponível
    const saldoAtual = await saldoService.obterSaldoUsuario(usuarioId);
    if (saldoAtual.saldo_disponivel < valor) {
      return res.status(400).json({ 
        erro: `Saldo insuficiente. Disponível: R$ ${saldoAtual.saldo_disponivel.toFixed(2)}`
      });
    }

    // 2. Criar saque pendente
    const criarRes = await saldoService.criarSaque(usuarioId, valor, 'Saque via PIX (DEV - Confirmado automaticamente)');
    const movimentacaoId = criarRes.movimentacao_id;

    console.log(`[criarSaqueDev] Saque pendente criado. movimentacao_id=${movimentacaoId}`);

    // 3. Confirmar imediatamente (simula transferência aprovada)
    const confirmarRes = await saldoService.confirmarSaque(usuarioId, movimentacaoId);

    console.log(`[criarSaqueDev] Saque confirmado e debitado. saldoNovo=${confirmarRes.saldoNovo}`);

    // 4. Obter saldo atualizado
    const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);

    res.json({
      sucesso: true,
      mensagem: `Saque de R$ ${parseFloat(valor).toFixed(2)} processado automaticamente (modo DEV)`,
      movimentacao_id: movimentacaoId,
      saldo_novo: confirmarRes.saldoNovo,
      saldo: saldoAtualizado
    });
  } catch (err) {
    console.error('[criarSaqueDev] Erro ao criar saque dev:', err);
    res.status(500).json({ erro: err.message || 'Erro ao processar saque' });
  }
};

/**
 * POST /saldo/saque - Inicia um saque
 */
exports.criarSaque = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { valor } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido' });
    }

    const resultado = await saldoService.criarSaque(usuarioId, valor, 'Saque solicitado');
    
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao criar saque:', err);
    res.status(500).json({ erro: err.message || 'Erro ao criar saque' });
  }
};

/**
 * POST /saldo/confirmar-saque/:movimentacaoId - Confirma um saque
 */
exports.confirmarSaque = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { movimentacaoId } = req.params;

    const resultado = await saldoService.confirmarSaque(usuarioId, parseInt(movimentacaoId));
    
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao confirmar saque:', err);
    res.status(500).json({ erro: err.message || 'Erro ao confirmar saque' });
  }
};

/**
 * POST /saldo/deposito-pix-confirmar/:depositoId - Confirma um depósito PIX manualmente (SANDBOX/DEV)
 * Simula recebimento do PIX e credita o saldo SEM consultar EFI (força confirmação)
 */
exports.confirmarDepositoPix = async (req, res) => {
  let conexao;
  try {
    const usuarioId = req.usuario.id;
    const { depositoId } = req.params;
    const db = require('../database/conexao');
    const saldoService = require('../services/saldoService');

    console.log(`[saldoController.confirmarDepositoPix] Confirmando depósito PIX manualmente (SANDBOX). usuario=${usuarioId}, deposito_id=${depositoId}`);

    // Buscar depósito
    const [depositos] = await db.query(
      'SELECT * FROM pix_depositos WHERE id = ? AND id_usuario = ?',
      [depositoId, usuarioId]
    );

    if (!depositos || depositos.length === 0) {
      return res.status(404).json({ erro: 'Depósito não encontrado' });
    }

    const deposito = depositos[0];

    // Verificar se já foi pago
    if (deposito.status_pagamento === 'PAGO') {
      console.log(`[saldoController.confirmarDepositoPix] Depósito já foi confirmado anteriormente`);
      const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);
      return res.json({
        sucesso: true,
        mensagem: 'Depósito já havia sido confirmado anteriormente',
        deposito_id: depositoId,
        saldo: saldoAtualizado
      });
    }

    const valorPago = Number(deposito.valor_original);
    const { id, txid, id_usuario } = deposito;

    console.log(`[saldoController.confirmarDepositoPix] Forçando confirmação de R$ ${valorPago} (SANDBOX - sem consultar EFI)`);

    // Iniciar transação
    conexao = await db.getConnection();
    await conexao.beginTransaction();

    try {
      // 1. Atualizar pix_depositos
      await conexao.query(
        `UPDATE pix_depositos 
         SET status = 'CONCLUIDA', 
             status_pagamento = 'PAGO', 
             webhook_recebido = false, 
             webhook_payload = '{"simulado":true,"origem":"sandbox_manual"}', 
             data_pagamento = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      // 2. Obter saldo anterior
      const [saldoAnterior] = await conexao.query(
        'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
        [id_usuario]
      );

      const saldoAnt = parseFloat(saldoAnterior[0]?.saldo_atual || 0);
      const saldoNovo = saldoAnt + parseFloat(valorPago);

      // 3. Creditar saldo do usuário
      await conexao.query(
        'UPDATE saldo_usuario SET saldo_atual = saldo_atual + ? WHERE usuario_id = ?',
        [valorPago, id_usuario]
      );

      // 4. Registrar movimentação no extrato
      await conexao.query(
        `INSERT INTO extrato_movimentacao 
         (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status, data_movimentacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id_usuario, 'deposito', valorPago, saldoAnt, saldoNovo, `Depósito PIX confirmado (SANDBOX) - txid: ${txid}`, id, 'deposito_pix', 'confirmado']
      );

      await conexao.commit();

      console.log(`[saldoController.confirmarDepositoPix] ✅ Depósito confirmado e saldo creditado. Novo saldo: R$ ${saldoNovo.toFixed(2)}`);
      
      // Obter saldo atualizado
      const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);
      
      res.json({
        sucesso: true,
        mensagem: `Depósito de R$ ${valorPago.toFixed(2)} confirmado (SANDBOX)`,
        deposito_id: depositoId,
        saldo_anterior: saldoAnt,
        saldo_novo: saldoNovo,
        saldo: saldoAtualizado
      });
    } catch (transactionError) {
      await conexao.rollback();
      throw transactionError;
    }
  } catch (err) {
    console.error('[saldoController.confirmarDepositoPix] Erro ao confirmar depósito:', err);
    res.status(500).json({ erro: err.message || 'Erro ao confirmar depósito' });
  } finally {
    if (conexao) conexao.release();
  }
};

/**
 * GET /saldo/depositos-pendentes - Lista todos os depósitos pendentes do sistema (admin/debug)
 */
exports.listarDepositosPendentes = async (req, res) => {
  try {
    const db = require('../database/conexao');
    
    const [depositos] = await db.query(
      `SELECT 
        id, txid, id_usuario, valor_original, status_pagamento,
        created_at, updated_at, calendario_expiracao,
        TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_desde_criacao,
        DATE_ADD(created_at, INTERVAL calendario_expiracao SECOND) as data_expiracao
      FROM pix_depositos
      WHERE status_pagamento = 'PENDENTE'
      ORDER BY created_at DESC
      LIMIT 50`
    );

    console.log(`[saldoController.listarDepositosPendentes] Encontrados ${depositos.length} depósitos pendentes`);

    res.json({
      sucesso: true,
      total: depositos.length,
      depositos: depositos.map(d => ({
        id: d.id,
        txid: d.txid,
        usuario_id: d.id_usuario,
        valor: d.valor_original,
        status: d.status_pagamento,
        criado_em: d.created_at,
        atualizado_em: d.updated_at,
        minutos_desde_criacao: d.minutos_desde_criacao,
        expira_em: d.data_expiracao,
        expirado: d.data_expiracao < new Date()
      }))
    });
  } catch (err) {
    console.error('[saldoController.listarDepositosPendentes] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao listar depósitos pendentes' });
  }
};

/**
 * POST /saldo/expirar-depositos-antigos - Marca depósitos pendentes antigos como EXPIRADO
 */
exports.expirarDepositosAntigos = async (req, res) => {
  try {
    const db = require('../database/conexao');
    const { idadeMinutos = 60 } = req.body; // Padrão: 1 hora

    console.log(`[saldoController.expirarDepositosAntigos] Expirando depósitos pendentes há mais de ${idadeMinutos} minutos...`);

    const [result] = await db.query(
      `UPDATE pix_depositos
       SET status_pagamento = 'EXPIRADO',
           updated_at = NOW()
       WHERE status_pagamento = 'PENDENTE'
         AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [idadeMinutos]
    );

    console.log(`[saldoController.expirarDepositosAntigos] ✅ ${result.affectedRows} depósitos expirados`);

    res.json({
      sucesso: true,
      mensagem: `${result.affectedRows} depósitos marcados como EXPIRADO`,
      depositos_expirados: result.affectedRows,
      idade_minutos: idadeMinutos
    });
  } catch (err) {
    console.error('[saldoController.expirarDepositosAntigos] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao expirar depósitos antigos' });
  }
};

/**
 * POST /saldo/notificar-pix-expirado/:depositoId - Notifica usuário sobre PIX expirado
 */
exports.notificarPixExpirado = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { depositoId } = req.params;
    const db = require('../database/conexao');
    const { criarNotificacao } = require('../services/notificacoesService');

    console.log(`[saldoController.notificarPixExpirado] Notificando expiração. usuario=${usuarioId}, deposito_id=${depositoId}`);

    // Buscar depósito
    const [depositos] = await db.query(
      'SELECT * FROM pix_depositos WHERE id = ? AND id_usuario = ?',
      [depositoId, usuarioId]
    );

    if (!depositos || depositos.length === 0) {
      return res.status(404).json({ erro: 'Depósito não encontrado' });
    }

    const deposito = depositos[0];

    // Marcar como EXPIRADO se ainda estiver PENDENTE
    if (deposito.status_pagamento === 'PENDENTE') {
      await db.query(
        `UPDATE pix_depositos 
         SET status_pagamento = 'EXPIRADO', updated_at = NOW()
         WHERE id = ?`,
        [depositoId]
      );
      console.log(`[saldoController.notificarPixExpirado] ✅ Depósito ${depositoId} marcado como EXPIRADO`);
    }

    // Criar notificação no sistema
    try {
      await criarNotificacao(
        usuarioId,
        'pix_expirado',
        '⚠️ PIX Expirado',
        `Seu depósito de R$ ${deposito.valor_original.toFixed(2)} expirou após 1 hora sem pagamento. Gere um novo PIX para continuar.`,
        {
          deposito_id: depositoId,
          txid: deposito.txid,
          valor: deposito.valor_original,
          acao: 'gerar_novo_pix'
        }
      );
      console.log(`[saldoController.notificarPixExpirado] ✅ Notificação criada com sucesso`);
    } catch (notifError) {
      console.error('[saldoController.notificarPixExpirado] Erro ao criar notificação:', notifError.message);
    }

    // TODO: Enviar Push Notification (se implementado)
    // await enviarPushNotification(usuarioId, {
    //   title: '⚠️ PIX Expirado',
    //   body: `Seu depósito de R$ ${deposito.valor_original.toFixed(2)} expirou. Gere um novo PIX.`,
    //   data: { tipo: 'pix_expirado', deposito_id: depositoId }
    // });

    res.json({
      sucesso: true,
      mensagem: 'Notificação de expiração enviada',
      deposito_id: depositoId,
      status: 'EXPIRADO'
    });

  } catch (err) {
    console.error('[saldoController.notificarPixExpirado] Erro:', err);
    res.status(500).json({ erro: err.message || 'Erro ao notificar expiração' });
  }
};

/**
 * POST /saldo/verificar-deposito-pix/:depositoId - Verifica um depósito PIX específico (consulta EFI imediatamente)
 * Usado pelo frontend durante polling para confirmar pagamento em tempo real
 */
exports.verificarDepositoPix = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { depositoId } = req.params;
    const db = require('../database/conexao');
    const depositoPixService = require('../services/depositoPixService');

    console.log(`[saldoController.verificarDepositoPix] Verificando depósito PIX. usuario=${usuarioId}, deposito_id=${depositoId}`);

    // Buscar depósito
    const [depositos] = await db.query(
      'SELECT * FROM pix_depositos WHERE id = ? AND id_usuario = ?',
      [depositoId, usuarioId]
    );

    if (!depositos || depositos.length === 0) {
      return res.status(404).json({ erro: 'Depósito não encontrado' });
    }

    const deposito = depositos[0];

    // Se já foi pago, retornar sucesso
    if (deposito.status_pagamento === 'PAGO') {
      console.log(`[saldoController.verificarDepositoPix] ✅ Depósito já estava confirmado`);
      const saldoService = require('../services/saldoService');
      const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);
      return res.json({
        sucesso: true,
        confirmado: true,
        mensagem: 'Depósito já foi confirmado',
        deposito_id: depositoId,
        status: deposito.status_pagamento,
        saldo: saldoAtualizado
      });
    }

    // Se ainda está pendente, consultar EFI para verificar
    if (deposito.status_pagamento === 'PENDENTE') {
      console.log(`[saldoController.verificarDepositoPix] 🔄 Consultando status na EFI...`);
      
      // Tentar atualizar via fallback service
      const foiAtualizado = await depositoPixService.verificarEAtualizarDeposito(deposito);
      
      if (foiAtualizado) {
        console.log(`[saldoController.verificarDepositoPix] ✅ Depósito confirmado e saldo creditado`);
        const saldoService = require('../services/saldoService');
        const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);
        return res.json({
          sucesso: true,
          confirmado: true,
          mensagem: 'Depósito confirmado com sucesso',
          deposito_id: depositoId,
          status: 'PAGO',
          saldo: saldoAtualizado
        });
      } else {
        // Em SANDBOX, após 2 minutos de pendência (~4 verificações), auto-confirmar
        const esSandbox = process.env.EFI_PIX_SANDBOX === 'true';
        const tempoDecorrido = Math.floor((Date.now() - new Date(deposito.created_at).getTime()) / 1000);
        const deveAutoConfirmar = esSandbox && tempoDecorrido >= 120; // 2 minutos
        
        if (deveAutoConfirmar) {
          console.log(`[saldoController.verificarDepositoPix] 🤖 AUTO-CONFIRMAR SANDBOX: ${tempoDecorrido}s decorridos >= 120s`);
          
          let conexao;
          try {
            conexao = await db.getConnection();
            await conexao.beginTransaction();
            
            const valorPago = parseFloat(deposito.valor_original);
            
            // 1. Obter saldo anterior
            const [saldoAnterior] = await conexao.query(
              'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
              [usuarioId]
            );
            
            const saldoAnt = parseFloat(saldoAnterior[0]?.saldo_atual || 0);
            const saldoNovo = saldoAnt + valorPago;
            
            // 2. Criar registro em extrato_movimentacao
            const [movimentacaoResult] = await conexao.query(
              `INSERT INTO extrato_movimentacao 
               (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status, data_movimentacao)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [usuarioId, 'deposito', valorPago, saldoAnt, saldoNovo, `Depósito PIX (txid: ${deposito.txid}) - Auto-confirmado SANDBOX`, deposito.id, 'deposito_pix', 'confirmado']
            );
            
            const movimentacaoId = movimentacaoResult?.insertId;
            console.log(`[saldoController.verificarDepositoPix] 📝 Movimentação criada: ${movimentacaoId}`);
            
            // 2. Atualizar pix_depositos
            await conexao.query(
              `UPDATE pix_depositos 
               SET status = 'CONCLUIDA', 
                   status_pagamento = 'PAGO', 
                   webhook_recebido = false, 
                   webhook_payload = '{"simulado":true,"origem":"auto_confirm_sandbox"}', 
                   data_pagamento = NOW(),
                   updated_at = NOW()
               WHERE id = ?`,
              [depositoId]
            );
            
            // 3. Creditar saldo
            await conexao.query(
              'UPDATE saldo_usuario SET saldo_atual = saldo_atual + ? WHERE usuario_id = ?',
              [valorPago, usuarioId]
            );
            
            await conexao.commit();
            console.log(`[saldoController.verificarDepositoPix] ✅ Auto-confirm SANDBOX concluído. Creditado R$ ${valorPago} | Movimentação ${movimentacaoResult.insertId}`);
            
            const saldoService = require('../services/saldoService');
            const saldoAtualizado = await saldoService.obterSaldoUsuario(usuarioId);
            
            return res.json({
              sucesso: true,
              confirmado: true,
              mensagem: 'Depósito auto-confirmado (SANDBOX)',
              deposito_id: depositoId,
              movimentacao_id: movimentacaoId,
              status: 'PAGO',
              saldo: saldoAtualizado,
              autoConfirmSandbox: true
            });
          } catch (err) {
            if (conexao) await conexao.rollback();
            console.error('[saldoController.verificarDepositoPix] Erro no auto-confirm:', err);
            throw err;
          } finally {
            if (conexao) conexao.release();
          }
        }
        
        console.log(`[saldoController.verificarDepositoPix] ⏳ Depósito ainda não foi confirmado na EFI (${tempoDecorrido}s, SANDBOX=${esSandbox})`);
        return res.json({
          sucesso: true,
          confirmado: false,
          mensagem: 'Depósito ainda não foi confirmado. Aguarde mais alguns momentos.',
          deposito_id: depositoId,
          status: 'PENDENTE',
          dica: 'O sistema verifica automaticamente a cada 2 minutos. Você pode clicar em "Verificar agora" para consultar novamente.'
        });
      }
    }

    res.json({
      sucesso: true,
      confirmado: false,
      status: deposito.status_pagamento,
      deposito_id: depositoId
    });

  } catch (err) {
    console.error('[saldoController.verificarDepositoPix] Erro ao verificar depósito:', err);
    res.status(500).json({ erro: err.message || 'Erro ao verificar depósito' });
  }
};
