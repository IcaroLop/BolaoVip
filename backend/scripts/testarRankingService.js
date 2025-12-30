const pool = require('../database/conexao');
const { obterRankingRodadaAggregado } = require('../services/rankingPontosService');

async function run() {
  const casos = [
    { rodada: 18, grupoId: 2, campeonatoId: 69, label: 'Rodada 18 (grupoId=2)' },
    { rodada: 18, grupoId: null, campeonatoId: 69, label: 'Rodada 18 (sem grupo)' },
    { rodada: 17, grupoId: 2, campeonatoId: 69, label: 'Rodada 17 (grupoId=2)' },
    { rodada: 15, grupoId: 2, campeonatoId: 69, label: 'Rodada 15 (grupoId=2)' },
    { rodada: 14, grupoId: 2, campeonatoId: 69, label: 'Rodada 14 (grupoId=2)' },
    { rodada: 6, grupoId: 2, campeonatoId: 69, label: 'Rodada 6 (grupoId=2)' },
  ];

  try {
    for (const c of casos) {
      const res = await obterRankingRodadaAggregado({
        grupoId: c.grupoId,
        campeonatoId: c.campeonatoId,
        rodada: c.rodada,
        limit: 20,
        offset: 0,
      });
      console.log(`\n📊 ${c.label}: total=${res.length}`);
      res.slice(0, 5).forEach((r, idx) => {
        console.log(`  ${idx + 1}. pos=${r.posicao} | nome=${r.nome_apostador} | pontos=${r.pontos_totais}`);
      });
    }
  } catch (err) {
    console.error('❌ Erro no teste:', err.message);
  } finally {
    // garantir que a pool desconecte quando terminar
    try { await pool.end(); } catch {}
  }
}

run();
