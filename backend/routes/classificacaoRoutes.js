const express = require('express');
const router = express.Router();
const classificacaoController = require('../controllers/classificacaoController');

router.post('/campeonatos/:campeonato_id/atualizar', classificacaoController.atualizarClassificacao);
router.get('/campeonatos/:campeonato_id/classificacao', classificacaoController.obterClassificacao);

module.exports = router;