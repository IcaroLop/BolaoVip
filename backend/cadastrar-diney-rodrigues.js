const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

/**
 * Cadastrar novos apostadores: Diney e Rodrigues
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
    console.log('🚀 CADASTRANDO NOVOS APOSTADORES');
    console.log('═'.repeat(80));

    // Novos apostadores
    const apostadores = [
      { 
        nome: 'Diney Gomes da Silva', 
        apelido: 'Diney',
        email: 'diney@email.com'
      },
      { 
        nome: 'Robson Rodrigues de Carvalho', 
        apelido: 'Rodrigues',
        email: 'rodrigues@email.com'
      }
    ];

    // Gerar hash da senha 123456
    const senhaHash = await bcrypt.hash('123456', 10);
    console.log('\n🔐 Hash da senha "123456" gerado\n');

    // Iniciar transação
    await conn.beginTransaction();
    console.log('📝 Transação iniciada...\n');

    const resultados = [];

    for (let i = 0; i < apostadores.length; i++) {
      const apostador = apostadores[i];
      
      try {
        console.log(`${i + 1}/${apostadores.length} - Cadastrando ${apostador.apelido} (${apostador.email})...`);

        // Verificar se email já existe
        const [existe] = await conn.query(
          'SELECT id FROM usuarios WHERE email = ?',
          [apostador.email]
        );

        if (existe.length > 0) {
          console.log(`   ⚠️  Email já cadastrado (ID: ${existe[0].id})`);
          resultados.push({
            sucesso: false,
            apelido: apostador.apelido,
            email: apostador.email,
            erro: 'Email já existe'
          });
          continue;
        }

        // 1. Inserir usuário
        const [resultUsuario] = await conn.query(
          `INSERT INTO usuarios 
           (nome, email, senha_hash, precisa_trocar_senha, data_cadastro, saldo, bloqueado) 
           VALUES (?, ?, ?, 1, NOW(), 0.00, 0)`,
          [apostador.nome, apostador.email, senhaHash]
        );

        const usuarioId = resultUsuario.insertId;
        console.log(`   ✅ Usuário inserido (ID: ${usuarioId})`);

        // 2. Inserir perfil global (usuario_perfis)
        await conn.query(
          `INSERT INTO usuario_perfis (usuario_id, perfil_id, criado_em) 
           VALUES (?, 2, NOW())`,
          [usuarioId]
        );
        console.log(`   ✅ Perfil Apostador inserido (usuario_perfis)`);

        // 3. Associar ao grupo BolaoBrasileiraoA com perfil Apostador
        await conn.query(
          `INSERT INTO grupo_usuario_perfil (grupo_id, usuario_id, perfil_id) 
           VALUES (3, ?, 2)`,
          [usuarioId]
        );
        console.log(`   ✅ Associado ao grupo BolaoBrasileiraoA`);

        resultados.push({
          sucesso: true,
          apelido: apostador.apelido,
          email: apostador.email,
          usuarioId: usuarioId
        });

      } catch (err) {
        console.log(`   ❌ ERRO ao cadastrar ${apostador.apelido}: ${err.message}`);
        resultados.push({
          sucesso: false,
          apelido: apostador.apelido,
          email: apostador.email,
          erro: err.message
        });
        throw err;
      }
    }

    // Commit da transação
    await conn.commit();
    console.log('\n✅ TRANSAÇÃO CONFIRMADA (COMMIT)!\n');

    // Relatório final
    console.log('═'.repeat(80));
    console.log('📊 RELATÓRIO FINAL');
    console.log('═'.repeat(80));

    const sucesso = resultados.filter(r => r.sucesso);
    const falhas = resultados.filter(r => !r.sucesso);

    console.log(`\n✅ Cadastros bem-sucedidos: ${sucesso.length}/${apostadores.length}\n`);
    sucesso.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.apelido.padEnd(20)} | ID: ${r.usuarioId} | ${r.email}`);
    });

    if (falhas.length > 0) {
      console.log(`\n❌ Falhas: ${falhas.length}\n`);
      falhas.forEach((r, idx) => {
        console.log(`  ${idx + 1}. ${r.apelido} - ${r.erro}`);
      });
    }

    // Verificação final
    if (sucesso.length > 0) {
      console.log('\n' + '═'.repeat(80));
      console.log('🔍 VERIFICAÇÃO FINAL');
      console.log('═'.repeat(80));

      for (const resultado of sucesso) {
        const [usuario] = await conn.query(
          `SELECT u.id, u.nome, u.email, u.precisa_trocar_senha,
           (SELECT COUNT(*) FROM usuario_perfis WHERE usuario_id = u.id AND perfil_id = 2) as tem_perfil_global,
           (SELECT COUNT(*) FROM grupo_usuario_perfil WHERE usuario_id = u.id AND grupo_id = 3) as esta_no_grupo
           FROM usuarios u
           WHERE u.id = ?`,
          [resultado.usuarioId]
        );

        if (usuario.length > 0) {
          const u = usuario[0];
          console.log(`\n✅ ${resultado.apelido} (ID: ${u.id})`);
          console.log(`   Nome: ${u.nome}`);
          console.log(`   Email: ${u.email}`);
          console.log(`   Precisa trocar senha: ${u.precisa_trocar_senha ? 'SIM' : 'NÃO'}`);
          console.log(`   Perfil Apostador (global): ${u.tem_perfil_global ? 'SIM' : 'NÃO'}`);
          console.log(`   Está no grupo BolaoBrasileiraoA: ${u.esta_no_grupo ? 'SIM' : 'NÃO'}`);
        }
      }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('🎉 CADASTRO CONCLUÍDO!');
    console.log('═'.repeat(80));
    console.log(`\n✅ ${sucesso.length} apostadores cadastrados`);
    console.log('✅ Senha padrão: 123456');
    console.log('✅ Obrigados a trocar senha no primeiro acesso');
    console.log('✅ Perfil: Apostador');
    console.log('✅ Grupo: BolaoBrasileiraoA');

    await conn.end();
    process.exit(0);

  } catch (err) {
    console.error('\n\n❌ ERRO DURANTE A INSERÇÃO:', err.message);
    
    if (conn) {
      try {
        await conn.rollback();
        console.log('⚠️  ROLLBACK executado - Nenhum dado foi inserido');
      } catch (rollbackErr) {
        console.error('❌ Erro ao fazer rollback:', rollbackErr.message);
      }
      await conn.end();
    }
    
    process.exit(1);
  }
})();
