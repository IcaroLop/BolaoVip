const { executarManual } = require('../jobs/verificarCobrancasPendentesJob');

/**
 * Script de teste para verificação manual de cobranças pendentes
 * Executa: node backend/scripts/testarPixFallback.js
 */
async function testar() {
  console.log('='.repeat(70));
  console.log('TESTE MANUAL: Verificação de Cobranças PIX Pendentes (Fallback)');
  console.log('='.repeat(70));

  try {
    const resultado = await executarManual();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(70));
    console.log('Resultado:', resultado);
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ ERRO NO TESTE:');
    console.error('='.repeat(70));
    console.error(error);
    console.error('='.repeat(70));
    process.exit(1);
  }
}

testar();
