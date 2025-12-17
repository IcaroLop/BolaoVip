const express = require('express');
const router = express.Router();
const { listarJogosAoVivo } = require('../controllers/jogosAoVivoController');

router.get('/jogos-ao-vivo', listarJogosAoVivo);

module.exports = router;
