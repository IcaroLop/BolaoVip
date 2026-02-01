const express = require('express');
const router = express.Router();
const { 
  calcularRankingGeral, 
  verificarStatusRodada,
  gerarPagamentosEndpoint
} = require('../controllers/rankingController');
const { obterRankingRodadaAggregado, obterRankingGeralAggregado, processarRodadaJogoAJogo, obterResumoPosicoes, obterEstatisticasRanking } = require('../services/rankingPontosService');
const autenticar = require('../middleware/authMiddleware');

// Ranking da rodada (somando pontos jogo a jogo persistidos)
router.get('/rodada/:rodada', async (req, res) => {
  const rodada = Number(req.params.rodada);
  const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;
  const grupoId = req.query.grupoId || req.query.grupo_id;
  const limit = Number(req.query.limit || 20);
  const offset = Number(req.query.offset || 0);
  if (isNaN(rodada) || rodada <= 0) {
    return res.status(400).json({ erro: 'Rodada inválida' });
  }

  try {
    // Tentar obter dados agregados da tabela de pontos por partida
    const campeonatoFiltro = campeonatoId ? campeonatoId : null;
    let ranking = await obterRankingRodadaAggregado({ grupoId, campeonatoId: campeonatoFiltro, rodada, limit, offset });

    // Se não houver registros, processar a rodada e tentar novamente
    if (!ranking || ranking.length === 0) {
      await processarRodadaJogoAJogo(rodada, campeonatoFiltro, grupoId);
      ranking = await obterRankingRodadaAggregado({ grupoId, campeonatoId: campeonatoFiltro, rodada, limit, offset });
    }

    res.json(ranking);
  } catch (err) {
    console.error(`❌ Erro no endpoint /rodada/${rodada}:`, err.message);
    res.status(500).json({ erro: 'Erro ao obter ranking da rodada' });
  }
});

// Verificar se última rodada foi finalizada e se pagamentos já foram gerados
router.get('/rodada/:rodada/status', verificarStatusRodada);

// Gerar pagamentos (protegido - apenas Admin/Financeiro)
router.post('/rodada/:rodada/gerar-pagamentos', autenticar, gerarPagamentosEndpoint);

// Ranking geral acumulado (1..rodadaFinal) a partir dos pontos persistidos
router.get('/geral', async (req, res) => {
  try {
    const grupoId = req.query.grupoId || req.query.grupo_id;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id || null;
    const rodadaFinal = Number(req.query.rodadaFinal || req.query.rodada_final || 1);
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    if (!grupoId) return res.status(400).json({ erro: 'grupoId é obrigatório' });
    if (isNaN(rodadaFinal) || rodadaFinal <= 0) return res.status(400).json({ erro: 'rodadaFinal inválida' });

    const rankingAgg = await obterRankingGeralAggregado({ grupoId, campeonatoId, rodadaFinal, limit, offset });
    // Adaptar para formato esperado no frontend
    const ranking = rankingAgg.map((r, idx) => ({
      id_usuario: r.id_usuario,
      nome_apostador: r.nome_apostador,
      pontos_totais: r.pontos_totais,
      posicao: offset + idx + 1
    }));
    res.json(ranking);
  } catch (err) {
    console.error('❌ Erro no endpoint /ranking/geral:', err.message);
    res.status(500).json({ erro: 'Erro ao obter ranking geral' });
  }
});

// Resumo de posições (campeão, vice, lanterna) por rodada acumulado
router.get('/geral/resumo-posicoes', async (req, res) => {
  try {
    const grupoId = req.query.grupoId || req.query.grupo_id;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id || null;
    const rodadaFinal = Number(req.query.rodadaFinal || req.query.rodada_final || 1);

    if (!grupoId) return res.status(400).json({ erro: 'grupoId é obrigatório' });
    if (isNaN(rodadaFinal) || rodadaFinal <= 0) return res.status(400).json({ erro: 'rodadaFinal inválida' });

    const resumo = await obterResumoPosicoes({ grupoId, campeonatoId, rodadaFinal });
    res.json(resumo);
  } catch (err) {
    console.error('❌ Erro no endpoint /ranking/geral/resumo-posicoes:', err.message);
    res.status(500).json({ erro: 'Erro ao obter resumo de posições' });
  }
});

// Opcional: endpoint para recalcular pontos da rodada manualmente
router.post('/rodada/:rodada/recalcular', autenticar, async (req, res) => {
  try {
    const rodada = Number(req.params.rodada);
    const grupoId = req.body.grupoId || req.query.grupoId;
    const campeonatoId = req.body.campeonatoId || req.query.campeonatoId || null;
    if (isNaN(rodada) || rodada <= 0) return res.status(400).json({ erro: 'Rodada inválida' });
    await processarRodadaJogoAJogo(rodada, campeonatoId, grupoId);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('❌ Erro no endpoint de recalcular ranking por partida:', err.message);
    res.status(500).json({ erro: 'Erro ao recalcular pontos da rodada' });
  }
});

// Estatísticas completas de ranking - Top 4 (G4) e Z4
// 1. Placar Exato | 2. Vitórias | 3. Gols | 4. W.O | 5. Zero Pontos
router.get('/geral/estatisticas', async (req, res) => {
  try {
    const grupoId = req.query.grupoId || req.query.grupo_id;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id || null;
    const rodadaFinal = Number(req.query.rodadaFinal || req.query.rodada_final || 1);

    if (!grupoId) return res.status(400).json({ erro: 'grupoId é obrigatório' });
    if (isNaN(rodadaFinal) || rodadaFinal <= 0) return res.status(400).json({ erro: 'rodadaFinal inválida' });

    const stats = await obterEstatisticasRanking({ grupoId, campeonatoId, rodadaFinal });
    res.json(stats);
  } catch (err) {
    console.error('❌ Erro no endpoint /ranking/geral/estatisticas:', err.message);
    res.status(500).json({ erro: 'Erro ao obter estatísticas de ranking' });
  }
});

module.exports = router;
