const pool = require('../database/conexao');

(async () => {
  try {
    const times = ['Flamengo', 'Internacional', 'Bragantino', 'Atlético-MG', 'Santos', 'São Paulo', 'Remo', 'Mirassol', 'Palmeiras', 'Vitória', 'Grêmio', 'Botafogo'];
    
    const [jogos] = await pool.query(
      `SELECT id, time_mandante, time_visitante, data 
       FROM jogos 
       WHERE campeonato_id = 10 AND rodada = 2 
       AND (time_mandante IN (?) OR time_visitante IN (?))
       ORDER BY data`,
      [times, times]
    );
    console.log(JSON.stringify(jogos, null, 2));
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
})();
