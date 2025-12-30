require('dotenv').config();
const axios = require('axios');
const pool = require('../database/conexao');

async function buscarResultadosRodada18() {
  try {
    const token = process.env.API_FUTEBOL_TOKEN;
    const url = 'https://api.api-futebol.com.br/v1/campeonatos/69/rodadas/18';
    
    console.log('🔍 Buscando resultados da rodada 18 da Premier League...');
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Resposta completa:', JSON.stringify(response.data, null, 2).substring(0, 500));
    
    const jogos = response.data.partidas || response.data;
    console.log(`✅ Recebidos ${jogos?.length || 0} jogos da rodada 18\n`);
    
    for (const jogo of jogos) {
      const mandante = jogo.time_mandante?.nome || jogo.time_mandante || '?';
      const visitante = jogo.time_visitante?.nome || jogo.time_visitante || '?';
      const placarCasa = jogo.placar_mandante ?? '-';
      const placarFora = jogo.placar_visitante ?? '-';
      
      console.log(`📊 ${mandante} ${placarCasa} x ${placarFora} ${visitante}`);
      console.log(`   Status: ${jogo.status} | Partida ID: ${jogo.partida_id}`);
      
      if (jogo.placar_mandante !== null && jogo.placar_visitante !== null) {
        // Atualizar no banco
        await pool.query(`
          UPDATE jogos 
          SET placar_mandante = ?, placar_visitante = ?, status = ?
          WHERE partida_id = ?
        `, [jogo.placar_mandante, jogo.placar_visitante, jogo.status, jogo.partida_id]);
        console.log(`   ✅ Placar atualizado no banco\n`);
      } else {
        console.log(`   ⏳ Jogo ainda não finalizado\n`);
      }
    }
    
    console.log('✅ Busca de resultados concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    process.exit(1);
  }
}

buscarResultadosRodada18();
