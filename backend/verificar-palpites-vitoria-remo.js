const mysql = require('mysql2/promise');

async function verificarPalpites() {
  const conexao = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });

  try {
    console.log('🔍 Buscando jogo Vitória x Remo na rodada 1, campeonato_id=10...\n');

    // Buscar o jogo Vitória x Remo
    const [jogos] = await conexao.query(
      `SELECT 
         j.id,
         j.rodada,
         j.campeonato_id,
         j.data,
         j.time_mandante,
         j.time_visitante,
         j.placar_mandante,
         j.placar_visitante
       FROM jogos j
       WHERE j.rodada = 1 
         AND j.campeonato_id = 10
         AND (j.time_mandante LIKE '%Vitória%' OR j.time_visitante LIKE '%Vitória%')
         AND (j.time_mandante LIKE '%Remo%' OR j.time_visitante LIKE '%Remo%')`
    );

    if (jogos.length === 0) {
      console.log('❌ Jogo Vitória x Remo não encontrado na rodada 1, campeonato_id=10');
      return;
    }

    const jogo = jogos[0];
    console.log('✅ Jogo encontrado:');
    console.log(`   ID: ${jogo.id}`);
    console.log(`   ${jogo.time_mandante} x ${jogo.time_visitante}`);
    console.log(`   Rodada: ${jogo.rodada}`);
    console.log(`   Campeonato ID: ${jogo.campeonato_id}`);
    console.log(`   Data: ${jogo.data ? new Date(jogo.data).toLocaleString('pt-BR') : 'N/A'}`);
    console.log(`   Placar: ${jogo.placar_mandante !== null ? jogo.placar_mandante : '?'} x ${jogo.placar_visitante !== null ? jogo.placar_visitante : '?'}`);

    // Buscar palpites existentes
    console.log('\n🔍 Verificando palpites existentes para este jogo...\n');

    const [palpites] = await conexao.query(
      `SELECT 
         p.id,
         p.id_usuario,
         u.nome AS usuario_nome,
         p.gols_casa,
         p.gols_fora,
         p.data_envio
       FROM palpites p
       INNER JOIN usuarios u ON p.id_usuario = u.id
       WHERE p.id_jogo = ?
       ORDER BY u.nome`,
      [jogo.id]
    );

    if (palpites.length === 0) {
      console.log('✅ NENHUM palpite registrado ainda para este jogo.');
      console.log('\n💡 Todos os usuários podem fazer seus palpites.');
    } else {
      console.log(`✅ Total de palpites registrados: ${palpites.length}\n`);
      console.log('═══════════════════════════════════════════════════════════════════');
      palpites.forEach((p, index) => {
        console.log(`${index + 1}. ${p.usuario_nome} (ID: ${p.id_usuario})`);
        console.log(`   Palpite: ${p.gols_casa} x ${p.gols_fora}`);
        console.log(`   Registrado em: ${p.data_envio ? new Date(p.data_envio).toLocaleString('pt-BR') : 'N/A'}`);
        console.log('───────────────────────────────────────────────────────────────────');
      });

      // Verificar quais usuários do grupo ainda NÃO palpitaram
      console.log('\n🔍 Verificando quais usuários do grupo BolaoBrasileiraoA ainda NÃO palpitaram...\n');

      const [semPalpite] = await conexao.query(
        `SELECT DISTINCT
           u.id,
           u.nome,
           u.email
         FROM grupo_usuario_perfil gup
         INNER JOIN usuarios u ON gup.usuario_id = u.id
         INNER JOIN grupos g ON gup.grupo_id = g.id
         WHERE g.nome = 'BolaoBrasileiraoA'
           AND gup.perfil_id = 2
           AND u.id NOT IN (
             SELECT id_usuario 
             FROM palpites 
             WHERE id_jogo = ?
           )
         ORDER BY u.nome`,
        [jogo.id]
      );

      if (semPalpite.length === 0) {
        console.log('✅ TODOS os apostadores do grupo já fizeram seus palpites!');
      } else {
        console.log(`⚠️  ${semPalpite.length} apostador(es) ainda NÃO palpitou(aram):\n`);
        semPalpite.forEach((u, index) => {
          console.log(`${index + 1}. ${u.nome} (ID: ${u.id})`);
          console.log(`   Email: ${u.email}`);
        });
      }
    }

  } catch (erro) {
    console.error('❌ Erro ao verificar palpites:', erro);
  } finally {
    await conexao.end();
  }
}

verificarPalpites();
