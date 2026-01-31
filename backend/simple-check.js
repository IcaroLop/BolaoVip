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

    console.log('✅ Verificando estrutura de tabelas\n');

    // Verificar tabelas de perfis
    const [tables] = await conn.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME LIKE '%perfil%'
    `);

    console.log('Tabelas de perfis encontradas:');
    for (const table of tables) {
      console.log(`\n  📋 ${table.TABLE_NAME}`);
      const [cols] = await conn.query(`DESCRIBE ${table.TABLE_NAME}`);
      cols.forEach(c => console.log(`     ${c.Field.padEnd(20)} | ${c.Type}`));
    }

    // Buscar perfis em qualquer tabela
    console.log('\n\n═'.repeat(40));
    console.log('Buscando dados de perfis...\n');

    try {
      const [perfis] = await conn.query(`SELECT * FROM perfis`);
      console.log(`✅ Tabela 'perfis' encontrada (${perfis.length} registros)`);
      perfis.forEach(p => {
        console.log(`  - ID: ${p.id || 'N/A'}, Nome: ${p.nome || 'N/A'}`);
      });
    } catch (e) {
      console.log('❌ Tabela perfis não encontrada');
    }

    // Buscar grupo
    console.log('\n\n═'.repeat(40));
    console.log('Informações do grupo BolaoBrasileiraoA\n');
    const [grupo] = await conn.query(`SELECT * FROM grupos WHERE nome LIKE '%BolaoBrasileiráo%' OR nome LIKE '%BolaoBrasileiro%'`);
    if (grupo.length > 0) {
      console.log(`✅ Grupo encontrado:`);
      console.log(`  ID: ${grupo[0].id}`);
      console.log(`  Nome: ${grupo[0].nome}`);
    }

    // Usuários atuais
    console.log('\n\n═'.repeat(40));
    console.log('Estatísticas de usuários\n');
    const [stats] = await conn.query(`SELECT COUNT(*) as total FROM usuarios`);
    console.log(`Total de usuários: ${stats[0].total}`);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exit(1);
  }
})();
