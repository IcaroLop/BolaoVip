const express = require('express');
const router = express.Router();
const notificacoesAgendadasController = require('../controllers/notificacoesAgendadasController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /notificacoes/agendar
 * Agenda notificações para uma rodada (60, 30, 15, 5 min antes)
 * Requer token de autenticação e perfil de desenvolvedor/administrador
 */
router.post('/agendar', authMiddleware, (req, res) => {
  // Validar permissão
  const perfisValidos = ['desenvolvedor', 'administrador'];
  if (!req.usuario.perfis || !perfisValidos.some(p => req.usuario.perfis.includes(p))) {
    return res.status(403).json({ erro: 'Permissão negada' });
  }

  notificacoesAgendadasController.agendarNotificacoesRodada(req, res);
});

/**
 * GET /notificacoes/pendentes
 * Retorna notificações que devem disparar agora
 * Interno (usado pelo cron job)
 */
router.get('/pendentes', (req, res) => {
  notificacoesAgendadasController.obterNotificacoesPendentes(req, res);
});

/**
 * POST /notificacoes/marcar-enviada
 * Marca notificação como enviada (interno)
 */
router.post('/marcar-enviada', (req, res) => {
  notificacoesAgendadasController.marcarComoEnviada(req, res);
});

/**
 * DELETE /notificacoes/rodada/:rodada_id
 * Cancela todas as notificações de uma rodada
 */
router.delete('/rodada/:rodada_id', authMiddleware, (req, res) => {
  const perfisValidos = ['desenvolvedor', 'administrador'];
  if (!req.usuario.perfis || !perfisValidos.some(p => req.usuario.perfis.includes(p))) {
    return res.status(403).json({ erro: 'Permissão negada' });
  }

  notificacoesAgendadasController.cancelarNotificacoesRodada(req, res);
});

/**
 * GET /notificacoes/historico
 * Lista histórico de notificações enviadas
 */
router.get('/historico', authMiddleware, (req, res) => {
  const perfisValidos = ['desenvolvedor', 'administrador'];
  if (!req.usuario.perfis || !perfisValidos.some(p => req.usuario.perfis.includes(p))) {
    return res.status(403).json({ erro: 'Permissão negada' });
  }

  notificacoesAgendadasController.listarHistorico(req, res);
});

module.exports = router;
