const express = require('express');
const router = express.Router();
const premiacoesController = require('../controllers/premiacoesController');

router.get('/premiacoes/rodada/:rodada', premiacoesController.getPremiacoesRodada);
router.get('/premiacoes/rodada/:rodada/detalhes', premiacoesController.getPremiacoesComDetalhesRodada);

module.exports = router;
