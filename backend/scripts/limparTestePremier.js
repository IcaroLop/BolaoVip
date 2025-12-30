const pool = require('../database/conexao');

async function limparDados() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🔄 Deletando palpites da rodada 18, Premier League (campeonato 69), usuário 7...');
    const [result1] = await conn.query(
      'DELETE FROM palpites WHERE id_usuario = 7 AND rodada = 18 AND campeonato_id = 69'
    );
    console.log('✅ Palpites deletados:', result1.affectedRows);

    console.log('\n🔄 Deletando cobranças PIX pendentes do usuário 7...');
    const [result2] = await conn.query(
      'DELETE FROM pix_cobrancas WHERE id_usuario = 7'
    );
    console.log('✅ Cobranças deletadas:', result2.affectedRows);

    console.log('\n🔄 Resetando saldo do usuário 7 para R$ 8,00...');
    const [result3] = await conn.query(
      'UPDATE saldo_usuario SET saldo_atual = 8.00 WHERE usuario_id = 7'
    );
    console.log('✅ Saldo resetado:', result3.affectedRows);

    console.log('\n✅ Limpeza concluída! Usuário 7 pronto para novo teste.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  conn.release();
  process.exit(0);
}

limparDados();
