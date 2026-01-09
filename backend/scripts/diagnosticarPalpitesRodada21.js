/**
 * Diagnóstico completo de palpites da rodada 21
 * 
 * Verifica:
 * 1. Quantos palpites cada usuário tem na rodada 21
 * 2. Quantos jogos existem na rodada 21
 * 3. Se os usuários 1-9 (exceto 7) têm palpites inseridos
 * 4. Por que o ranking está vazio
 * 
 * Uso: node scripts/diagnosticarPalpitesRodada21.js
 */

const pool = require('../database/conexao');

async function main() {
  try {
    console.log(`\n===== Diagnóstico Completo - Rodada 21 =====\n`);

    const rodada = 21;
    const campeonatoId = 69; // Premier League
    
    // 1) Verificar palpites por usuário
    console.log('📊 Palpites por Usuário (rodada 21, campeonato 69):');
    const [palpitesPorUsuario] = await pool.query(`
      SELECT 
        u.id, 
        u.nome, 
        COUNT(p.id) as total_palpites,
        GROUP_CONCAT(DISTINCT p.grupo_id) as grupos
      FROM usuarios u
      LEFT JOIN palpites p ON u.id = p.id_usuario 
        AND p.rodada = ? 
        AND p.campeonato_id = ?
      WHERE u.id IN (1,2,3,4,5,6,7,8,9)
      GROUP BY u.id, u.nome
      ORDER BY u.id
    `, [rodada, campeonatoId]);
    
    console.table(palpitesPorUsuario);
    
    // 2) Verificar total de jogos
    console.log('\n⚽ Jogos da Rodada 21 (campeonato 69):');
    const [jogosTotal] = await pool.query(`
      SELECT 
        COUNT(*) as total_jogos,
        rodada,
        campeonato_id
      FROM jogos
      WHERE rodada = ? AND campeonato_id = ?
    `, [rodada, campeonatoId]);
    
    console.table(jogosTotal);
    
    // 3) Detalhes dos jogos
    console.log('\n🎯 Jogos Disponíveis:');
    const [jogosDetalhes] = await pool.query(`
      SELECT 
        id,
        time_mandante,
        time_visitante,
        data,
        status
      FROM jogos
      WHERE rodada = ? AND campeonato_id = ?
      ORDER BY data
      LIMIT 20
    `, [rodada, campeonatoId]);
    
    console.table(jogosDetalhes);
    
    // 4) Contar palpites por grupo
    console.log('\n👥 Palpites por Grupo (rodada 21, campeonato 69):');
    const [palpitesPorGrupo] = await pool.query(`
      SELECT 
        grupo_id,
        COUNT(*) as total_palpites,
        COUNT(DISTINCT id_usuario) as usuarios_unicos
      FROM palpites
      WHERE rodada = ? AND campeonato_id = ?
      GROUP BY grupo_id
      ORDER BY grupo_id
    `, [rodada, campeonatoId]);
    
    console.table(palpitesPorGrupo);
    
    // 5) Verificar ranking_rodada
    console.log('\n🏆 Ranking na Tabela (rodada 21, campeonato 69):');
    const [ranking] = await pool.query(`
      SELECT 
        rr.id_usuario,
        u.nome,
        rr.pontos_totais,
        rr.posicao,
        rr.grupo_id
      FROM ranking_rodada rr
      JOIN usuarios u ON u.id = rr.id_usuario
      WHERE rr.rodada = ? AND rr.campeonato_id = ?
      ORDER BY rr.posicao
    `, [rodada, campeonatoId]);
    
    console.table(ranking);
    
    // 6) Análise: por que ranking vazio?
    console.log('\n🔍 ANÁLISE:');
    
    const totalUsers = palpitesPorUsuario.length;
    const usersComPalpites = palpitesPorUsuario.filter(u => u.total_palpites > 0).length;
    const totalJogos = jogosTotal[0]?.total_jogos || 0;
    const rankingCount = ranking.length;
    
    console.log(`  • Total de usuários verificados: ${totalUsers}`);
    console.log(`  • Usuários com palpites: ${usersComPalpites}`);
    console.log(`  • Total de jogos na rodada: ${totalJogos}`);
    console.log(`  • Linhas no ranking_rodada: ${rankingCount}`);
    
    if (totalJogos === 0) {
      console.log(`\n❌ PROBLEMA: Nenhum jogo encontrado para rodada ${rodada}, campeonato ${campeonatoId}`);
      console.log(`   → Verifique se os jogos foram importados`);
    }
    
    if (usersComPalpites < 8) {
      console.log(`\n❌ PROBLEMA: Apenas ${usersComPalpites} usuários com palpites (esperado: 8)`);
      console.log(`   → O script SQL de inserção pode não ter feito COMMIT`);
      console.log(`   → Ou os palpites foram deletados depois`);
    }
    
    if (rankingCount === 0) {
      console.log(`\n❌ PROBLEMA: ranking_rodada está vazio para rodada ${rodada}`);
      console.log(`   → Execute: node scripts/recalcularRankingRodada.js ${rodada}`);
    } else if (rankingCount < usersComPalpites) {
      console.log(`\n⚠️ AVISO: Ranking (${rankingCount} users) < Palpites (${usersComPalpites} users)`);
      console.log(`   → Pode haver palpites sem score calculado`);
    }
    
    // 7) Próximos passos
    console.log(`\n📋 PRÓXIMOS PASSOS:`);
    if (totalJogos === 0) {
      console.log(`  1. Importe jogos: node backend/scripts/importarJogos.js`);
    } else if (usersComPalpites < 8) {
      console.log(`  1. Re-rode o script SQL com COMMIT uncommentado:`);
      console.log(`     mysql -u root -p'fBVhh6w2KW' bolaovip < backend/sql/insert_palpites_rodada21.sql`);
    }
    if (rankingCount < usersComPalpites || rankingCount === 0) {
      console.log(`  2. Recalcule ranking: node scripts/recalcularRankingRodada.js ${rodada}`);
    }
    console.log(`  3. Gere pagamentos: curl -X POST http://localhost:3001/ranking/rodada/${rodada}/gerar-pagamentos ...`);
    console.log(`  4. Diagnose saldo: node scripts/diagnosticarPagamentos.js ${rodada} 7`);
    
  } catch (err) {
    console.error('❌ Erro no diagnóstico:', err.message);
  } finally {
    pool.end();
  }
}

main();
