const mysql = require('mysql2/promise');

const usuarios = [
  { id: 8, nome: 'ALEXANDRE' },
  { id: 17, nome: 'ANTONIO' },
  { id: 19, nome: 'CASSIANO' },
  { id: 24, nome: 'DENNYS' },
  { id: 7, nome: 'ICARO' },
  { id: 18, nome: 'JAIME' },
  { id: 21, nome: 'JORGE' },
  { id: 9, nome: 'RONALDO' },
  { id: 23, nome: 'SAMUEL' },
  { id: 25, nome: 'DINEY' },
  { id: 26, nome: 'RODRIGUES' }
];

const grupoId = 3; // BolaoBrasileiraoA
const perfilId = 2; // Apostador

async function inserirUsuariosNoGrupo() {
  const conexao = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });

  try {
    console.log('🔍 Verificando quais usuários já estão no grupo BolaoBrasileiraoA...\n');

    // Verificar quais usuários já estão no grupo
    const [jaNoGrupo] = await conexao.query(
      `SELECT usuario_id FROM grupo_usuario_perfil 
       WHERE grupo_id = ? AND perfil_id = ? AND usuario_id IN (?)`,
      [grupoId, perfilId, usuarios.map(u => u.id)]
    );

    const idsJaNoGrupo = jaNoGrupo.map(row => row.usuario_id);
    
    console.log('✅ Usuários que JÁ ESTÃO no grupo:');
    usuarios.forEach(u => {
      if (idsJaNoGrupo.includes(u.id)) {
        console.log(`   - ${u.nome} (ID: ${u.id})`);
      }
    });

    const usuariosParaInserir = usuarios.filter(u => !idsJaNoGrupo.includes(u.id));

    if (usuariosParaInserir.length === 0) {
      console.log('\n✨ Todos os usuários já estão no grupo BolaoBrasileiraoA!');
      return;
    }

    console.log('\n➕ Usuários que SERÃO INSERIDOS no grupo:');
    usuariosParaInserir.forEach(u => {
      console.log(`   - ${u.nome} (ID: ${u.id})`);
    });

    // Inserir os usuários que faltam
    await conexao.beginTransaction();

    for (const usuario of usuariosParaInserir) {
      await conexao.query(
        `INSERT INTO grupo_usuario_perfil (grupo_id, usuario_id, perfil_id) 
         VALUES (?, ?, ?)`,
        [grupoId, usuario.id, perfilId]
      );
      console.log(`   ✅ ${usuario.nome} inserido com sucesso`);
    }

    await conexao.commit();

    console.log('\n✅ Operação concluída com sucesso!');
    console.log(`   - ${idsJaNoGrupo.length} usuários já estavam no grupo`);
    console.log(`   - ${usuariosParaInserir.length} usuários foram inseridos`);
    console.log(`   - Total no grupo: ${usuarios.length} usuários`);

    // Verificação final
    console.log('\n🔍 Verificação final:');
    const [verificacao] = await conexao.query(
      `SELECT u.id, u.nome, gup.grupo_id
       FROM usuarios u
       LEFT JOIN grupo_usuario_perfil gup ON u.id = gup.usuario_id AND gup.grupo_id = ? AND gup.perfil_id = ?
       WHERE u.id IN (?)
       ORDER BY u.nome`,
      [grupoId, perfilId, usuarios.map(u => u.id)]
    );

    verificacao.forEach(row => {
      const status = row.grupo_id === grupoId ? '✅' : '❌';
      console.log(`   ${status} ${row.nome} (ID: ${row.id})`);
    });

  } catch (erro) {
    await conexao.rollback();
    console.error('❌ Erro ao inserir usuários no grupo:', erro);
  } finally {
    await conexao.end();
  }
}

inserirUsuariosNoGrupo();
