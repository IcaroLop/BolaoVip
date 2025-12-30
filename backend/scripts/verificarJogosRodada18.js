const pool = require('../database/conexao');

async function verificar() {
  try {
    const [jogos] = await pool.query(`
      SELECT id, rodada, time_mandante, time_visitante, data, status, placar_mandante, placar_visitante, campeonato_id
      FROM jogos
      WHERE rodada = 18 AND DATE(data) = '2025-12-26'
      ORDER BY data
    `);

    console.log('Jogos encontrados da rodada 18 em 26/12:', jogos.length);
    if (jogos.length > 0) {
      jogos.forEach(j => {
        console.log(`  ${j.time_mandante} vs ${j.time_visitante} | ${new Date(j.data).toLocaleString('pt-BR')} | Status: ${j.status} | Camp: ${j.campeonato_id}`);
      });
    } else {
      console.log('Nenhum jogo encontrado para rodada 18 em 26/12/2025.');
      
      // Verificar todas as rodadas 18
      console.log('\nVerificando TODAS as rodadas 18 (sem filtro de data):');
      const [todasRodada18] = await pool.query(`
        SELECT DISTINCT rodada, DATE(data) as data_jogo, COUNT(*) as total
        FROM jogos
        WHERE rodada = 18
        GROUP BY DATE(data)
        ORDER BY data_jogo
      `);
      
      if (todasRodada18.length > 0) {
        todasRodada18.forEach(r => {
          console.log(`  Rodada ${r.rodada}: ${r.data_jogo} (${r.total} jogos)`);
        });
      } else {
        console.log('  Nenhuma rodada 18 encontrada no banco.');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

verificar();
