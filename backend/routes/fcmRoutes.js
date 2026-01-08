/**
 * Rotas para gerenciar tokens e notificações FCM
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const fcmController = require('../controllers/fcmController');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * POST /fcm/registrar-token
 * Registra um novo token FCM para o usuário
 */
router.post('/registrar-token', fcmController.registrarToken);

/**
 * DELETE /fcm/remover-token
 * Remove um token FCM
 */
router.delete('/remover-token', fcmController.removerToken);

/**
 * POST /fcm/testar
 * Envia uma notificação de teste
 */
router.post('/testar', fcmController.testarNotificacao);

module.exports = router;
