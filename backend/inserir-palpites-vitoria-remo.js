const mysql = require('mysql2/promise');

const palpites = [
  { usuario_id: 8, nome: 'ALEXANDRE', gols_casa: 2, gols_fora: 0 },
  { usuario_id: 17, nome: 'ANTONIO', gols_casa: 3, gols_fora: 1 },
  { usuario_id: 19, nome: 'CASSIANO', gols_casa: 2, gols_fora: 1 },
  { usuario_id: 24, nome: 'DENNYS', gols_casa: 1, gols_fora: 0 },
  { usuario_id: 25, nome: 'DINEY', gols_casa: 1, gols_fora: 1 },
  { usuario_id: 22, nome: 'GILVAN', gols_casa: 2, gols_fora: 0 },
  { usuario_id: 21, nome: 'JORGE', gols_casa: 2, gols_fora: 1 },
  { usuario_id: 26, nome: 'RODRIGUES', gols_casa: 3, gols_fora: 1 },
  { usuario_id: 9, nome: 'RONALDO', gols_casa: 2, gols_fora: 0 },
  { usuario_id: 23, nome: 'SAMUEL', gols_casa: 2, gols_fora: 1 }
];

const jogoId = 43718;
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
    console.log('📋 Inserindo palpites do jogo Vitória x Remo...\n');
    console.log(`Jogo ID: ${jogoId}`);
    console.log(`Rodada: ${rodada}`);
    console.log(`Campeonato ID: ${campeonatoId}`);
    console.log(`Grupo ID: ${grupoId}`);
    console.log(`Total de palpites: ${palpites.length}\n`);

    await conexao.beginTransaction();

    for (const p of palpites) {
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

    console.log('\n✅ Operação concluída com sucesso!');

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
      console.log(`${index + 1}. ${p.nome} - ${p.gols_casa} x ${p.gols_fora}`);
    });

  } catch (erro) {
    await conexao.rollback();
    console.error('❌ Erro ao inserir palpites:', erro);
  } finally {
    await conexao.end();
  }
}

inserirPalpites();
