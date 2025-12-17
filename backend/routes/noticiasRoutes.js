const express = require('express');
const router = express.Router();
const noticiasController = require('../controllers/noticiasController');

router.get('/noticias', noticiasController.listarNoticias);
router.get('/noticias/ao-vivo', noticiasController.buscarNoticiasAoVivo);
router.get('/noticias/:id', noticiasController.obterNoticiaPorId);
router.post('/noticias/sincronizar', noticiasController.sincronizarNoticias);

module.exports = router;
