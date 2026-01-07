const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function limparHoje() {
  const conexao = await pool.getConnection();
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const hojeKey = agora.toFormat('yyyy-LL-dd');

    console.log(`🧹 Limpando TODOS os agendamentos de hoje (${hojeKey})...\n`);

    // Deletar TUDO de hoje, sem filtro de status
    const [result] = await conexao.query(
      `DELETE FROM agendador_requisicoes 
       WHERE DATE(data_hora) = ?`,
      [hojeKey]
    );

    console.log(`✅ ${result.affectedRows} agendamentos deletados de hoje\n`);

    // Verificar o que sobrou
    const [restante] = await conexao.query(
      `SELECT COUNT(*) as total FROM agendador_requisicoes WHERE DATE(data_hora) = ?`,
      [hojeKey]
    );

    console.log(`📊 Agendamentos restantes de hoje: ${restante[0].total}`);

  } catch (err) {
    console.error('❌ Erro ao limpar:', err.message);
    throw err;
  } finally {
    conexao.release();
  }
}

limparHoje().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
