const express = require('express');
const router = express.Router();
const { calcularRankingRodada, calcularRankingGeral, getRankingRodada } = require('../controllers/rankingController');
const autenticar = require('../middleware/authMiddleware');

router.get('/rodada/:rodada', async (req, res) => {
  const rodada = Number(req.params.rodada);
  const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;
  const grupoId = req.query.grupoId || req.query.grupo_id;
  if (isNaN(rodada) || rodada <= 0) {
    return res.status(400).json({ erro: 'Rodada inválida' });
  }

  try {
    // Primeiro calcula o ranking, se necessário
    await calcularRankingRodada(rodada, campeonatoId, grupoId);

    // Depois busca os dados para o frontend
    const ranking = await getRankingRodada(rodada, campeonatoId, grupoId);

    res.json(ranking);
  } catch (err) {
    console.error(`❌ Erro no endpoint /rodada/${rodada}:`, err.message);
    res.status(500).json({ erro: 'Erro ao obter ranking da rodada' });
  }
});
router.get('/geral', autenticar, calcularRankingGeral);

module.exports = router;
