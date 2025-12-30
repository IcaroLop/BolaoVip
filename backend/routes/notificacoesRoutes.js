// backend/routes/notificacoesRoutes.js
const express = require('express');
const router = express.Router();
const notificacoesController = require('../controllers/notificacoesController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// GET /notificacoes/usuario - Listar notificações
router.get('/usuario', notificacoesController.listarNotificacoes);

// GET /notificacoes/contador - Contador de não lidas
router.get('/contador', notificacoesController.contadorNaoLidas);

// PATCH /notificacoes/:id/marcar-lida - Marcar uma como lida
router.patch('/:id/marcar-lida', notificacoesController.marcarComoLida);

// PATCH /notificacoes/marcar-todas-lidas - Marcar todas como lidas
router.patch('/marcar-todas-lidas', notificacoesController.marcarTodasLidas);

// DELETE /notificacoes/:id - Deletar uma notificação
router.delete('/:id', notificacoesController.deletarNotificacao);

// DELETE /notificacoes/limpar-lidas - Limpar todas as lidas
router.delete('/limpar-lidas', notificacoesController.limparLidas);

module.exports = router;
