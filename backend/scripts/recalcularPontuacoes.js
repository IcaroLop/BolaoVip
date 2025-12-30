// backend/scripts/recalcularPontuacoes.js
/**
 * Recalcula ranking e premiações de todas as rodadas finalizadas
 * Usar após alteração nas regras de pontuação
 * 
 * Uso: node backend/scripts/recalcularPontuacoes.js
 */

const pool = require('../database/conexao');
const { calcularRankingRodada, gerarPremiacoesRodada } = require('../controllers/rankingController');

async function main() {
  const conexao = await pool.getConnection();
  
  try {
    console.log('🔄 Iniciando recálculo de pontuações, rankings e premiações...\n');

    // Buscar todas as rodadas com jogos finalizados
    const [rodadas] = await conexao.query(`
      SELECT DISTINCT rodada 
      FROM jogos 
      WHERE placar_mandante IS NOT NULL 
        AND placar_visitante IS NOT NULL
      ORDER BY rodada ASC
    `);

    if (rodadas.length === 0) {
      console.log('⚠️  Nenhuma rodada finalizada encontrada.');
      return;
    }

    console.log(`📊 Encontradas ${rodadas.length} rodadas finalizadas.\n`);

    let sucessos = 0;
    let erros = 0;

    for (const { rodada } of rodadas) {
      try {
        console.log(`⚙️  Processando rodada ${rodada}...`);
        
        // Recalcular ranking
        await calcularRankingRodada(rodada);
        
        // Recalcular premiações
        await gerarPremiacoesRodada(rodada);
        
        console.log(`✅ Rodada ${rodada} recalculada com sucesso.\n`);
        sucessos++;
      } catch (err) {
        console.error(`❌ Erro ao recalcular rodada ${rodada}:`, err.message);
        erros++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 RECÁLCULO CONCLUÍDO`);
    console.log(`   Total de rodadas: ${rodadas.length}`);
    console.log(`   Sucessos: ${sucessos}`);
    console.log(`   Erros: ${erros}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Erro crítico ao recalcular pontuações:', err);
    throw err;
  } finally {
    conexao.release();
    process.exit(0);
  }
}

main();
