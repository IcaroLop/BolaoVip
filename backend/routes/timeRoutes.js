const express = require('express');
const router = express.Router();
const timeController = require('../controllers/timeController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /times - Listar todos os times (público, sem autenticação)
router.get('/', timeController.listarTimes);

// GET /times/favorito - Buscar time favorito do usuário autenticado
router.get('/favorito', authMiddleware, timeController.buscarTimeFavorito);

// PUT /times/favorito - Atualizar time favorito do usuário autenticado
router.put('/favorito', authMiddleware, timeController.atualizarTimeFavorito);

module.exports = router;
