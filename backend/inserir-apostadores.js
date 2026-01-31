const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

/**
 * INSERÇÃO DE APOSTADORES NO BANCO DE PRODUÇÃO
 * Com transação e rollback em caso de erro
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
    console.log('🚀 INICIANDO CADASTRO DE APOSTADORES');
    console.log('═'.repeat(80));

    // Lista de apostadores a inserir
    const apostadores = [
      { email: 'Jfrothajr@gmail.com', nome: 'Antonio Castro da Frota Junior', apelido: 'Antonio', pix: '01843661276', timeId: 77 },
      { email: 'jaimejgljr1977@gmail.com', nome: 'Jaime José Galisa de Lucena Júnior', apelido: 'Jaime Jr.', pix: '92999913835', timeId: 43 },
      { email: 'cassianofortes@yahoo.com.br', nome: 'Cassiano Fortes de Souza', apelido: 'Cassiano', pix: '76916723220', timeId: 43 },
      { email: 'andrelbcosta33@gmail.com', nome: 'Andre Luiz Brito Costa', apelido: 'André', pix: '82636826220', timeId: 21 },
      { email: 'Tonyartur@gmail.com', nome: 'Jorge Artur da Silva Nunes', apelido: 'Jorge', pix: '92 99279-1747', timeId: 84 },
      { email: 'gilvanfsilva@yahoo.com.br', nome: 'Gilvan Ferreira da Silva', apelido: 'Gilvan', pix: '92981236884', timeId: 43 },
      { email: 'samuelkts35@gmail.com', nome: 'Samuel de Oliveira Barros', apelido: 'Samuel', pix: '92981652514', timeId: 69 },
      { email: 'dennys_gsilva@hotmail.com', nome: 'Dennys Gomes da Silva', apelido: 'Dennys', pix: '92991222959', timeId: 43 }
    ];

    // Gerar hash da senha padrão 123456
    const senhaHash = await bcrypt.hash('123456', 10);
    console.log('\n🔐 Hash da senha "123456" gerado com sucesso');

    // Iniciar transação
    await conn.beginTransaction();
    console.log('\n📝 Transação iniciada...\n');

    const resultados = [];

    for (let i = 0; i < apostadores.length; i++) {
      const apostador = apostadores[i];
      
      try {
        console.log(`${i + 1}/${apostadores.length} - Cadastrando ${apostador.apelido} (${apostador.email})...`);

        // 1. Inserir usuário
        const [resultUsuario] = await conn.query(
          `INSERT INTO usuarios 
           (nome, email, chave_pix, senha_hash, precisa_trocar_senha, time_favorito_id, data_cadastro, saldo, bloqueado) 
           VALUES (?, ?, ?, ?, 1, ?, NOW(), 0.00, 0)`,
          [apostador.nome, apostador.email, apostador.pix, senhaHash, apostador.timeId]
        );

        const usuarioId = resultUsuario.insertId;
        console.log(`   ✅ Usuário inserido (ID: ${usuarioId})`);

        // 2. Associar ao grupo com perfil Apostador
        await conn.query(
          `INSERT INTO grupo_usuario_perfil 
           (grupo_id, usuario_id, perfil_id) 
           VALUES (3, ?, 2)`,
          [usuarioId]
        );
        console.log(`   ✅ Associado ao grupo BolaoBrasileiraoA com perfil Apostador`);

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
        throw err; // Lançar erro para fazer rollback
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
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 VERIFICAÇÃO FINAL');
    console.log('═'.repeat(80));

    for (const resultado of sucesso) {
      const [usuario] = await conn.query(
        `SELECT u.id, u.nome, u.email, u.precisa_trocar_senha, t.nome as time_favorito,
         (SELECT COUNT(*) FROM grupo_usuario_perfil WHERE usuario_id = u.id AND grupo_id = 3) as esta_no_grupo
         FROM usuarios u
         LEFT JOIN times t ON u.time_favorito_id = t.id
         WHERE u.id = ?`,
        [resultado.usuarioId]
      );

      if (usuario.length > 0) {
        const u = usuario[0];
        console.log(`\n✅ ${resultado.apelido} (ID: ${u.id})`);
        console.log(`   Nome: ${u.nome}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Precisa trocar senha: ${u.precisa_trocar_senha ? 'SIM' : 'NÃO'}`);
        console.log(`   Time favorito: ${u.time_favorito || 'N/A'}`);
        console.log(`   Está no grupo: ${u.esta_no_grupo ? 'SIM' : 'NÃO'}`);
      }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('🎉 CADASTRO CONCLUÍDO COM SUCESSO!');
    console.log('═'.repeat(80));
    console.log(`\n✅ ${sucesso.length} apostadores cadastrados no grupo BolaoBrasileiraoA`);
    console.log('✅ Senha padrão: 123456');
    console.log('✅ Todos obrigados a trocar senha no primeiro acesso');
    console.log('✅ Perfil: Apostador');

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
