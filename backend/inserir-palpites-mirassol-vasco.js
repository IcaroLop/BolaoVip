const mysql = require('mysql2/promise');

const palpites = [
  { usuario_id: 8, nome: 'ALEXANDRE', gols_casa: 2, gols_fora: 0 },
  { usuario_id: 20, nome: 'ANDRÉ', gols_casa: 3, gols_fora: 1 },
  { usuario_id: 17, nome: 'ANTONIO', gols_casa: 1, gols_fora: 2 },
  { usuario_id: 19, nome: 'CASSIANO', gols_casa: 2, gols_fora: 1 },
  { usuario_id: 24, nome: 'DENNYS', gols_casa: 2, gols_fora: 1 },
  { usuario_id: 25, nome: 'DINEY', gols_casa: 2, gols_fora: 2 },
  { usuario_id: 22, nome: 'GILVAN', gols_casa: 3, gols_fora: 0 },
  { usuario_id: 7, nome: 'ICARO', gols_casa: 2, gols_fora: 0 },
  { usuario_id: 18, nome: 'JAIME', gols_casa: 2, gols_fora: 1 },
  { usuario_id: 21, nome: 'JORGE', gols_casa: 1, gols_fora: 2 },
  { usuario_id: 26, nome: 'RODRIGUES', gols_casa: 1, gols_fora: 2 },
  { usuario_id: 9, nome: 'RONALDO', gols_casa: 3, gols_fora: 1 },
  { usuario_id: 23, nome: 'SAMUEL', gols_casa: 1, gols_fora: 2 }
];

const jogoId = 43723;
const rodada = 1;
const campeonatoId = 10;
const grupoId = 3; // BolaoBrasileiraoA

async function inserirPalpites() {
  const conexao = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });

  try {
    console.log('📋 Verificando palpites existentes...\n');

    // Verificar quem já tem palpite
    const [existentes] = await conexao.query(
      `SELECT id_usuario FROM palpites WHERE id_jogo = ?`,
      [jogoId]
    );

    const idsComPalpite = existentes.map(row => row.id_usuario);
    const palpitesParaInserir = palpites.filter(p => !idsComPalpite.includes(p.usuario_id));

    if (idsComPalpite.length > 0) {
      console.log('⚠️  Usuários que JÁ têm palpite para este jogo:\n');
      palpites.forEach(p => {
        if (idsComPalpite.includes(p.usuario_id)) {
          console.log(`   ⏭️  ${p.nome} (ID: ${p.usuario_id}) - JÁ CADASTRADO`);
        }
      });
      console.log();
    }

    console.log('📋 Inserindo palpites do jogo Mirassol x Vasco...\n');
    console.log(`Jogo ID: ${jogoId}`);
    console.log(`Rodada: ${rodada}`);
    console.log(`Campeonato ID: ${campeonatoId}`);
    console.log(`Grupo ID: ${grupoId}`);
    console.log(`Palpites a inserir: ${palpitesParaInserir.length} (de ${palpites.length})\n`);

    if (palpitesParaInserir.length === 0) {
      console.log('✨ Todos os usuários já possuem palpites cadastrados!');
      await conexao.end();
      return;
    }

    await conexao.beginTransaction();

    for (const p of palpitesParaInserir) {
      try {
        await conexao.query(
          `INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, data_envio)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [p.usuario_id, rodada, campeonatoId, grupoId, jogoId, p.gols_casa, p.gols_fora]
        );
        console.log(`✅ ${p.nome} (ID: ${p.usuario_id}) - Palpite: ${p.gols_casa} x ${p.gols_fora}`);
      } catch (err) {
        console.log(`⚠️  ${p.nome} (ID: ${p.usuario_id}) - Erro: ${err.message}`);
      }
    }

    await conexao.commit();

    console.log(`\n✅ Operação concluída com sucesso! ${palpitesParaInserir.length} palpites inseridos.`);

    // Verificação final
    console.log('\n🔍 Verificação final:');
    const [verificacao] = await conexao.query(
      `SELECT 
         u.nome,
         p.gols_casa,
         p.gols_fora,
         p.data_envio
       FROM palpites p
       INNER JOIN usuarios u ON p.id_usuario = u.id
       WHERE p.id_jogo = ?
       ORDER BY u.nome`,
      [jogoId]
    );

    console.log(`\nTotal de palpites no banco: ${verificacao.length}\n`);
    verificacao.forEach((p, index) => {
      const acertou = (p.gols_casa === 2 && p.gols_fora === 1) ? '✅' : '';
      console.log(`${index + 1}. ${p.nome} - ${p.gols_casa} x ${p.gols_fora} ${acertou}`);
    });

  } catch (erro) {
    await conexao.rollback();
    console.error('❌ Erro ao inserir palpites:', erro);
  } finally {
    await conexao.end();
  }
}

inserirPalpites();
