const axios = require('axios');

async function testar() {
  try {
    const res = await axios.get('http://localhost:3001/resultados/rodada-vigente?campeonatoId=69');
    console.log('\n✅ Resposta do endpoint:');
    console.log(`Rodada: ${res.data.rodada}`);
    console.log(`Total de jogos retornados: ${res.data.jogos.length}`);
    if (res.data.jogos.length > 0) {
      console.log(`Primeiro jogo: ${res.data.jogos[0].time_mandante} vs ${res.data.jogos[0].time_visitante}`);
      console.log(`Placar: ${res.data.jogos[0].placar_mandante} x ${res.data.jogos[0].placar_visitante}`);
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  process.exit(0);
}

testar();
