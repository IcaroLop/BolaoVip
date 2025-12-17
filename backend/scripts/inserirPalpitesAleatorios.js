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

async function inserirPalpitesAleatorios() {
  let conn;
  try {
    conn = await pool.getConnection();

    // Primeiro, verificar estrutura da tabela palpites
    console.log('🔍 Verificando estrutura da tabela palpites...');
    const [columns] = await conn.query('DESCRIBE palpites');
    const columnNames = columns.map(c => c.Field);
    console.log('Colunas:', columnNames.join(', '));
    
    // Descobrir qual coluna armazena o usuário (pode ser id_usuario ou usuario_id)
    const usuarioCol = columnNames.includes('id_usuario') ? 'id_usuario' : 'usuario_id';
    const jogoCol = columnNames.includes('id_jogo') ? 'id_jogo' : 'jogo_id';
    
    console.log(`ℹ️ Usando colunas: ${usuarioCol}, ${jogoCol}\n`);

    console.log('🔍 Buscando usuários do BolaoPremier (campeonato_id=69)...');
    const [usuarios] = await conn.query(`
      SELECT DISTINCT u.id, u.nome
      FROM usuarios u
      INNER JOIN grupo_membros gm ON u.id = gm.usuario_id
      INNER JOIN grupos g ON gm.grupo_id = g.id
      WHERE g.campeonato_id = 69
      ORDER BY u.id
    `);

    console.log(`✅ Encontrados ${usuarios.length} usuários\n`);

    console.log('🔍 Buscando jogos das rodadas 1-16 (campeonato_id=69)...');
    const [jogos] = await conn.query(`
      SELECT partida_id, rodada, time_mandante, time_visitante
      FROM jogos
      WHERE campeonato_id = 69 AND rodada BETWEEN 1 AND 16
      ORDER BY rodada, partida_id
    `);

    console.log(`✅ Encontrados ${jogos.length} jogos\n`);

    const totalPalpites = usuarios.length * jogos.length;
    console.log(`📊 Total de palpites a inserir: ${totalPalpites}\n`);

    // Função para gerar placar aleatório (0-5 gols)
    const gerarPlacarAleatorio = () => Math.floor(Math.random() * 6);

    console.log('⏳ Iniciando inserção de palpites...\n');

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;

    for (let i = 0; i < usuarios.length; i++) {
      const usuario = usuarios[i];
      console.log(`[${i + 1}/${usuarios.length}] Processando usuário: ${usuario.nome} (ID: ${usuario.id})`);

      for (const jogo of jogos) {
        try {
          const gols_casa = gerarPlacarAleatorio();
          const gols_fora = gerarPlacarAleatorio();

          // Tenta fazer insert, se falhar por duplicate key, faz update
          const [result] = await conn.query(`
            INSERT INTO palpites (${usuarioCol}, rodada, campeonato_id, grupo_id, ${jogoCol}, gols_casa, gols_fora, status_pagamento)
            VALUES (?, ?, 69, NULL, ?, ?, ?, 'pendente')
            ON DUPLICATE KEY UPDATE
              gols_casa = VALUES(gols_casa),
              gols_fora = VALUES(gols_fora),
              status_pagamento = 'pendente'
          `, [usuario.id, jogo.rodada, jogo.partida_id, gols_casa, gols_fora]);

          if (result.affectedRows === 1 && result.insertId > 0) {
            inseridos++;
          } else if (result.affectedRows === 2) {
            atualizados++;
          }
        } catch (err) {
          console.error(`❌ Erro ao processar palpite do usuário ${usuario.id} no jogo ${jogo.id}:`, err.message);
          erros++;
        }
      }
    }

    console.log(`\n✅ Operação concluída!`);
    console.log(`   - Palpites inseridos: ${inseridos}`);
    console.log(`   - Palpites atualizados: ${atualizados}`);
    console.log(`   - Erros: ${erros}`);
    console.log(`   - Total processado: ${inseridos + atualizados + erros}/${totalPalpites}`);

    conn.release();
  } catch (err) {
    console.error('❌ Erro geral:', err);
    if (conn) conn.release();
    process.exit(1);
  }

  process.exit(0);
}

inserirPalpitesAleatorios();
