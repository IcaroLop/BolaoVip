/**
 * Script: Limpar e Replanejador de Agendamentos
 * Remove agendamentos antigos e força replanejamento
 */

const pool = require('../database/conexao');
const agendadorService = require('../services/agendadorService');
const { DateTime } = require('luxon');

async function limparEReplanjar() {
  console.log('🧹 Limpando agendamentos antigos...\n');
  
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Deletar agendamentos não executados (planejados, falhados) que sejam para o futuro
    const [deletados] = await conexao.query(`
      DELETE FROM agendador_requisicoes
      WHERE status IN ('planejado', 'falhou')
      AND data_hora > NOW()
    `);

    console.log(`✅ ${deletados.affectedRows} agendamentos antigos removidos`);

    await conexao.commit();
  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao limpar agendamentos:', err.message);
    throw err;
  } finally {
    conexao.release();
  }

  // Agora replaneja
  console.log('\n📅 Replanejando agendamentos...\n');
  
  try {
    const resultado = await agendadorService.planejarPersistirAgenda();
    console.log(`✅ Planejamento concluído: ${resultado.planejados} novos agendamentos\n`);

    // Mostrar estatísticas
    const stats = await pool.getConnection();
    try {
      const [agendamentos] = await stats.query(`
        SELECT 
          COUNT(*) as total,
          MIN(data_hora) as primeira,
          MAX(data_hora) as ultima,
          GROUP_CONCAT(DISTINCT tipo) as tipos
        FROM agendador_requisicoes
        WHERE data_hora > NOW()
      `);

      if (agendamentos[0]) {
        console.log('📊 Estatísticas de agendamentos:');
        console.log(`   Total: ${agendamentos[0].total}`);
        console.log(`   Primeira: ${agendamentos[0].primeira}`);
        console.log(`   Última: ${agendamentos[0].ultima}`);
        console.log(`   Tipos: ${agendamentos[0].tipos || 'N/A'}`);
      }
    } finally {
      stats.release();
    }

  } catch (err) {
    console.error('❌ Erro ao replanjar:', err.message);
    throw err;
  }
}

limparEReplanjar().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
