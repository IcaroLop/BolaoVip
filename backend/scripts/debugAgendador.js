const pool = require('../database/conexao');

async function verificar() {
  try {
    // Simular o que o endpoint `/agendamentos/historico` faz
    const offset = 0;
    const limit = 10;

    const [linhas] = await pool.query(`
      SELECT 
        rodada,
        COUNT(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 END) AS jogos_com_resultado,
        COUNT(*) AS total_jogos
      FROM jogos
      GROUP BY rodada
      ORDER BY MIN(data) ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    console.log('Resultado do agrupamento por rodada:');
    linhas.forEach(l => {
      console.log(`  Rodada ${l.rodada}: ${l.jogos_com_resultado}/${l.total_jogos} com resultado`);
    });

    // Agora verificar especificamente rodada 18
    console.log('\nDetalhes da Rodada 18:');
    const [rodada18] = await pool.query(`
      SELECT 
        rodada,
        campeonato_id,
        COUNT(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 END) AS jogos_com_resultado,
        COUNT(*) AS total_jogos
      FROM jogos
      WHERE rodada = 18
      GROUP BY campeonato_id
    `);

    rodada18.forEach(r => {
      console.log(`  Campeonato ${r.campeonato_id}: ${r.jogos_com_resultado}/${r.total_jogos} com resultado`);
    });

    // Verificar se a rodada 18 está na resposta
    const rodada18Info = linhas.find(l => l.rodada === 18);
    if (rodada18Info) {
      console.log('\n✅ Rodada 18 SIM apareceria no resultado!');
      console.log(`   Status esperado: ${rodada18Info.jogos_com_resultado === rodada18Info.total_jogos ? 'Concluído' : rodada18Info.jogos_com_resultado > 0 ? 'Parcial' : 'Aguardando'}`);
    } else {
      console.log('\n❌ Rodada 18 NÃO aparece no resultado (OFFSET/LIMIT cortou)');
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

verificar();
