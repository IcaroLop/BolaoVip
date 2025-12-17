const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const grupoController = require('../controllers/grupoController');

router.use(authMiddleware);

// Criar grupo
router.post('/', grupoController.criarGrupo);

// Listar grupos do usuário autenticado
router.get('/', grupoController.listarMeusGrupos);

// Atualizar nome/campeonato do grupo
router.patch('/:id', grupoController.atualizarGrupo);

// Obter contexto do grupo (inclui campeonato) para seleção no front
router.get('/:id/contexto', grupoController.obterContexto);

// Listar membros do grupo (apenas admins do grupo)
router.get('/:id/membros', grupoController.listarMembros);

// Adicionar/atualizar membro
router.post('/:id/membros', grupoController.adicionarMembro);

// Remover membro (status = removido)
router.delete('/:id/membros/:usuarioId', grupoController.removerMembro);

module.exports = router;
