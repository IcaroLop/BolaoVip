const pool = require('../database/conexao');

async function verificarGrupos() {
  try {
    console.log('=== Verificando dados de grupos ===\n');

    // 1. Listar todos os grupos
    const [grupos] = await pool.query(`
      SELECT id, nome, campeonato_id, criado_por 
      FROM grupos 
      ORDER BY id
    `);

    console.log('📋 Grupos existentes:');
    grupos.forEach(g => {
      console.log(`  Grupo ID ${g.id}: "${g.nome}" (campeonato: ${g.campeonato_id}, criado por: ${g.criado_por})`);
    });

    // 2. Listar todos os membros de grupos
    const [membros] = await pool.query(`
      SELECT gm.grupo_id, gm.usuario_id, gm.papel, gm.status, u.nome as usuario_nome
      FROM grupo_membros gm
      JOIN usuarios u ON gm.usuario_id = u.id
      ORDER BY gm.grupo_id, gm.usuario_id
    `);

    console.log('\n👥 Membros de grupos:');
    membros.forEach(m => {
      console.log(`  Grupo ${m.grupo_id}: ${m.usuario_name || 'User'} (ID ${m.usuario_id}) - papel: ${m.papel} - status: ${m.status}`);
    });

    // 3. Listar usuários
    const [usuarios] = await pool.query(`
      SELECT id, nome, email FROM usuarios ORDER BY id
    `);

    console.log('\n🔐 Usuários no sistema:');
    usuarios.forEach(u => {
      console.log(`  ID ${u.id}: ${u.nome} (${u.email})`);
    });

    // 4. Verificar tabela grupo_usuario_perfil
    try {
      const [tableExists] = await pool.query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'grupo_usuario_perfil'
      `);

      if (tableExists[0].count > 0) {
        console.log('\n✅ Tabela grupo_usuario_perfil existe');
        const [perfisGrupo] = await pool.query(`
          SELECT grupo_id, usuario_id, perfil_id FROM grupo_usuario_perfil ORDER BY grupo_id, usuario_id
        `);
        console.log('   Registros:');
        perfisGrupo.forEach(p => {
          console.log(`     Grupo ${p.grupo_id}: Usuario ${p.usuario_id} - Perfil ${p.perfil_id}`);
        });
      } else {
        console.log('\n❌ Tabela grupo_usuario_perfil NÃO existe - EXECUTE O SCRIPT alter_perfis_por_grupo.sql');
      }
    } catch (err) {
      console.log('\n❌ Erro ao verificar grupo_usuario_perfil:', err.message);
    }

    console.log('\n=== Resumo ===');
    console.log(`Total de grupos: ${grupos.length}`);
    console.log(`Total de usuários: ${usuarios.length}`);
    console.log(`Total de membros: ${membros.length}`);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

verificarGrupos();
