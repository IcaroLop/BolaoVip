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

    console.log('✅ Conectado ao banco de produção via túnel SSH\n');

    // 1. Verificar estrutura da tabela rodadas
    const [cols] = await conn.query('DESCRIBE rodadas');
    console.log('📋 Estrutura da tabela rodadas:');
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

    // 2. Verificar rodada 1
    const [rodadas] = await conn.query(
      'SELECT * FROM rodadas WHERE numero = 1'
    );
    console.log('\n📊 Rodada 1:', JSON.stringify(rodadas, null, 2));

    // 3. Contar jogos da rodada 1
    const [jogos] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('finalizado', 'encerrado', 'Finalizado', 'Encerrado') THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 ELSE 0 END) as com_placar
      FROM jogos 
      WHERE rodada = 1 AND campeonato_id = 10
    `);
    console.log('\n🏟️  Resumo dos jogos:', JSON.stringify(jogos, null, 2));

    // 4. Listar todos os jogos
    const [lista] = await conn.query(`
      SELECT time_mandante, time_visitante, placar_mandante, placar_visitante, status
      FROM jogos
      WHERE rodada = 1 AND campeonato_id = 10
      ORDER BY id
    `);
    console.log('\n📋 Lista de jogos:');
    lista.forEach((j, idx) => {
      console.log(`${idx+1}. ${j.time_mandante} ${j.placar_mandante ?? '?'} x ${j.placar_visitante ?? '?'} ${j.time_visitante} [${j.status}]`);
    });

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
