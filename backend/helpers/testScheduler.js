require('dotenv').config();
const { buscarRodadaVigente, atualizarJogosDaRodada, agendarConsultasResultadosPorRodada } = require('../services/scheduler');
const pool = require('../database/conexao');

async function runTest() {
  try {
    console.log('🔍 TESTE: Buscar rodada vigente...');
    const rodada = await buscarRodadaVigente();
    console.log(`✅ Rodada vigente: ${rodada}`);

    console.log('\n🔧 TESTE: Atualizar jogos da rodada...');
    await atualizarJogosDaRodada(rodada);

    console.log('\n⏰ TESTE: Agendar consultas por rodada...');
    await agendarConsultasResultadosPorRodada();

    console.log('\n✅ Todos os testes manuais concluídos com sucesso.');
  } catch (err) {
    console.error('❌ Erro no teste manual:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTest();
