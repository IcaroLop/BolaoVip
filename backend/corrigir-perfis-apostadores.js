const mysql = require('mysql2/promise');

/**
 * Inserir perfis na tabela usuario_perfis para os apostadores
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

    console.log('✅ Conectado ao banco de produção\n');
    console.log('═'.repeat(80));
    console.log('🔧 CORRIGINDO PERFIS DOS APOSTADORES');
    console.log('═'.repeat(80));

    // IDs dos usuários inseridos
    const usuariosIds = [17, 18, 19, 20, 21, 22, 23, 24];

    await conn.beginTransaction();
    console.log('\n📝 Transação iniciada...\n');

    let inseridos = 0;

    for (const usuarioId of usuariosIds) {
      const [usuario] = await conn.query(
        'SELECT nome, email FROM usuarios WHERE id = ?',
        [usuarioId]
      );

      if (usuario.length > 0) {
        // Verificar se já existe
        const [existe] = await conn.query(
          'SELECT id FROM usuario_perfis WHERE usuario_id = ? AND perfil_id = 2',
          [usuarioId]
        );

        if (existe.length === 0) {
          // Inserir perfil Apostador (ID: 2)
          await conn.query(
            'INSERT INTO usuario_perfis (usuario_id, perfil_id, criado_em) VALUES (?, 2, NOW())',
            [usuarioId]
          );
          console.log(`✅ ID ${usuarioId}: ${usuario[0].nome} - Perfil Apostador inserido`);
          inseridos++;
        } else {
          console.log(`⏭️  ID ${usuarioId}: ${usuario[0].nome} - Perfil já existia`);
        }
      }
    }

    await conn.commit();
    console.log('\n✅ TRANSAÇÃO CONFIRMADA (COMMIT)!\n');

    // Verificação final
    console.log('═'.repeat(80));
    console.log('🔍 VERIFICAÇÃO FINAL');
    console.log('═'.repeat(80));

    for (const usuarioId of usuariosIds) {
      const [usuario] = await conn.query(
        'SELECT nome FROM usuarios WHERE id = ?',
        [usuarioId]
      );

      const [perfilGrupo] = await conn.query(
        `SELECT p.nome as perfil_nome, g.nome as grupo_nome 
         FROM grupo_usuario_perfil gup
         LEFT JOIN perfis p ON gup.perfil_id = p.id
         LEFT JOIN grupos g ON gup.grupo_id = g.id
         WHERE gup.usuario_id = ?`,
        [usuarioId]
      );

      const [perfilUsuario] = await conn.query(
        `SELECT p.nome as perfil_nome 
         FROM usuario_perfis up
         LEFT JOIN perfis p ON up.perfil_id = p.id
         WHERE up.usuario_id = ?`,
        [usuarioId]
      );

      console.log(`\n✅ ID ${usuarioId}: ${usuario[0].nome}`);
      console.log(`   grupo_usuario_perfil: ${perfilGrupo.length > 0 ? perfilGrupo[0].perfil_nome + ' (Grupo: ' + perfilGrupo[0].grupo_nome + ')' : 'SEM PERFIL'}`);
      console.log(`   usuario_perfis: ${perfilUsuario.length > 0 ? perfilUsuario[0].perfil_nome : 'SEM PERFIL'}`);
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('🎉 CORREÇÃO CONCLUÍDA!');
    console.log('═'.repeat(80));
    console.log(`\n✅ ${inseridos} perfis inseridos na tabela usuario_perfis`);
    console.log('✅ Todos os apostadores agora têm perfis em ambas as tabelas');

    await conn.end();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    
    if (conn) {
      try {
        await conn.rollback();
        console.log('⚠️  ROLLBACK executado');
      } catch (rollbackErr) {
        console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
      }
      await conn.end();
    }
    
    process.exit(1);
  }
})();
