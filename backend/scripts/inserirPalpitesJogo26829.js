const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'isl050382',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function inserirPalpitesJogo26829() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('🎯 Inserindo palpites para o jogo partida_id=26829 (Manchester United vs Newcastle - Rodada 18)');
    console.log('👥 Usuários: ID 1 a 6');
    console.log('💰 Status: PAGO\n');

    // Função para gerar placar aleatório (0-5 gols)
    const gerarPlacarAleatorio = () => Math.floor(Math.random() * 6);

    // Verificar informações do jogo
    const [jogos] = await conn.query(`
      SELECT id, partida_id, rodada, time_mandante, time_visitante, campeonato_id
      FROM jogos
      WHERE partida_id = 26829
    `);

    if (jogos.length === 0) {
      console.error('❌ Jogo com partida_id=26829 não encontrado!');
      return;
    }

    const jogo = jogos[0];
    console.log(`📋 Jogo encontrado: ${jogo.time_mandante} vs ${jogo.time_visitante}`);
    console.log(`   ID: ${jogo.id} | Partida ID: ${jogo.partida_id} | Rodada: ${jogo.rodada} | Campeonato ID: ${jogo.campeonato_id}\n`);

    // Verificar usuários
    const [usuarios] = await conn.query(`
      SELECT id, nome FROM usuarios WHERE id BETWEEN 1 AND 6 ORDER BY id
    `);

    if (usuarios.length === 0) {
      console.error('❌ Nenhum usuário encontrado entre ID 1 e 6!');
      return;
    }

    console.log(`✅ Encontrados ${usuarios.length} usuários:\n`);
    usuarios.forEach(u => console.log(`   - ID ${u.id}: ${u.nome}`));
    console.log('');

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;

    for (const usuario of usuarios) {
      try {
        const gols_casa = gerarPlacarAleatorio();
        const gols_fora = gerarPlacarAleatorio();
        const codigo_envio = `JOGO26829_USER${usuario.id}_${Date.now()}`;

        console.log(`📝 Inserindo palpite para ${usuario.nome} (ID: ${usuario.id}): ${gols_casa} x ${gols_fora}`);

        // Inserir o palpite
        const [resultPalpite] = await conn.query(`
          INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, status_pagamento, data_pagamento, observacao_pagamento)
          VALUES (?, ?, ?, 2, ?, ?, ?, ?, 'pago', NOW(), 'Palpite inserido via script para teste')
          ON DUPLICATE KEY UPDATE
            gols_casa = VALUES(gols_casa),
            gols_fora = VALUES(gols_fora),
            status_pagamento = 'pago',
            data_pagamento = NOW(),
            observacao_pagamento = 'Palpite atualizado via script para teste'
        `, [usuario.id, jogo.rodada, jogo.campeonato_id, jogo.id, gols_casa, gols_fora, codigo_envio]);

        if (resultPalpite.affectedRows === 1 && resultPalpite.insertId > 0) {
          inseridos++;
          console.log(`   ✅ Palpite inserido (ID: ${resultPalpite.insertId})`);
        } else if (resultPalpite.affectedRows === 2) {
          atualizados++;
          console.log(`   ⚠️ Palpite já existia, foi atualizado`);
        }

        console.log(`   💰 Pagamento marcado como pago no palpite\n`);

      } catch (err) {
        console.error(`❌ Erro ao processar palpite do usuário ${usuario.id}:`, err.message);
        erros++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Operação concluída!`);
    console.log(`   - Palpites inseridos: ${inseridos}`);
    console.log(`   - Palpites atualizados: ${atualizados}`);
    console.log(`   - Erros: ${erros}`);
    console.log(`   - Total processado: ${inseridos + atualizados + erros}/${usuarios.length}`);
    console.log(`${'='.repeat(60)}\n`);

    // Verificar os palpites inseridos
    console.log('🔍 Verificando palpites inseridos:\n');
    const [verificacao] = await conn.query(`
      SELECT p.id, p.id_usuario, u.nome, p.gols_casa, p.gols_fora, p.status_pagamento, p.data_pagamento
      FROM palpites p
      JOIN usuarios u ON p.id_usuario = u.id
      WHERE p.id_jogo = ? AND p.id_usuario BETWEEN 1 AND 6
      ORDER BY p.id_usuario
    `, [jogo.id]);

    console.log('📊 Palpites registrados:');
    verificacao.forEach(p => {
      console.log(`   ID ${p.id_usuario} (${p.nome}): ${p.gols_casa} x ${p.gols_fora} | Status: ${p.status_pagamento} | Data: ${p.data_pagamento}`);
    });

    conn.release();
  } catch (err) {
    console.error('❌ Erro geral:', err);
    if (conn) conn.release();
    process.exit(1);
  }

  process.exit(0);
}

inserirPalpitesJogo26829();
