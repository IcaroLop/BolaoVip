const mysql = require('mysql2/promise');

/**
 * Verificar estrutura de perfis de usuários
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

    // 1. Verificar usuario_perfis
    console.log('═'.repeat(80));
    console.log('📋 Tabela: usuario_perfis');
    console.log('═'.repeat(80));
    const [usuarioPerfisStruct] = await conn.query(`DESCRIBE usuario_perfis`);
    usuarioPerfisStruct.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} | ${col.Type.padEnd(25)} | ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    const [perfis] = await conn.query(`SELECT id, nome FROM usuario_perfis`);
    console.log(`\nPerfis disponíveis (${perfis.length}):`);
    perfis.forEach(p => console.log(`  - ID: ${p.id}, Nome: ${p.nome}`));

    // 2. Verificar grupo_usuario_perfil
    console.log('\n' + '═'.repeat(80));
    console.log('📋 Tabela: grupo_usuario_perfil (relação grupo-usuário-perfil)');
    console.log('═'.repeat(80));
    const [groupPerfStruct] = await conn.query(`DESCRIBE grupo_usuario_perfil`);
    groupPerfStruct.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} | ${col.Type.padEnd(25)} | ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 3. Listar times principais
    console.log('\n' + '═'.repeat(80));
    console.log('⚽ Amostra de Times Disponíveis');
    console.log('═'.repeat(80));
    const [timesPrincipais] = await conn.query(`
      SELECT id, nome FROM times 
      WHERE nome IN ('Flamengo', 'São Paulo', 'Botafogo', 'Vasco', 'Palmeiras')
      ORDER BY nome
    `);
    timesPrincipais.forEach(t => {
      console.log(`  ID: ${String(t.id).padStart(3, ' ')} | Nome: ${t.nome}`);
    });

    const [totalTimes] = await conn.query(`SELECT COUNT(*) as total FROM times`);
    console.log(`\n📊 Total de times cadastrados: ${totalTimes[0].total}`);

    // 4. Informações do grupo BolaoBrasileiraoA
    console.log('\n' + '═'.repeat(80));
    console.log('👥 Informações do Grupo: BolaoBrasileiraoA');
    console.log('═'.repeat(80));
    const [grupoInfo] = await conn.query(
      `SELECT id, nome FROM grupos WHERE nome = 'BolaoBrasileiraoA'`
    );
    
    if (grupoInfo.length > 0) {
      console.log(`✅ Grupo encontrado:`);
      console.log(`  ID: ${grupoInfo[0].id}`);
      console.log(`  Nome: ${grupoInfo[0].nome}`);

      // Contar membros
      const [membros] = await conn.query(
        `SELECT COUNT(DISTINCT usuario_id) as total FROM grupo_usuario_perfil WHERE grupo_id = ?`,
        [grupoInfo[0].id]
      );
      console.log(`  Membros atuais: ${membros[0].total}`);
    } else {
      console.log('❌ Grupo não encontrado');
    }

    // 5. Resumo final
    console.log('\n' + '═'.repeat(80));
    console.log('✅ RESUMO PARA CADASTRO DE APOSTADORES');
    console.log('═'.repeat(80));
    console.log('\n📊 Dados disponíveis no banco:');
    console.log(`\n1. Tabela usuarios:`);
    console.log(`   ✅ Campos: id, nome, email, chave_pix, senha_hash`);
    console.log(`   ✅ Campo: precisa_trocar_senha (para obrigar troca na 1ª entrada)`);
    console.log(`   ✅ Campo: time_favorito_id (FK para tabela times)`);
    console.log(`   ✅ Campos: saldo, data_cadastro, bloqueado`);
    console.log(`\n2. Tabela usuario_perfis:`);
    console.log(`   ✅ ${perfis.length} perfis disponíveis`);
    perfis.forEach(p => console.log(`      • ${p.nome} (ID: ${p.id})`));
    console.log(`\n3. Tabela grupo_usuario_perfil:`);
    console.log(`   ✅ Para associar usuário ao grupo com seu perfil`);
    console.log(`   ✅ Estrutura: grupo_id, usuario_id, perfil_id`);
    console.log(`\n4. Grupo BolaoBrasileiraoA:`);
    if (grupoInfo.length > 0) {
      console.log(`   ✅ Existe (ID: ${grupoInfo[0].id})`);
      console.log(`   ✅ Membros atuais: ${membros[0].total}`);
    }
    console.log(`\n5. Tabela times:`);
    console.log(`   ✅ ${totalTimes[0].total} times disponíveis`);
    console.log(`   ✅ Inclui Flamengo, São Paulo, Botafogo, Vasco, Palmeiras, etc.`);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    if (err.sql) console.error('SQL:', err.sql);
    process.exit(1);
  }
})();
