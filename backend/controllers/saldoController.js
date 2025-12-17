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
 * POST /saldo/deposito - Inicia um depósito
 */
exports.criarDeposito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { valor } = req.body;

    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Valor inválido' });
    }

    const resultado = await saldoService.criarDeposito(usuarioId, valor, 'Depósito via PIX');
    
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao criar depósito:', err);
    res.status(500).json({ erro: 'Erro ao criar depósito' });
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
