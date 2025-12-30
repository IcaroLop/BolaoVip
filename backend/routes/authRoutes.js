const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const autenticar = require('../middleware/authMiddleware');

// Rotas de autenticação
router.post('/login', authController.login);
router.post('/cadastro', authController.cadastro);
router.post('/refresh', authController.refresh);
router.post('/logout', autenticar, authController.logout);

// Rotas de gerenciamento de senha
router.put('/trocar-senha', autenticar, authController.trocarSenha);
router.post('/resetar-senha', autenticar, authController.resetarPropriaSenh);
router.post('/admin/resetar-senha/:usuarioId', autenticar, authController.adminResetarSenha);

module.exports = router;