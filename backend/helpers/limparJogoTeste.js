const pool = require('../database/conexao');

/**
 * Remove jogo de TESTE do banco após validação
 */
async function limparJogoTeste() {
  try {
    console.log('🗑️  Removendo jogo de teste...');

    const partidaId = 999999;

    // Remove o jogo de teste (qualquer rodada)
    const [result] = await pool.query(
      `DELETE FROM jogos WHERE partida_id = ?`,
      [partidaId]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Jogo de teste removido com sucesso!`);
      console.log(`   partida_id: ${partidaId}`);
      console.log(`   Linhas removidas: ${result.affectedRows}`);
    } else {
      console.log(`⚠️  Nenhum jogo de teste encontrado no banco.`);
    }

    console.log(`\n🔧 Próximo passo:`);
    console.log(`   1. Remova DRY_RUN=true do .env (ou defina como false)`);
    console.log(`   2. Reinicie o servidor para voltar ao modo produção`);

  } catch (err) {
    console.error('❌ Erro ao remover jogo de teste:', err.message);
  } finally {
    process.exit(0);
  }
}

limparJogoTeste();
