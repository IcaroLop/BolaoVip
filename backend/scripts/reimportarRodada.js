#!/usr/bin/env node
/**
 * Reimporta rodada específica com conversão de timezone correta
 */

const axios = require('axios');
const pool = require('../database/conexao');
const { DateTime } = require('luxon');
require('dotenv').config();

const API_BASE_URL = 'https://api.api-futebol.com.br/v1';
const tokenConfig = require('../config/tokenConfig');

async function reimportarRodada(campeonatoId, rodada) {
  try {
    const token = tokenConfig.getToken();
    
    console.log(`🌐 Reimportando rodada ${rodada} do campeonato ${campeonatoId}...\n`);
    
    const response = await axios.get(`${API_BASE_URL}/campeonatos/${campeonatoId}/rodadas/${rodada}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const partidas = response.data.partidas;
    
    console.log(`📋 ${partidas.length} partidas encontradas\n`);
    console.log('='.repeat(80));

    for (const jogo of partidas) {
      // Conversão CORRETA: API retorna em UTC-3, convertemos para Manaus UTC-4
      const dataManaus = DateTime.fromISO(jogo.data_realizacao_iso, { setZone: true })
        .setZone('America/Manaus')
        .toFormat('yyyy-MM-dd HH:mm:ss');

      console.log(`\n📍 ${jogo.time_mandante.nome_popular} vs ${jogo.time_visitante.nome_popular}`);
      console.log(`   Partida: ${jogo.partida_id}`);
      console.log(`   API: ${jogo.data_realizacao_iso}`);
      console.log(`   Manaus: ${dataManaus}`);

      // Atualizar no banco
      const [result] = await pool.query(`
        INSERT INTO jogos (
          partida_id, campeonato_id, rodada, data, time_mandante, time_visitante, estadio, 
          placar_mandante, placar_visitante, status, escudo_mandante, escudo_visitante
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          campeonato_id = VALUES(campeonato_id),
          data = VALUES(data),
          time_mandante = VALUES(time_mandante),
          time_visitante = VALUES(time_visitante),
          estadio = VALUES(estadio),
          placar_mandante = VALUES(placar_mandante),
          placar_visitante = VALUES(placar_visitante),
          status = VALUES(status),
          escudo_mandante = VALUES(escudo_mandante),
          escudo_visitante = VALUES(escudo_visitante)
      `, [
        jogo.partida_id,
        campeonatoId,
        rodada,
        dataManaus,
        jogo.time_mandante.nome_popular,
        jogo.time_visitante.nome_popular,
        jogo.estadio?.nome_popular || 'Indefinido',
        jogo.placar_mandante,
        jogo.placar_visitante,
        jogo.status,
        jogo.time_mandante.escudo,
        jogo.time_visitante.escudo
      ]);

      if (result.affectedRows === 1) {
        console.log(`   ✅ Inserido`);
      } else if (result.affectedRows === 2) {
        console.log(`   🔄 Atualizado`);
      } else {
        console.log(`   ℹ️  Sem alteração`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Reimportação concluída! ${partidas.length} jogos processados.`);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.response?.data || err.message);
    await pool.end();
    process.exit(1);
  }
}

// Argumentos da linha de comando
const campeonatoId = process.argv[2] || 69; // Premier League por padrão
const rodada = process.argv[3] || 21;

console.log(`Reimportando campeonato ${campeonatoId}, rodada ${rodada}...\n`);
reimportarRodada(parseInt(campeonatoId), parseInt(rodada));
