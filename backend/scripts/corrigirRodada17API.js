// Script para corrigir horários da Premier League baseado nos dados reais da API
require('dotenv').config();
const pool = require('../database/conexao');
const axios = require('axios');
const { DateTime } = require('luxon');

async function corrigirComDadosAPI() {
  const conn = await pool.getConnection();
  try {
    const token = process.env.API_FUTEBOL_TOKEN;
    const url = 'https://api.api-futebol.com.br/v1/campeonatos/69/rodadas/17';
    
    console.log('🌐 Buscando dados da API para rodada 17...\n');
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const partidas = response.data.partidas || [];
    
    console.log(`📊 ${partidas.length} partidas encontradas na API\n`);
    console.log('='.repeat(120));
    
    await conn.beginTransaction();
    
    let atualizados = 0;
    for (const p of partidas) {
      const partidaId = p.partida_id;
      const dataISO = p.data_realizacao_iso;
      
      // Converte de São Paulo (-0300) para Manaus (-0400)
      // A API retorna em UTC-3, Manaus é UTC-4, então -1h
      const dt = DateTime.fromISO(dataISO, { setZone: true }).setZone('America/Manaus');
      const dataManaus = dt.toFormat('yyyy-LL-dd HH:mm:ss');
      
      await conn.query(
        'UPDATE jogos SET data = ? WHERE partida_id = ?',
        [dataManaus, partidaId]
      );
      
      console.log(`✅ Partida ${partidaId} | ${p.time_mandante.nome_popular} vs ${p.time_visitante.nome_popular}`);
      console.log(`   API (SP): ${dataISO}`);
      console.log(`   Manaus: ${dataManaus}\n`);
      
      atualizados++;
    }
    
    await conn.commit();
    console.log('='.repeat(120));
    console.log(`\n✅ ${atualizados} jogos atualizados com sucesso!`);
    
  } catch (error) {
    await conn.rollback();
    console.error('❌ Erro:', error.response?.data || error.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

corrigirComDadosAPI();
