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
    console.log(`[saldoController.criarDeposito] Resposta para frontend:`, JSON.stringify({
      sucesso: resultado.sucesso,
      deposito_id: resultado.deposito_id,
      txid: resultado.txid,
      valor: resultado.valor,
      pix_copiaecola: resultado.pix_copiaecola ? '✅ PRESENTE' : '❌ AUSENTE',
      qrcode_url: resultado.qrcode_url ? '✅ PRESENTE' : '❌ AUSENTE',
      calendario_expiracao: resultado.calendario_expiracao
    }));
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
