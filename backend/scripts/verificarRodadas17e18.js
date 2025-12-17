const pool = require('../database/conexao');

async function verificar() {
  try {
    const campeonatoId = 69; // BolaoPremier
    const grupoId = 2;

    console.log('📋 VERIFICAÇÃO - Rodadas 17 e 18 do Grupo BolaoPremier\n');

    // 1. Verificar palpites
    console.log('1️⃣  Palpites para rodadas 17 e 18:');
    const [palpites] = await pool.query(`
      SELECT rodada, COUNT(*) as total_palpites
      FROM palpites
      WHERE rodada IN (17, 18) AND campeonato_id = ? AND grupo_id = ?
      GROUP BY rodada
    `, [campeonatoId, grupoId]);
    console.log(`   Encontrados: ${palpites.length} rodadas com palpites`);
    palpites.forEach(p => console.log(`   - Rodada ${p.rodada}: ${p.total_palpites} palpites`));

    // 2. Verificar jogos
    console.log('\n2️⃣  Jogos para rodadas 17 e 18:');
    const [jogos] = await pool.query(`
      SELECT rodada, COUNT(*) as total_jogos, 
             SUM(CASE WHEN placar_mandante IS NOT NULL THEN 1 ELSE 0 END) as jogos_finalizados
      FROM jogos
      WHERE rodada IN (17, 18) AND campeonato_id = ? 
      GROUP BY rodada
    `, [campeonatoId]);
    console.log(`   Encontrados: ${jogos.length} rodadas com jogos`);
    jogos.forEach(j => console.log(`   - Rodada ${j.rodada}: ${j.total_jogos} jogos total, ${j.jogos_finalizados} finalizados`));

    // 3. Verificar ranking
    console.log('\n3️⃣  Ranking da rodada para rodadas 17 e 18:');
    const [ranking] = await pool.query(`
      SELECT rodada, COUNT(*) as total_ranking
      FROM ranking_rodada
      WHERE rodada IN (17, 18) AND campeonato_id = ? AND grupo_id = ?
      GROUP BY rodada
    `, [campeonatoId, grupoId]);
    console.log(`   Encontrados: ${ranking.length} rodadas com ranking`);
    ranking.forEach(r => console.log(`   - Rodada ${r.rodada}: ${r.total_ranking} usuários no ranking`));

    // 4. Verificar se há rodadas vigentes
    console.log('\n4️⃣  Últimas rodadas com jogos finalizados:');
    const [ultimasRodadas] = await pool.query(`
      SELECT DISTINCT rodada FROM jogos 
      WHERE campeonato_id = ? AND placar_mandante IS NOT NULL
      ORDER BY rodada DESC LIMIT 5
    `, [campeonatoId]);
    if (ultimasRodadas.length > 0) {
      ultimasRodadas.forEach(r => console.log(`   - Rodada ${r.rodada}`));
    } else {
      console.log('   - Nenhuma rodada com resultados');
    }

    // 5. Listar todas as rodadas do campeonato
    console.log('\n5️⃣  Todas as rodadas do campeonato:');
    const [todasRodadas] = await pool.query(`
      SELECT numero, status FROM rodadas ORDER BY numero
    `);
    console.log(`   Total de rodadas: ${todasRodadas.length}`);
    if (todasRodadas.length <= 20) {
      todasRodadas.forEach(r => console.log(`   - Rodada ${r.numero}: ${r.status}`));
    } else {
      console.log(`   Primeiras 5:`, todasRodadas.slice(0, 5).map(r => `Rodada ${r.numero} (${r.status})`).join(', '));
      console.log(`   Últimas 5:`, todasRodadas.slice(-5).map(r => `Rodada ${r.numero} (${r.status})`).join(', '));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificar();
