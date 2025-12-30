// Script para testar a resposta da API e verificar o timezone retornado
require('dotenv').config();
const axios = require('axios');
const { DateTime } = require('luxon');

async function testarAPI() {
  const token = process.env.API_FUTEBOL_TOKEN;
  const url = 'https://api.api-futebol.com.br/v1/campeonatos/69/rodadas/17';
  
  console.log('🌐 Consultando API da Premier League - Rodada 17...\n');
  
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const partidas = response.data.partidas || [];
    
    console.log(`📊 Total de partidas: ${partidas.length}\n`);
    console.log('='.repeat(120));
    
    partidas.forEach((p, idx) => {
      const mandante = p.time_mandante?.nome_popular || 'N/A';
      const visitante = p.time_visitante?.nome_popular || 'N/A';
      
      console.log(`\n${idx + 1}. ${mandante} vs ${visitante} (Partida ID: ${p.partida_id})`);
      console.log(`   data_realizacao: ${p.data_realizacao}`);
      console.log(`   data_realizacao_iso: ${p.data_realizacao_iso}`);
      
      // Análise do timezone
      if (p.data_realizacao_iso) {
        const dtOriginal = DateTime.fromISO(p.data_realizacao_iso, { setZone: true });
        const dtUTC = dtOriginal.toUTC();
        const dtManaus = dtOriginal.setZone('America/Manaus');
        const dtManausMenos4h = dtManaus.minus({ hours: 4 });
        
        console.log(`   📍 Timezone original da API: ${dtOriginal.zoneName}`);
        console.log(`   🕐 Horário UTC: ${dtUTC.toFormat('yyyy-LL-dd HH:mm:ss')}`);
        console.log(`   🇧🇷 Horário Manaus (sem ajuste): ${dtManaus.toFormat('yyyy-LL-dd HH:mm:ss')}`);
        console.log(`   ✅ Horário Manaus (-4h PL): ${dtManausMenos4h.toFormat('yyyy-LL-dd HH:mm:ss')}`);
      }
    });
    
    console.log('\n' + '='.repeat(120));
    console.log('\n✅ Consulta concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao consultar API:', error.response?.data || error.message);
  }
  
  process.exit(0);
}

testarAPI();
