#!/usr/bin/env node
/**
 * Script: Testar verificação de rodada finalizada
 */

const { verificarRodadaFinalizada } = require('../controllers/rankingController');

(async () => {
  try {
    console.log('\n===== Testando verificarRodadaFinalizada =====\n');

    const resultado = await verificarRodadaFinalizada(21, 69, 2);
    
    console.log('Resultado da verificação:');
    console.log(JSON.stringify(resultado, null, 2));
    
    if (resultado.rodadaFinalizada) {
      console.log('\n✅ RODADA FINALIZADA! Pode gerar pagamentos!');
    } else {
      console.log('\n❌ Rodada NÃO finalizada');
      console.log('Motivo:', resultado.motivoFalha || 'Algum jogo sem placar ou status incorreto');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
