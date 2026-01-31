const mysql = require('mysql2/promise');

async function listarParticipantes() {
  const conexao = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });

  try {
    console.log('📋 Listando todos os participantes do grupo BolaoBrasileiraoA...\n');

    const [participantes] = await conexao.query(
      `SELECT 
         u.id,
         u.nome,
         u.email,
         p.nome AS perfil,
         gup.criado_em
       FROM grupo_usuario_perfil gup
       INNER JOIN usuarios u ON gup.usuario_id = u.id
       INNER JOIN perfis p ON gup.perfil_id = p.id
       INNER JOIN grupos g ON gup.grupo_id = g.id
       WHERE g.nome = 'BolaoBrasileiraoA'
       ORDER BY u.nome`
    );

    if (participantes.length === 0) {
      console.log('❌ Nenhum participante encontrado no grupo BolaoBrasileiraoA');
      return;
    }

    console.log(`✅ Total de participantes: ${participantes.length}\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    participantes.forEach((p, index) => {
      console.log(`${index + 1}. ${p.nome}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Perfil: ${p.perfil}`);
      console.log(`   Adicionado em: ${p.criado_em ? new Date(p.criado_em).toLocaleString('pt-BR') : 'N/A'}`);
      console.log('───────────────────────────────────────────────────────────────────────────────');
    });

    console.log('\n📊 Resumo por perfil:');
    const resumo = participantes.reduce((acc, p) => {
      acc[p.perfil] = (acc[p.perfil] || 0) + 1;
      return acc;
    }, {});

    Object.entries(resumo).forEach(([perfil, qtd]) => {
      console.log(`   ${perfil}: ${qtd} usuário(s)`);
    });

  } catch (erro) {
    console.error('❌ Erro ao listar participantes:', erro);
  } finally {
    await conexao.end();
  }
}

listarParticipantes();
