const pool = require('../database/conexao');

async function checkTestGameStatus() {
  try {
    const [jogos] = await pool.query(
      `SELECT id, partida_id, data, status, time_mandante, time_visitante 
       FROM jogos WHERE partida_id = 999999`
    );

    if (jogos.length === 0) {
      console.log('❌ Jogo não encontrado');
      process.exit(0);
    }

    console.log('Jogo encontrado:');
    console.log(JSON.stringify(jogos[0], null, 2));
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

checkTestGameStatus();
