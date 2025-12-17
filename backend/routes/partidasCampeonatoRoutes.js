const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const partidasCampeonatoController = require('../controllers/partidasCampeonatoController');

/**
 * POST /api/partidas/importar-campeonato
 * Importa todas as partidas de um campeonato vinculado ao grupo
 * Body: { grupoId: number }
 * Requer autenticação
 */
router.post('/importar-campeonato', authMiddleware, partidasCampeonatoController.importarPartidasCampeonato);
router.post('/importar-rodadas', authMiddleware, partidasCampeonatoController.importarRodadasCampeonato);

module.exports = router;
