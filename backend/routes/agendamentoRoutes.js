const express = require('express');
const router = express.Router();
const { proximoAgendamento, historicoAgendamentos, consultarRodadaManual } = require('../controllers/agendamentoController');
const { consultarResultadosDaRodada, consultarResultadosPorData } = require('../services/consultaResultadosService');

// Endpoint: Próximo agendamento
router.get('/agendamentos/proximo', proximoAgendamento);

// Endpoint: Histórico de agendamentos
router.get('/agendamentos/historico', historicoAgendamentos);

// Endpoint: Consulta manual por rodada
router.post('/agendamentos/rodada/:rodada/consultar', async (req, res) => {
  const rodada = parseInt(req.params.rodada, 10);

  try {
    console.info(`[MANUAL][API-Futebol] Consulta específica da rodada ${rodada}; vai atualizar resultados e recalcular pontos/ranking.`);
    await consultarResultadosDaRodada(rodada);
    res.json({ mensagem: `Consulta de resultados da rodada ${rodada} realizada com sucesso.` });
  } catch (err) {
    console.error('Erro ao consultar resultados manualmente:', err.message);
    res.status(500).json({ erro: 'Erro ao consultar resultados da rodada' });
  }
});

// Endpoint: Consulta manual por data
router.post('/agendamentos/data/:data/consultar', async (req, res) => {
  const data = req.params.data;

  try {
    await consultarResultadosPorData(data);
    res.json({ mensagem: `Consulta de resultados do dia ${data} realizada com sucesso.` });
  } catch (err) {
    console.error(`Erro ao consultar resultados por data (${data}):`, err.message);
    res.status(500).json({ erro: 'Erro ao consultar resultados da data' });
  }
});

module.exports = router;
