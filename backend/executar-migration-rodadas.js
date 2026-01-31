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
    console.log('🚀 Iniciando migration: add_campeonato_id_to_rodadas...\n');

    // 1. Adicionar coluna campeonato_id
    console.log('1️⃣  Adicionando coluna campeonato_id...');
    await conn.query(`
      ALTER TABLE rodadas 
      ADD COLUMN campeonato_id INT NULL AFTER numero
    `);
    console.log('   ✅ Coluna adicionada\n');

    // 2. Remover constraint UNIQUE de numero
    console.log('2️⃣  Removendo constraint UNIQUE de numero...');
    await conn.query(`ALTER TABLE rodadas DROP INDEX numero`);
    console.log('   ✅ Constraint removido\n');

    // 3. Criar constraint UNIQUE composto
    console.log('3️⃣  Criando UNIQUE KEY (numero, campeonato_id)...');
    await conn.query(`
      ALTER TABLE rodadas 
      ADD UNIQUE KEY unique_rodada_campeonato (numero, campeonato_id)
    `);
    console.log('   ✅ Constraint criado\n');

    // 4. Atualizar rodadas existentes baseado nos jogos
    console.log('4️⃣  Populando campeonato_id baseado nos jogos...');
    await conn.query(`
      UPDATE rodadas r
      SET r.campeonato_id = (
        SELECT j.campeonato_id 
        FROM jogos j 
        WHERE j.rodada = r.numero 
        LIMIT 1
      )
    `);
    const [updated] = await conn.query(`SELECT COUNT(*) as total FROM rodadas WHERE campeonato_id IS NOT NULL`);
    console.log(`   ✅ ${updated[0].total} rodadas atualizadas\n`);

    // 5. Tornar campeonato_id NOT NULL
    console.log('5️⃣  Tornando campeonato_id NOT NULL...');
    await conn.query(`
      ALTER TABLE rodadas 
      MODIFY COLUMN campeonato_id INT NOT NULL
    `);
    console.log('   ✅ Coluna configurada como NOT NULL\n');

    // 6. Resetar pagamentos_gerados
    console.log('6️⃣  Resetando pagamentos_gerados para permitir regeneração...');
    const [reset] = await conn.query(`
      UPDATE rodadas 
      SET pagamentos_gerados = 0, 
          pagamentos_gerados_em = NULL
    `);
    console.log(`   ✅ ${reset.affectedRows} rodadas resetadas\n`);

    // Verificação final
    console.log('📋 Verificação final - Rodadas por campeonato:\n');
    const [rodadas] = await conn.query(`
      SELECT campeonato_id, COUNT(*) as total,
             SUM(pagamentos_gerados) as com_pagamentos
      FROM rodadas
      GROUP BY campeonato_id
      ORDER BY campeonato_id
    `);
    rodadas.forEach(r => {
      console.log(`   Campeonato ${r.campeonato_id}: ${r.total} rodadas (${r.com_pagamentos} com pagamentos gerados)`);
    });

    console.log('\n✅ Migration concluída com sucesso!');
    
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERRO na migration:', err.message);
    console.error('SQL State:', err.sqlState);
    console.error('SQL Message:', err.sqlMessage);
    process.exit(1);
  }
})();
