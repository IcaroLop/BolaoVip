// Script para verificar se usuários 1-6 possuem palpites na rodada 18 da Premier League
const pool = require('../database/conexao');

async function verificarPalpites() {
  const conexao = await pool.getConnection();
  
  try {
    console.log('🔍 Verificando palpites dos usuários 1-6 na rodada 18 da Premier League...\n');

    const campeonatoId = 69; // Premier League
    const rodada = 18;
    
    // Buscar quantidade de jogos da rodada 18
    const [jogos] = await conexao.query(
      `SELECT COUNT(*) as total 
       FROM jogos 
       WHERE campeonato_id = ? AND rodada = ?`,
      [campeonatoId, rodada]
    );
    
    console.log(`📊 Total de jogos na rodada ${rodada}: ${jogos[0].total}\n`);
    
    // Verificar palpites de cada usuário (1 a 6)
    for (let userId = 1; userId <= 6; userId++) {
      const [palpites] = await conexao.query(
        `SELECT 
          p.id,
          p.id_usuario,
          u.nome as nome_usuario,
          p.id_jogo,
          p.gols_casa,
          p.gols_fora,
          p.rodada,
          j.time_mandante,
          j.time_visitante,
          j.placar_mandante,
          j.placar_visitante
         FROM palpites p
         INNER JOIN usuarios u ON p.id_usuario = u.id
         INNER JOIN jogos j ON p.id_jogo = j.id
         WHERE p.id_usuario = ?
           AND p.campeonato_id = ?
           AND p.rodada = ?`,
        [userId, campeonatoId, rodada]
      );
      
      if (palpites.length === 0) {
        console.log(`❌ Usuário ${userId}: SEM PALPITES`);
      } else {
        console.log(`✅ Usuário ${userId} (${palpites[0].nome_usuario}): ${palpites.length} palpites registrados`);
        
        // Mostrar detalhes dos palpites
        palpites.forEach((p, idx) => {
          const palpiteStr = `${p.gols_casa} x ${p.gols_fora}`;
          const resultadoStr = p.placar_mandante !== null 
            ? `(Real: ${p.placar_mandante} x ${p.placar_visitante})`
            : '(Aguardando)';
          console.log(`   ${idx + 1}. ${p.time_mandante} x ${p.time_visitante} - Palpite: ${palpiteStr} ${resultadoStr}`);
        });
      }
      console.log('');
    }
    
    // Resumo geral
    console.log('─'.repeat(80));
    const [resumo] = await conexao.query(
      `SELECT 
        p.id_usuario,
        u.nome,
        COUNT(*) as total_palpites
       FROM palpites p
       INNER JOIN usuarios u ON p.id_usuario = u.id
       WHERE p.id_usuario BETWEEN 1 AND 6
         AND p.campeonato_id = ?
         AND p.rodada = ?
       GROUP BY p.id_usuario, u.nome
       ORDER BY p.id_usuario`,
      [campeonatoId, rodada]
    );
    
    console.log('\n📈 RESUMO GERAL:');
    if (resumo.length === 0) {
      console.log('❌ Nenhum usuário (1-6) possui palpites na rodada 18');
    } else {
      resumo.forEach(r => {
        console.log(`   Usuário ${r.id_usuario} (${r.nome}): ${r.total_palpites} palpites`);
      });
      
      const faltando = [];
      for (let i = 1; i <= 6; i++) {
        if (!resumo.find(r => r.id_usuario === i)) {
          faltando.push(i);
        }
      }
      
      if (faltando.length > 0) {
        console.log(`\n⚠️  Usuários sem palpites: ${faltando.join(', ')}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Erro ao verificar palpites:', err.message);
    throw err;
  } finally {
    conexao.release();
    await pool.end();
  }
}

verificarPalpites()
  .then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
