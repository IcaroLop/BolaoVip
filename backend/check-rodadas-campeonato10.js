const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'fBVhh6w2KW',
      database: 'bolaovip'
    });

    // Verificar rodadas do campeonato 10
    const [rodadas] = await conn.query(
      `SELECT numero, campeonato_id, pagamentos_gerados, pagamentos_gerados_em 
       FROM rodadas 
       WHERE campeonato_id = 10 
       ORDER BY numero`
    );

    console.log('📊 Rodadas do campeonato 10:');
    console.log('='.repeat(80));
    rodadas.forEach(r => {
      const status = r.pagamentos_gerados ? '✅ GERADO' : '⏳ PENDENTE';
      const data = r.pagamentos_gerados_em ? new Date(r.pagamentos_gerados_em).toLocaleDateString('pt-BR') : 'N/A';
      console.log(`  Rodada ${String(r.numero).padStart(2, ' ')}: ${status} em ${data}`);
    });

    // Verificar se rodada 1 está com pagamentos_gerados = 1
    const rodada1 = rodadas.find(r => r.numero === 1);
    if (rodada1 && rodada1.pagamentos_gerados) {
      console.log('\n⚠️  PROBLEMA: Rodada 1 tem pagamentos_gerados = 1');
      console.log('   Data de geração: ' + new Date(rodada1.pagamentos_gerados_em).toLocaleDateString('pt-BR'));
      console.log('   Isso impede o botão de aparecer no frontend!');
      console.log('\n   Resolvendo...');
      
      // Resetar apenas a rodada 1 do campeonato 10
      await conn.query(
        `UPDATE rodadas 
         SET pagamentos_gerados = 0, pagamentos_gerados_em = NULL 
         WHERE numero = 1 AND campeonato_id = 10`
      );
      console.log('   ✅ Rodada 1 resetada com sucesso!');
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
