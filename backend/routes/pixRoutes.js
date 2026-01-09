const express = require('express');
const router = express.Router();
const pixController = require('../controllers/pixController');

router.post('/cobranca', pixController.gerarCobranca);

// Webhook EFI PIX: prefix '/pix' já vem do server.js; aqui basta '/webhook'
router.post('/webhook', pixController.webhookCobranca);

module.exports = router;
