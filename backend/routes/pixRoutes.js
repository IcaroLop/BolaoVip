const express = require('express');
const router = express.Router();
const pixController = require('../controllers/pixController');
const autenticar = require('../middleware/authMiddleware');

router.post('/cobranca', pixController.gerarCobranca);

// Webhook EFI PIX: prefix '/pix' já vem do server.js; aqui basta '/webhook'
router.post('/webhook', pixController.webhookCobranca);

// Verificação manual (fallback) de pendências de PIX (cobranças + depósitos)
router.post('/verificar-pendentes', autenticar, pixController.verificarPendentes);

// Informações do ambiente PIX (sandbox/prod)
router.get('/ambiente', autenticar, pixController.ambiente);

module.exports = router;
