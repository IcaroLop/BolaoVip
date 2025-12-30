const pool = require('../database/conexao');

async function diagnosticar() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== DIAGNÓSTICO DA RODADA VIGENTE ===\n');

    // 1. Verificar rodadas_status
    console.log('📋 Tabela rodadas_status (Premier League - campeonato_id 69):');
    const [rodadas] = await conn.query(
      `SELECT rodada, status FROM rodadas_status WHERE campeonato_id = 69 ORDER BY rodada DESC LIMIT 5`
    );
    console.table(rodadas);

    // 2. Verificar Rodada 17 - status dos jogos
    console.log('\n⚽ Rodada 17 - Status dos Jogos:');
    const [jogo17] = await conn.query(
      `SELECT id, time_mandante, time_visitante, placar_mandante, placar_visitante, status 
       FROM jogos WHERE rodada = 17 AND campeonato_id = 69 ORDER BY data`
    );
    console.table(jogo17);
    const totalJogo17 = jogo17.length;
    const finalizados17 = jogo17.filter(j => j.placar_mandante !== null && j.placar_visitante !== null).length;
    console.log(`\nTotal: ${totalJogo17} | Finalizados: ${finalizados17} | Pendentes: ${totalJogo17 - finalizados17}`);

    // 3. Verificar Rodada 18 - status dos jogos
    console.log('\n⚽ Rodada 18 - Status dos Jogos:');
    const [jogo18] = await conn.query(
      `SELECT id, time_mandante, time_visitante, placar_mandante, placar_visitante, status 
       FROM jogos WHERE rodada = 18 AND campeonato_id = 69 ORDER BY data`
    );
    console.table(jogo18);
    const totalJogo18 = jogo18.length;
    const finalizados18 = jogo18.filter(j => j.placar_mandante !== null && j.placar_visitante !== null).length;
    console.log(`\nTotal: ${totalJogo18} | Finalizados: ${finalizados18} | Pendentes: ${totalJogo18 - finalizados18}`);

    // 4. Buscar primeira rodada com jogos pendentes
    console.log('\n🔍 Primeira rodada com jogos PENDENTES (sem placar):');
    const [primeira] = await conn.query(
      `SELECT DISTINCT rodada FROM jogos 
       WHERE campeonato_id = 69 AND placar_mandante IS NULL 
       ORDER BY rodada ASC LIMIT 1`
    );
    console.log('Resultado:', primeira);

    // 5. Verificar status de rodadas 17 e 18
    console.log('\n📊 Status das Rodadas 17 e 18:');
    const [status] = await conn.query(
      `SELECT rodada, status FROM rodadas_status WHERE campeonato_id = 69 AND rodada IN (17, 18)`
    );
    console.table(status);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

diagnosticar();
