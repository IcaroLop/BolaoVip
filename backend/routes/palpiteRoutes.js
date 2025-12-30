const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const {
  enviarPalpites,
  buscarPalpitesDoUsuario,
  listarHistorico,
  getPalpitesUsuarioRodadaVigente,
  verificarPagamentoPix,
  verificarBloqueio
} = require('../controllers/palpiteController');

// Rota de envio de palpites
router.post('/enviar', autenticar, enviarPalpites);

// Rota para buscar palpites salvos
router.get('/rodada/:rodada', autenticar, buscarPalpitesDoUsuario);

// 🆕 Rota para histórico de palpites
router.get('/historico/:rodada', autenticar, listarHistorico);

// Rota para verificar status de pagamento PIX
router.get('/verificar-pagamento/:rodada', autenticar, verificarPagamentoPix);

// 🆕 Rota para verificar se usuário está bloqueado por pagamentos pendentes
router.get('/verificar-bloqueio', autenticar, verificarBloqueio);

router.get('/rodada/:rodada/usuario/:id_usuario', autenticar, getPalpitesUsuarioRodadaVigente);


module.exports = router;
