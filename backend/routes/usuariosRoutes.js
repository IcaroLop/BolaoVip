const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const usuarioController = require('../controllers/usuarioController');

router.use(authMiddleware);

// Obter dados do usuário autenticado (incluindo chave PIX)
router.get('/me', usuarioController.obterUsuarioAutenticado);

// Listar usuários simples (para selectors)
router.get('/', usuarioController.listarUsuarios);

// Listar usuários com perfis (para gerenciamento)
router.get('/gerenciar/lista', usuarioController.listarUsuariosComPerfis);

// Obter um usuário específico com perfis
router.get('/:id', usuarioController.obterUsuario);

// Atualizar usuário e seus perfis
router.patch('/:id', usuarioController.atualizarUsuario);

// Listar perfis disponíveis
router.get('/perfis/lista', usuarioController.listarPerfis);

module.exports = router;
