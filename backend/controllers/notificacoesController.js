// backend/controllers/notificacoesController.js
const notificacoesService = require('../services/notificacoesService');

/**
 * GET /notificacoes/usuario
 * Busca notificações do usuário logado
 */
exports.listarNotificacoes = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    // Buscar sempre as últimas 10 notificações (lidas ou não)
    const limite = parseInt(req.query.limite) || 10;

    const notificacoes = await notificacoesService.buscarNotificacoes(usuarioId, false, limite);
    const naoLidas = await notificacoesService.contarNaoLidas(usuarioId);

    res.json({
      notificacoes,
      total_nao_lidas: naoLidas
    });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao listar notificações:', err);
    res.status(500).json({ erro: 'Erro ao buscar notificações.' });
  }
};

/**
 * GET /notificacoes/contador
 * Retorna apenas o contador de não lidas
 */
exports.contadorNaoLidas = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const naoLidas = await notificacoesService.contarNaoLidas(usuarioId);
    res.json({ total_nao_lidas: naoLidas });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao contar não lidas:', err);
    res.status(500).json({ erro: 'Erro ao contar notificações.' });
  }
};

/**
 * PATCH /notificacoes/:id/marcar-lida
 * Marca uma notificação como lida
 */
exports.marcarComoLida = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const notificacaoId = parseInt(req.params.id);
    const sucesso = await notificacoesService.marcarComoLida(notificacaoId, usuarioId);

    if (sucesso) {
      res.json({ mensagem: 'Notificação marcada como lida.' });
    } else {
      res.status(404).json({ erro: 'Notificação não encontrada.' });
    }
  } catch (err) {
    console.error('[NotificacoesController] Erro ao marcar como lida:', err);
    res.status(500).json({ erro: 'Erro ao marcar notificação.' });
  }
};

/**
 * PATCH /notificacoes/marcar-todas-lidas
 * Marca todas as notificações como lidas
 */
exports.marcarTodasLidas = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const total = await notificacoesService.marcarTodasComoLidas(usuarioId);
    res.json({ mensagem: `${total} notificações marcadas como lidas.` });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao marcar todas como lidas:', err);
    res.status(500).json({ erro: 'Erro ao marcar notificações.' });
  }
};

/**
 * DELETE /notificacoes/:id
 * Deleta uma notificação
 */
exports.deletarNotificacao = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const notificacaoId = parseInt(req.params.id);
    const sucesso = await notificacoesService.deletarNotificacao(notificacaoId, usuarioId);

    if (sucesso) {
      res.json({ mensagem: 'Notificação deletada.' });
    } else {
      res.status(404).json({ erro: 'Notificação não encontrada.' });
    }
  } catch (err) {
    console.error('[NotificacoesController] Erro ao deletar notificação:', err);
    res.status(500).json({ erro: 'Erro ao deletar notificação.' });
  }
};

/**
 * DELETE /notificacoes/limpar-lidas
 * Deleta todas as notificações lidas
 */
exports.limparLidas = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const total = await notificacoesService.limparLidas(usuarioId);
    res.json({ mensagem: `${total} notificações removidas.` });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao limpar lidas:', err);
    res.status(500).json({ erro: 'Erro ao limpar notificações.' });
  }
};
