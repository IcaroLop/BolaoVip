const { calcularRankingRodada, gerarPremiacoesRodada } = require('../controllers/rankingController');

async function recalcular() {
  try {
    console.log('🔄 Recalculando ranking da rodada 17 - Premier League (Grupo 2)...');
    
    // Calcular ranking apenas para grupo 2 (Premier League)
    console.log('\n📊 Grupo 2 - Premier League:');
    await calcularRankingRodada(17, 69, 2);
    await gerarPremiacoesRodada(17, 69, 2);
    
    console.log('\n✅ Ranking recalculado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao recalcular ranking:', error);
    process.exit(1);
  }
}

recalcular();
