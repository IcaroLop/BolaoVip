const express = require('express');
const router = express.Router();
const pixController = require('../controllers/pixController');

router.post('/cobranca', pixController.gerarCobranca);

router.post('/pix/webhook', pixController.webhookCobranca);

module.exports = router;
