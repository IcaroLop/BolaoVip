const mysql = require('mysql2/promise');

/**
 * Diagnóstico completo da estrutura de usuários e times favoritos
 */

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

    // 1. Verificar estrutura da tabela usuarios
    console.log('═'.repeat(80));
    console.log('📋 TABELA: usuarios');
    console.log('═'.repeat(80));
    const [usuarios] = await conn.query('DESCRIBE usuarios');
    usuarios.forEach(col => {
      console.log(`  ${col.Field.padEnd(30)} | ${col.Type.padEnd(30)} | ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'.padEnd(8)} | ${col.Key || ''}`);
    });

    // 2. Verificar se existem tabelas de times favoritos
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 Buscando tabelas relacionadas a times favoritos');
    console.log('═'.repeat(80));
    const [tables] = await conn.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'bolaovip' 
      AND (TABLE_NAME LIKE '%time%' OR TABLE_NAME LIKE '%favorito%' OR TABLE_NAME LIKE '%clube%')
    `);
    
    if (tables.length > 0) {
      console.log('Tabelas encontradas:');
      tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
      
      // Verificar a primeira tabela encontrada
      if (tables.length > 0) {
        const tableName = tables[0].TABLE_NAME;
        console.log(`\n  Estrutura de ${tableName}:`);
        const [cols] = await conn.query(`DESCRIBE ${tableName}`);
        cols.forEach(col => {
          console.log(`    ${col.Field.padEnd(25)} | ${col.Type.padEnd(25)} | ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
      }
    } else {
      console.log('❌ Nenhuma tabela de times/favoritos encontrada');
    }

    // 3. Verificar grupo BolaoBrasileiraoA
    console.log('\n' + '═'.repeat(80));
    console.log('👥 Verificando grupo: BolaoBrasileiraoA');
    console.log('═'.repeat(80));
    const [grupos] = await conn.query(
      `SELECT id, nome FROM grupos WHERE nome = 'BolaoBrasileiraoA' OR nome LIKE '%BolaoBrasileiráo%' OR nome LIKE '%Brasileirao%' LIMIT 1`
    );
    
    if (grupos.length > 0) {
      console.log('✅ Grupo encontrado:');
      console.log(`  ID: ${grupos[0].id}`);
      console.log(`  Nome: ${grupos[0].nome}`);
    } else {
      console.log('❌ Grupo não encontrado - Lista de grupos disponíveis:');
      const [todosGrupos] = await conn.query(`SELECT id, nome FROM grupos LIMIT 10`);
      todosGrupos.forEach(g => console.log(`  - ID: ${g.id}, Nome: ${g.nome}`));
    }

    // 4. Verificar campo de primeira alteração de senha
    console.log('\n' + '═'.repeat(80));
    console.log('🔐 Verificando campos de primeira alteração de senha');
    console.log('═'.repeat(80));
    
    const colunasBuscadas = [
      'primeira_alteracao_obrigatoria',
      'primeira_alteracao',
      'precisa_alterar_senha',
      'primeiro_acesso',
      'force_password_change'
    ];
    
    const usuariosInfo = usuarios.map(u => u.Field.toLowerCase());
    const encontrados = colunasBuscadas.filter(col => usuariosInfo.includes(col.toLowerCase()));
    
    if (encontrados.length > 0) {
      console.log('✅ Campo(s) encontrado(s):');
      encontrados.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('❌ Nenhum campo de primeira alteração encontrado');
      console.log('\nCampos de senha disponíveis na tabela usuarios:');
      usuarios.filter(u => u.Field.toLowerCase().includes('senha') || u.Field.toLowerCase().includes('password'))
        .forEach(u => console.log(`  - ${u.Field}`));
    }

    // 5. Contar usuários existentes
    console.log('\n' + '═'.repeat(80));
    console.log('📊 Estatísticas');
    console.log('═'.repeat(80));
    const [stats] = await conn.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM grupos) as total_grupos,
        (SELECT COUNT(*) FROM usuarios WHERE perfil = 'Apostador') as apostadores
    `);
    console.log(`  Total de usuários: ${stats[0].total_usuarios}`);
    console.log(`  Total de grupos: ${stats[0].total_grupos}`);
    console.log(`  Total de apostadores: ${stats[0].apostadores}`);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
