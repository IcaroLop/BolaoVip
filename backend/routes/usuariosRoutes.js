const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const usuarioController = require('../controllers/usuarioController');

router.use(authMiddleware);

// Criar novo usuário (admin)
router.post('/', usuarioController.criarUsuario);

// Obter dados do usuário autenticado (incluindo chave PIX)
router.get('/me', usuarioController.obterUsuarioAutenticado);

// Listar usuários com perfis (para gerenciamento)
router.get('/gerenciar/lista', usuarioController.listarUsuariosComPerfis);

// Listar perfis disponíveis
router.get('/perfis/lista', usuarioController.listarPerfis);

// Bloquear usuário (troca senha para 654321) - DEVE VIR ANTES DE /:id
router.patch('/:id/bloquear', (req, res, next) => {
  console.log('🔒 Rota /bloquear acionada para ID:', req.params.id);
  next();
}, usuarioController.bloquearUsuario);

// Atualizar usuário e seus perfis
router.patch('/:id', usuarioController.atualizarUsuario);

// Obter um usuário específico com perfis - GENÉRICO, DEVE VIR POR ÚLTIMO
router.get('/:id', usuarioController.obterUsuario);

// Listar usuários simples (para selectors)
router.get('/', usuarioController.listarUsuarios);

module.exports = router;
