#!/usr/bin/env node
/**
 * Atualiza placares das partidas de rodadas encerradas para um campeonato.
 * Uso: node scripts/atualizarPlacaresRodadas.js <campeonato_id>
 */

const axios = require('axios');
const pool = require('../database/conexao');
const tokenConfig = require('../config/tokenConfig');

const API_BASE_URL = 'https://api.api-futebol.com.br/v1';
const TIMEOUT_MS = 10000;

async function obterRodadasEncerradas(campeonatoId) {
  const statuses = ['encerrada', 'finalizada', 'finalizado'];
  const [rows] = await pool.query(
    `SELECT DISTINCT rodada
       FROM rodadas_status
      WHERE campeonato_id = ?
        AND LOWER(status) IN (?, ?, ?)
      ORDER BY rodada`,
    [campeonatoId, ...statuses]
  );
  return rows.map(r => r.rodada);
}

async function buscarRodadaNaAPI(campeonatoId, rodada) {
  const token = tokenConfig.getToken();
  const url = `${API_BASE_URL}/campeonatos/${campeonatoId}/rodadas/${rodada}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: TIMEOUT_MS
  });
  return res.data;
}

async function atualizarJogo(partida, campeonatoId) {
  const { partida_id, placar_mandante, placar_visitante, status } = partida;
  if (placar_mandante === null || placar_visitante === null) {
    return { atualizado: false, motivo: 'placar_nulo' };
  }

  const [result] = await pool.query(
    `UPDATE jogos
        SET placar_mandante = ?, placar_visitante = ?, status = ?
      WHERE partida_id = ? AND campeonato_id = ?`,
    [placar_mandante, placar_visitante, status, partida_id, campeonatoId]
  );

  if (result.affectedRows === 0) {
    // fallback sem campeonato_id para casos antigos
    const [resultFallback] = await pool.query(
      `UPDATE jogos
          SET placar_mandante = ?, placar_visitante = ?, status = ?
        WHERE partida_id = ?`,
      [placar_mandante, placar_visitante, status, partida_id]
    );
    return { atualizado: resultFallback.affectedRows > 0, fallback: true };
  }

  return { atualizado: true, fallback: false };
}

async function processar(campeonatoId) {
  const rodadas = await obterRodadasEncerradas(campeonatoId);
  if (!rodadas.length) {
    console.log(`Nenhuma rodada encerrada encontrada para campeonato ${campeonatoId}.`);
    return;
  }

  console.log(`Processando ${rodadas.length} rodada(s) encerradas para campeonato ${campeonatoId}...`);
  for (const rodada of rodadas) {
    console.log(`\n➡️ Rodada ${rodada}`);
    try {
      const dadosRodada = await buscarRodadaNaAPI(campeonatoId, rodada);
      const partidas = dadosRodada.partidas || [];
      let atualizados = 0;
      let ignorados = 0;
      let fallbackCount = 0;

      for (const partida of partidas) {
        const res = await atualizarJogo(partida, campeonatoId);
        if (res.atualizado) {
          atualizados++;
          if (res.fallback) fallbackCount++;
        } else {
          ignorados++;
        }
      }

      console.log(`Rodada ${rodada}: ${atualizados}/${partidas.length} atualizados (${fallbackCount} via fallback), ignorados ${ignorados}.`);
    } catch (err) {
      console.error(`Erro na rodada ${rodada}:`, err.response?.data || err.message);
    }
  }
}

async function main() {
  const campeonatoId = Number(process.argv[2]);
  if (!campeonatoId) {
    console.error('Uso: node scripts/atualizarPlacaresRodadas.js <campeonato_id>');
    process.exit(1);
  }

  try {
    await processar(campeonatoId);
  } catch (err) {
    console.error('Erro geral:', err.message);
  } finally {
    await pool.end();
  }
}

main();
