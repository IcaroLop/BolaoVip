const pool = require('../database/conexao');

async function promoverAdminEExecutarDDL() {
  try {
    console.log('🔧 Iniciando correções...\n');

    // 1. Promover o criador do grupo como admin
    console.log('1️⃣  Promovendo usuário 7 como admin do grupo 1...');
    await pool.query(
      `UPDATE grupo_membros SET papel = 'admin' WHERE grupo_id = 1 AND usuario_id = 7`
    );
    console.log('   ✅ Usuário 7 agora é admin do grupo 1\n');

    // 2. Executar DDL - Criar tabela grupo_usuario_perfil se não existir
    console.log('2️⃣  Executando DDL para criar tabela grupo_usuario_perfil...');
    
    const [tableExists] = await pool.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'grupo_usuario_perfil'
    `);

    if (tableExists[0].count > 0) {
      console.log('   ℹ️  Tabela grupo_usuario_perfil já existe\n');
    } else {
      console.log('   ⏳ Criando tabela grupo_usuario_perfil...');
      
      await pool.query(`
        CREATE TABLE grupo_usuario_perfil (
          id INT PRIMARY KEY AUTO_INCREMENT,
          grupo_id INT NOT NULL,
          usuario_id INT NOT NULL,
          perfil_id INT NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_grupo_usuario_perfil (grupo_id, usuario_id, perfil_id),
          FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE
        )
      `);
      
      console.log('   ✅ Tabela criada com sucesso\n');

      // Criar índices
      console.log('   ⏳ Criando índices...');
      await pool.query(`CREATE INDEX idx_grupo_usuario_perfil_grupo ON grupo_usuario_perfil(grupo_id)`);
      await pool.query(`CREATE INDEX idx_grupo_usuario_perfil_usuario ON grupo_usuario_perfil(usuario_id)`);
      await pool.query(`CREATE INDEX idx_grupo_usuario_perfil_perfil ON grupo_usuario_perfil(perfil_id)`);
      console.log('   ✅ Índices criados\n');
    }

    // 3. Verificar perfis disponíveis
    console.log('3️⃣  Perfis disponíveis:');
    const [perfis] = await pool.query(`SELECT id, nome FROM perfis ORDER BY id`);
    perfis.forEach(p => {
      console.log(`   - ID ${p.id}: ${p.nome}`);
    });

    // 4. Inserir perfis padrão para os membros do grupo (Apostador)
    console.log('\n4️⃣  Atribuindo perfil padrão (Apostador) aos membros...');
    const apostadorId = perfis.find(p => p.nome === 'Apostador')?.id || 2; // Assumindo que Apostador é ID 2
    
    for (const membro of [{usuarioId: 6}, {usuarioId: 7}]) {
      try {
        await pool.query(
          `INSERT INTO grupo_usuario_perfil (grupo_id, usuario_id, perfil_id) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE atualizado_em = CURRENT_TIMESTAMP`,
          [1, membro.usuarioId, apostadorId]
        );
        console.log(`   ✅ Usuário ${membro.usuarioId} - Perfil Apostador atribuído`);
      } catch (err) {
        console.log(`   ⚠️  Usuário ${membro.usuarioId}: ${err.message}`);
      }
    }

    console.log('\n✨ Todas as correções foram aplicadas!\n');

    // 5. Verificação final
    console.log('5️⃣  Verificação final:');
    const [membrosFinal] = await pool.query(`
      SELECT gm.usuario_id, u.nome, gm.papel, 
             GROUP_CONCAT(p.nome) as perfis
      FROM grupo_membros gm
      JOIN usuarios u ON gm.usuario_id = u.id
      LEFT JOIN grupo_usuario_perfil gup ON gm.grupo_id = gup.grupo_id AND gm.usuario_id = gup.usuario_id
      LEFT JOIN perfis p ON gup.perfil_id = p.id
      WHERE gm.grupo_id = 1
      GROUP BY gm.usuario_id, u.nome, gm.papel
      ORDER BY gm.usuario_id
    `);

    console.log('   Membros do grupo 1 (BolaoChampions):');
    membrosFinal.forEach(m => {
      console.log(`   - ${m.nome} (ID ${m.usuario_id}): papel=${m.papel}, perfis=${m.perfis || 'nenhum'}`);
    });

    console.log('\n🎉 Sistema pronto para usar!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

promoverAdminEExecutarDDL();
