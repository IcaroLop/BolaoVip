#!/usr/bin/env node
/**
 * Verifica o formato de data que a API retorna
 */

const axios = require('axios');
const { DateTime } = require('luxon');
require('dotenv').config();

const API_BASE_URL = 'https://api.api-futebol.com.br/v1';
const CAMPEONATO_ID = 69; // Premier League
const tokenConfig = require('../config/tokenConfig');

async function verificar() {
  try {
    const token = tokenConfig.getToken();
    
    console.log('Buscando rodada 21 da Premier League...\n');
    
    const response = await axios.get(`${API_BASE_URL}/campeonatos/${CAMPEONATO_ID}/rodadas/21`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const partidas = response.data.partidas;
    
    if (partidas.length > 0) {
      console.log(`Total de ${partidas.length} partidas encontradas\n`);
      console.log('='.repeat(80));
      
      partidas.slice(0, 3).forEach((jogo, idx) => {
        console.log(`\n${idx + 1}. ${jogo.time_mandante.nome_popular} vs ${jogo.time_visitante.nome_popular}`);
        console.log(`   Partida ID: ${jogo.partida_id}`);
        console.log(`   Status: ${jogo.status}`);
        console.log('\n   📅 DATAS DA API:');
        console.log(`      data_realizacao: ${jogo.data_realizacao}`);
        console.log(`      data_realizacao_iso: ${jogo.data_realizacao_iso}`);
        
        console.log('\n   🔄 CONVERSÕES:');
        
        // Como está sendo feito atualmente (ERRADO?)
        const conversaoAtual = DateTime.fromISO(jogo.data_realizacao_iso, { setZone: true })
          .setZone('America/Manaus')
          .toFormat('yyyy-MM-dd HH:mm:ss');
        console.log(`      Conversão atual (setZone Manaus): ${conversaoAtual}`);
        
        // Apenas parseando sem conversão
        const semConversao = DateTime.fromISO(jogo.data_realizacao_iso)
          .toFormat('yyyy-MM-dd HH:mm:ss');
        console.log(`      Sem conversão (ISO direto): ${semConversao}`);
        
        // Parseando como UTC e convertendo para Manaus
        const deUTC = DateTime.fromISO(jogo.data_realizacao_iso, { zone: 'utc' })
          .setZone('America/Manaus')
          .toFormat('yyyy-MM-dd HH:mm:ss');
        console.log(`      De UTC para Manaus: ${deUTC}`);
        
        // Parseando como São Paulo e convertendo para Manaus
        const deSP = DateTime.fromISO(jogo.data_realizacao_iso, { zone: 'America/Sao_Paulo' })
          .setZone('America/Manaus')
          .toFormat('yyyy-MM-dd HH:mm:ss');
        console.log(`      De São Paulo para Manaus: ${deSP}`);
        
        console.log('\n   🌍 TIMEZONE INFO:');
        const dt = DateTime.fromISO(jogo.data_realizacao_iso, { setZone: true });
        console.log(`      Offset: ${dt.offset} minutos (${dt.offset/60} horas)`);
        console.log(`      Timezone: ${dt.zoneName}`);
        
        console.log('\n' + '-'.repeat(80));
      });
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.response?.data || err.message);
  }
}

verificar();
