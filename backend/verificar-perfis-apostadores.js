const mysql = require('mysql2/promise');

/**
 * Verificar perfis dos usuários recém-inseridos
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
    console.log('🔍 VERIFICAÇÃO DE PERFIS DOS APOSTADORES');
    console.log('═'.repeat(80));

    // IDs dos usuários inseridos
    const usuariosIds = [17, 18, 19, 20, 21, 22, 23, 24];

    console.log('\n1️⃣ Verificando tabela grupo_usuario_perfil:\n');
    
    for (const usuarioId of usuariosIds) {
      const [usuario] = await conn.query(
        'SELECT nome, email FROM usuarios WHERE id = ?',
        [usuarioId]
      );

      if (usuario.length > 0) {
        const [perfisGrupo] = await conn.query(
          `SELECT gup.*, p.nome as perfil_nome, g.nome as grupo_nome 
           FROM grupo_usuario_perfil gup
           LEFT JOIN perfis p ON gup.perfil_id = p.id
           LEFT JOIN grupos g ON gup.grupo_id = g.id
           WHERE gup.usuario_id = ?`,
          [usuarioId]
        );

        console.log(`ID ${usuarioId}: ${usuario[0].nome}`);
        if (perfisGrupo.length > 0) {
          perfisGrupo.forEach(p => {
            console.log(`  ✅ Grupo: ${p.grupo_nome} | Perfil: ${p.perfil_nome}`);
          });
        } else {
          console.log(`  ❌ SEM PERFIS/GRUPOS`);
        }
      }
    }

    // Verificar se existe outra tabela de perfis de usuário
    console.log('\n2️⃣ Verificando tabela usuario_perfis:\n');
    
    const [estrutura] = await conn.query('DESCRIBE usuario_perfis');
    console.log('Estrutura da tabela usuario_perfis:');
    estrutura.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} | ${col.Type}`);
    });

    console.log('\n3️⃣ Verificando perfis na tabela usuario_perfis:\n');

    for (const usuarioId of usuariosIds) {
      const [usuario] = await conn.query(
        'SELECT nome FROM usuarios WHERE id = ?',
        [usuarioId]
      );

      const [perfisUsuario] = await conn.query(
        `SELECT up.*, p.nome as perfil_nome 
         FROM usuario_perfis up
         LEFT JOIN perfis p ON up.perfil_id = p.id
         WHERE up.usuario_id = ?`,
        [usuarioId]
      );

      console.log(`ID ${usuarioId}: ${usuario[0].nome}`);
      if (perfisUsuario.length > 0) {
        perfisUsuario.forEach(p => {
          console.log(`  ✅ Perfil: ${p.perfil_nome}`);
        });
      } else {
        console.log(`  ❌ SEM PERFIS na tabela usuario_perfis`);
      }
    }

    // Verificar estrutura completa
    console.log('\n4️⃣ Comparando estruturas:\n');
    
    const [tabelas] = await conn.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'bolaovip' 
      AND (TABLE_NAME LIKE '%perfil%' OR TABLE_NAME LIKE '%usuario%')
      ORDER BY TABLE_NAME
    `);

    console.log('Tabelas relacionadas a usuários e perfis:');
    tabelas.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
