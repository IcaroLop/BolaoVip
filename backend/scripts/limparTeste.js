const mysql = require('mysql2/promise');

async function limparTeste() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'isl050382',
    database: 'bolaovip',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const connection = await pool.getConnection();

    console.log('🔄 Deletando palpites da rodada 18, campeonato 69, usuário 7...');
    const resultPalpites = await connection.query(
      'DELETE FROM palpites WHERE id_usuario = 7 AND rodada = 18 AND campeonato_id = 69',
      []
    );
    console.log('✅ Palpites deletados:', resultPalpites[0].affectedRows);

    console.log('\n🔄 Deletando cobranças PIX do usuário 7...');
    const resultCobrancas = await connection.query(
      'DELETE FROM pix_cobrancas WHERE id_usuario = 7 AND status = "PENDENTE"',
      []
    );
    console.log('✅ Cobranças deletadas:', resultCobrancas[0].affectedRows);

    connection.release();
    await pool.end();

    console.log('\n✅ Dados de teste limpos com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

limparTeste();
