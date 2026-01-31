const mysql = require('mysql2/promise');

/**
 * Verificar quais usuários da tabela de palpites existem no grupo BolaoBrasileiraoA
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

    console.log('✅ Conectado ao banco de produção\n');
    console.log('═'.repeat(80));
    console.log('🔍 VERIFICAÇÃO DE USUÁRIOS - JOGO: Vitória x Remo (Rodada 1)');
    console.log('═'.repeat(80));

    // Usuários da tabela de palpites
    const usuariosNome = [
      'ALEXANDRE',
      'CASSIANO',
      'ANTONIO',
      'DENNYS',
      'DINEY',
      'ICARO',
      'JAIME',
      'JORGE',
      'RODRIGUES',
      'RONALDO',
      'SAMUEL'
    ];

    console.log('\n1️⃣ Verificando cada usuário no banco:\n');

    const usuariosEncontrados = [];
    const usuariosDesconhecidos = [];

    for (const nomeUsuario of usuariosNome) {
      // Buscar por nome (case-insensitive)
      const [usuarios] = await conn.query(
        `SELECT u.id, u.nome, u.email 
         FROM usuarios u
         WHERE UPPER(u.nome) LIKE ? OR UPPER(u.nome) LIKE ? OR u.nome LIKE ?
         LIMIT 5`,
        [`%${nomeUsuario}%`, `${nomeUsuario}%`, nomeUsuario]
      );

      if (usuarios.length > 0) {
        // Verificar se está no grupo BolaoBrasileiraoA (grupo_id = 3)
        const [pertenceGrupo] = await conn.query(
          `SELECT gup.id FROM grupo_usuario_perfil gup
           WHERE gup.usuario_id = ? AND gup.grupo_id = 3`,
          [usuarios[0].id]
        );

        const estaNoGrupo = pertenceGrupo.length > 0;
        
        console.log(`✅ "${nomeUsuario}"`);
        console.log(`   ID: ${usuarios[0].id}`);
        console.log(`   Nome completo: ${usuarios[0].nome}`);
        console.log(`   Email: ${usuarios[0].email}`);
        console.log(`   No grupo BolaoBrasileiraoA: ${estaNoGrupo ? 'SIM ✅' : 'NÃO ❌'}`);
        console.log();

        usuariosEncontrados.push({
          nome: nomeUsuario,
          id: usuarios[0].id,
          nomeCompleto: usuarios[0].nome,
          email: usuarios[0].email,
          noGrupo: estaNoGrupo
        });

      } else {
        console.log(`❌ "${nomeUsuario}" - NÃO ENCONTRADO no banco`);
        console.log();
        usuariosDesconhecidos.push(nomeUsuario);
      }
    }

    // Resumo
    console.log('═'.repeat(80));
    console.log('📊 RESUMO');
    console.log('═'.repeat(80));

    console.log(`\n✅ Usuários encontrados e no grupo: ${usuariosEncontrados.filter(u => u.noGrupo).length}`);
    usuariosEncontrados.filter(u => u.noGrupo).forEach(u => {
      console.log(`   - ${u.nome} (ID: ${u.id})`);
    });

    console.log(`\n⚠️  Usuários encontrados MAS NÃO no grupo BolaoBrasileiraoA: ${usuariosEncontrados.filter(u => !u.noGrupo).length}`);
    usuariosEncontrados.filter(u => !u.noGrupo).forEach(u => {
      console.log(`   - ${u.nome} (ID: ${u.id}) - Email: ${u.email}`);
    });

    console.log(`\n❌ Usuários NÃO encontrados no banco: ${usuariosDesconhecidos.length}`);
    usuariosDesconhecidos.forEach(u => {
      console.log(`   - ${u}`);
    });

    // Listar todos os usuários do grupo BolaoBrasileiraoA
    console.log('\n' + '═'.repeat(80));
    console.log('📋 TODOS OS USUÁRIOS DO GRUPO BolaoBrasileiraoA');
    console.log('═'.repeat(80));
    
    const [todosGrupo] = await conn.query(`
      SELECT DISTINCT u.id, u.nome, u.email
      FROM usuarios u
      INNER JOIN grupo_usuario_perfil gup ON u.id = gup.usuario_id
      WHERE gup.grupo_id = 3
      ORDER BY u.nome
    `);

    console.log(`\nTotal: ${todosGrupo.length} usuários\n`);
    todosGrupo.forEach((u, idx) => {
      console.log(`${String(idx + 1).padStart(2, ' ')}. ${u.nome.padEnd(40)} | ID: ${u.id}`);
    });

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
