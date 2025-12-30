const agendadorService = require('../services/agendadorService');

async function testarPlanejamento() {
  try {
    console.log('🔄 Testando planejamento de agenda...');
    const resultado = await agendadorService.planejarPersistirAgenda();
    console.log('✅ Planejamento concluído:', resultado);
    
    // Buscar algumas requisições planejadas para verificar
    const pool = require('../database/conexao');
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT data_hora, campeonato_id, rodada, grupo_chave, tipo, status
         FROM agendador_requisicoes
         WHERE status = 'planejado'
         ORDER BY data_hora ASC
         LIMIT 10`
      );
      console.log('\n📋 Primeiras 10 requisições planejadas:');
      rows.forEach(r => {
        console.log(`  - ${r.data_hora} | Camp: ${r.campeonato_id} | Rodada: ${r.rodada} | Tipo: ${r.tipo} | Grupo: ${r.grupo_chave}`);
      });
      
      // Estatísticas
      const [[stats]] = await conn.query(
        `SELECT 
           COUNT(*) as total,
           MIN(data_hora) as primeira,
           MAX(data_hora) as ultima,
           NOW() as agora
         FROM agendador_requisicoes
         WHERE status = 'planejado'`
      );
      console.log('\n📊 Estatísticas:');
      console.log(`  Total planejado: ${stats.total}`);
      console.log(`  Primeira execução: ${stats.primeira}`);
      console.log(`  Última execução: ${stats.ultima}`);
      console.log(`  Hora atual: ${stats.agora}`);
      
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('❌ Erro ao testar planejamento:', err.message);
  }
  process.exit(0);
}

testarPlanejamento();
