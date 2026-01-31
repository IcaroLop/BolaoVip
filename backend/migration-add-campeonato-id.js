const mysql = require('mysql2/promise');

/**
 * Migration: Adiciona coluna campeonato_id à tabela rodadas
 * Conecta via túnel SSH (porta 3307) para banco de produção
 */

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'fBVhh6w2KW',
      database: 'bolaovip'
    });

    console.log('✅ Conectado ao banco de produção via túnel SSH\n');

    // 1. Verificar se coluna já existe
    const [colunas] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'rodadas' AND COLUMN_NAME = 'campeonato_id'`
    );

    if (colunas.length > 0) {
      console.log('⚠️  Coluna campeonato_id já existe na tabela rodadas');
      await conn.end();
      process.exit(0);
    }

    // 2. Adicionar coluna campeonato_id
    console.log('📋 Adicionando coluna campeonato_id à tabela rodadas...');
    await conn.query(
      `ALTER TABLE rodadas ADD COLUMN campeonato_id INT NOT NULL DEFAULT 10 AFTER numero`
    );
    console.log('✅ Coluna campeonato_id adicionada com DEFAULT=10\n');

    // 3. Criar índice UNIQUE (numero, campeonato_id) para garantir unicidade
    console.log('📋 Criando índice UNIQUE em (numero, campeonato_id)...');
    await conn.query(
      `ALTER TABLE rodadas ADD UNIQUE KEY uk_rodada_campeonato (numero, campeonato_id)`
    );
    console.log('✅ Índice UNIQUE criado\n');

    // 4. Verificar estrutura final
    const [estrutura] = await conn.query(
      `DESCRIBE rodadas`
    );
    console.log('📊 Estrutura final da tabela rodadas:');
    console.log(estrutura.map(c => `  ${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'}`).join('\n'));

    // 5. Verificar dados
    const [dados] = await conn.query(
      `SELECT numero, campeonato_id, pagamentos_gerados, pagamentos_gerados_em FROM rodadas LIMIT 5`
    );
    console.log('\n📋 Primeiras 5 rodadas:');
    console.log(JSON.stringify(dados, null, 2));

    console.log('\n✅ Migration executada com sucesso!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO durante migration:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
})();
