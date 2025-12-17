const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const campeonatoController = require('../controllers/campeonatoController');

router.use(authMiddleware);
router.get('/', campeonatoController.listarCampeonatos);

module.exports = router;
