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

    console.log('✅ Conectado ao banco de produção\n');

    // Verificar campeonatos
    const [camps] = await conn.query(`
      SELECT DISTINCT campeonato_id, COUNT(*) as total_jogos
      FROM jogos
      GROUP BY campeonato_id
      ORDER BY campeonato_id
    `);
    console.log('🏆 Campeonatos no sistema:');
    camps.forEach(c => console.log(`  - Campeonato ID ${c.campeonato_id}: ${c.total_jogos} jogos`));

    // Verificar rodadas do campeonato 10
    const [rodadas10] = await conn.query(`
      SELECT rodada, COUNT(*) as jogos,
             SUM(CASE WHEN status IN ('finalizado', 'encerrado') THEN 1 ELSE 0 END) as finalizados
      FROM jogos
      WHERE campeonato_id = 10
      GROUP BY rodada
      ORDER BY rodada
      LIMIT 10
    `);
    console.log('\n📊 Rodadas do campeonato_id=10:');
    rodadas10.forEach(r => console.log(`  - Rodada ${r.rodada}: ${r.finalizados}/${r.jogos} jogos finalizados`));

    // Verificar se existem outras rodadas 1 em outros campeonatos
    const [outras] = await conn.query(`
      SELECT campeonato_id, rodada, COUNT(*) as jogos
      FROM jogos
      WHERE rodada = 1
      GROUP BY campeonato_id, rodada
      ORDER BY campeonato_id
    `);
    console.log('\n🔍 Rodada 1 em todos os campeonatos:');
    outras.forEach(o => console.log(`  - Campeonato ${o.campeonato_id}: ${o.jogos} jogos`));

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
