const agendadorService = require('../services/agendadorService');

async function testarExecucao() {
  try {
    console.log('🔄 Testando execução de requisições devidas...');
    const resultado = await agendadorService.executarDevidos();
    console.log('✅ Execução concluída:', resultado);
    
    // Verificar status
    const pool = require('../database/conexao');
    const conn = await pool.getConnection();
    try {
      const [[stats]] = await conn.query(
        `SELECT 
           COUNT(CASE WHEN status = 'planejado' AND data_hora <= NOW() THEN 1 END) as pendentes_agora,
           COUNT(CASE WHEN status = 'executado' THEN 1 END) as executados_total,
           COUNT(CASE WHEN status = 'planejado' THEN 1 END) as planejados_total
         FROM agendador_requisicoes`
      );
      console.log('\n📊 Estatísticas após execução:');
      console.log(`  Pendentes para agora: ${stats.pendentes_agora}`);
      console.log(`  Total executado: ${stats.executados_total}`);
      console.log(`  Total planejado: ${stats.planejados_total}`);
      
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('❌ Erro ao testar execução:', err.message);
  }
  process.exit(0);
}

testarExecucao();
