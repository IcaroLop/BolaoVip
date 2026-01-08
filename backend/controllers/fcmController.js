/**
 * Controller para gerenciar tokens FCM
 * Responsável por registrar e atualizar tokens de dispositivos
 */

const fcmService = require('../services/fcmService');

/**
 * POST /fcm/registrar-token
 * Registra ou atualiza o token FCM de um dispositivo
 */
exports.registrarToken = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const { fcmToken, platform } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ erro: 'fcmToken é obrigatório.' });
    }

    const sucesso = await fcmService.registrarToken(usuarioId, fcmToken, platform || 'android');

    if (sucesso) {
      res.json({ mensagem: 'Token FCM registrado com sucesso.' });
    } else {
      res.status(500).json({ erro: 'Erro ao registrar token FCM.' });
    }
  } catch (err) {
    console.error('[FCMController] Erro ao registrar token:', err.message);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
};

/**
 * DELETE /fcm/remover-token
 * Remove um token FCM (logout do dispositivo)
 */
exports.removerToken = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ erro: 'fcmToken é obrigatório.' });
    }

    const sucesso = await fcmService.removerToken(fcmToken);

    if (sucesso) {
      res.json({ mensagem: 'Token FCM removido com sucesso.' });
    } else {
      res.status(500).json({ erro: 'Erro ao remover token FCM.' });
    }
  } catch (err) {
    console.error('[FCMController] Erro ao remover token:', err.message);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
};

/**
 * POST /fcm/testar
 * Envia uma notificação push de teste
 */
exports.testarNotificacao = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const { titulo, mensagem } = req.body;

    const sucesso = await fcmService.enviarPushParaUsuario(usuarioId, {
      titulo: titulo || '🧪 Teste de Notificação',
      mensagem: mensagem || 'Esta é uma notificação de teste do Bolão VIP'
    });

    if (sucesso) {
      res.json({ mensagem: 'Notificação de teste enviada com sucesso.' });
    } else {
      res.status(500).json({ erro: 'Erro ao enviar notificação de teste.' });
    }
  } catch (err) {
    console.error('[FCMController] Erro ao testar notificação:', err.message);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
};
