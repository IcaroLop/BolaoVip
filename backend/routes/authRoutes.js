const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Corrigido:
router.post('/login', authController.login);
router.post('/cadastro', authController.cadastro);

module.exports = router;
