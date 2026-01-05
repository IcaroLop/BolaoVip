const pool = require('../database/conexao');

/**
 * Remove o jogo de teste E suas notificações
 * Garante que tudo seja limpo para um novo teste
 */
async function limparTudoTeste() {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Buscar o ID do jogo de teste
    const [jogos] = await conexao.query(
      `SELECT id FROM jogos WHERE partida_id = 999999`
    );

    if (jogos.length > 0) {
      const jogoId = jogos[0].id;

      // Remover notificações do jogo
      const [resultNotif] = await conexao.query(
        `DELETE FROM notificacoes_enviadas_jogos WHERE jogo_id = ?`,
        [jogoId]
      );

      // Remover o jogo
      const [resultJogo] = await conexao.query(
        `DELETE FROM jogos WHERE partida_id = 999999`
      );

      await conexao.commit();

      console.log('🗑️  Limpeza completa:');
      console.log(`   ✅ Notificações removidas: ${resultNotif.affectedRows}`);
      console.log(`   ✅ Jogo removido: ${resultJogo.affectedRows}`);
    } else {
      console.log('ℹ️  Nenhum jogo de teste encontrado');
    }
  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro:', err.message);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

limparTudoTeste();
