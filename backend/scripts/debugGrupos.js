const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function debugGrupos() {
  const conn = await pool.getConnection();
  try {
    // 1. Verificar campeonatos ativos nos grupos
    const [grps] = await conn.query(`SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL`);
    console.log('📌 Campeonatos ativos nos grupos:', grps.map(g => g.campeonato_id));
    
    const agora = DateTime.now().setZone('America/Manaus');
    const limiteData = agora.plus({ days: 7 });
    console.log(`\n⏰ Data agora: ${agora.toFormat('yyyy-LL-dd HH:mm')}`);
    console.log(`⏰ Limite (agora + 7 dias): ${limiteData.toFormat('yyyy-LL-dd HH:mm')}`);
    
    // 2. Para cada campeonato, verificar rodada atual (usando nova lógica)
    for (const g of grps) {
      const campId = Number(g.campeonato_id);
      console.log(`\n🏆 Campeonato ${campId}:`);
      
      // Buscar rodada com jogos nos próximos 7 dias (nova lógica)
      const [rs] = await conn.query(
        `SELECT rodada, MIN(data) as primeira_data
         FROM jogos
         WHERE campeonato_id = ? 
           AND (status IN ('agendado','andamento') OR status IS NULL OR placar_mandante IS NULL)
           AND data <= ?
         GROUP BY rodada
         ORDER BY MIN(data) ASC
         LIMIT 1`,
        [campId, limiteData.toSQL({ includeOffset: false })]
      );
      
      if (rs && rs.length > 0) {
        const rodadaAtual = Number(rs[0].rodada);
        const primeiraData = DateTime.fromJSDate(rs[0].primeira_data).setZone('America/Manaus');
        console.log(`  ✅ Rodada selecionada: ${rodadaAtual}`);
        console.log(`  ✅ Primeira data da rodada: ${primeiraData.toFormat('yyyy-LL-dd HH:mm')}`);
        
        // Buscar jogos dessa rodada
        const [jogos] = await conn.query(
          `SELECT partida_id, rodada, data, time_mandante, time_visitante, status, placar_mandante, placar_visitante
           FROM jogos
           WHERE campeonato_id = ? AND rodada = ? 
             AND (status IN ('agendado', 'andamento') OR status IS NULL OR placar_mandante IS NULL)
           ORDER BY data ASC`,
          [campId, rodadaAtual]
        );
        
        console.log(`  📋 Jogos pendentes: ${jogos.length}`);
        if (jogos.length > 0) {
          jogos.forEach((j, idx) => {
            const dt = DateTime.fromJSDate(j.data).setZone('America/Manaus');
            console.log(`    ${idx + 1}. ${j.time_mandante} x ${j.time_visitante}`);
            console.log(`       Data: ${dt.toFormat('yyyy-LL-dd HH:mm')} | Status: ${j.status || 'NULL'}`);
          });
        }
      } else {
        console.log('  ❌ Nenhuma rodada com jogos nos próximos 7 dias');
      }
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    conn.release();
  }
  process.exit(0);
}

debugGrupos();
