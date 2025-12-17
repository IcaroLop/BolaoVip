const express = require('express');
const router = express.Router();
const resultadoController = require('../controllers/resultadoController');

router.get('/rodada-vigente', resultadoController.buscarResultadosRodadaVigente);
router.get('/rodada/:rodada', resultadoController.buscarResultadosRodada);

module.exports = router;
