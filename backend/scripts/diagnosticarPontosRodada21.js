#!/usr/bin/env node
/**
 * Script: Diagnóstico detalhado de pontuação - Rodada 21
 * Objetivo: Verificar placares dos jogos, palpites dos usuários e cálculo de pontos
 */

const db = require('../database/conexao');
const { calcularPontosUsuario } = require('../services/pontuacaoService');

(async () => {
  try {
    console.log('\n===== Diagnóstico de Pontuação - Rodada 21 =====\n');

    // 1. Buscar os 10 jogos da rodada 21
    console.log(' 📋 Jogos da Rodada 21 (com placares reais):');
    const [jogos] = await db.query(`
      SELECT id, time_mandante, time_visitante, 
             placar_mandante, placar_visitante, 
             status, data
      FROM jogos 
      WHERE rodada = 21 AND campeonato_id = 69
      ORDER BY id
    `);
    
    console.log(`Total de jogos: ${jogos.length}`);
    jogos.forEach((j, idx) => {
      const placar = j.placar_mandante !== null 
        ? `${j.placar_mandante}x${j.placar_visitante}` 
        : 'SEM PLACAR';
      console.log(`  ${idx + 1}. Jogo ${j.id}: ${j.time_mandante} vs ${j.time_visitante} = ${placar} (${j.status})`);
    });

    // 2. Buscar palpites de cada usuário
    console.log('\n 🎯 Palpites dos Usuários (amostra de 3 jogos):');
    const [usuarios] = await db.query(`
      SELECT DISTINCT id_usuario FROM palpites 
      WHERE rodada = 21 AND campeonato_id = 69 AND grupo_id = 2
      ORDER BY id_usuario
    `);

    for (const u of usuarios) {
      const [palpites] = await db.query(`
        SELECT id_jogo, gols_casa, gols_fora 
        FROM palpites 
        WHERE id_usuario = ? AND rodada = 21 AND campeonato_id = 69 AND grupo_id = 2
        ORDER BY id_jogo
        LIMIT 3
      `, [u.id_usuario]);

      console.log(`\n  Usuário ${u.id_usuario}:`);
      palpites.forEach(p => {
        console.log(`    Jogo ${p.id_jogo}: ${p.gols_casa}x${p.gols_fora}`);
      });
    }

    // 3. Verificar placares reais vs palpites de um usuário específico
    console.log('\n 🔍 Comparação Detalhada (Usuário 1):');
    const [palpitesUser1] = await db.query(`
      SELECT p.id_jogo, p.gols_casa, p.gols_fora, 
             j.placar_mandante, j.placar_visitante,
             j.time_mandante, j.time_visitante
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.id
      WHERE p.id_usuario = 1 AND p.rodada = 21 AND p.campeonato_id = 69 AND p.grupo_id = 2
      ORDER BY p.id_jogo
    `);

    let totalJogos = 0;
    let acertos = 0;
    palpitesUser1.forEach(row => {
      totalJogos++;
      const palpiteMandante = row.gols_casa;
      const palpiteVisitante = row.gols_fora;
      const placarMandante = row.placar_mandante;
      const placarVisitante = row.placar_visitante;

      const acertoPlacar = palpiteMandante === placarMandante && palpiteVisitante === placarVisitante;
      if (acertoPlacar) acertos++;

      const status = acertoPlacar ? '✅ ACERTO PLACAR' : '❌';
      console.log(`  Jogo ${row.id_jogo}: ${row.time_mandante} vs ${row.time_visitante}`);
      console.log(`    Palpite: ${palpiteMandante}x${palpiteVisitante} | Placar: ${placarMandante}x${placarVisitante} ${status}`);
    });
    console.log(`  Acertos de placar: ${acertos}/${totalJogos}`);

    // 4. Calcular pontos manualmente para um usuário
    console.log('\n 📊 Cálculo Manual de Pontos (Usuário 1):');
    const [pontosCalculados] = await db.query(`
      SELECT 
        p.id_jogo,
        p.gols_casa as palpite_mandante,
        p.gols_fora as palpite_visitante,
        j.placar_mandante,
        j.placar_visitante
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.id
      WHERE p.id_usuario = 1 AND p.rodada = 21 AND p.campeonato_id = 69 AND p.grupo_id = 2
      ORDER BY p.id_jogo
    `);

    let pontosTotal = 0;
    pontosCalculados.forEach((row, idx) => {
      const pontos = calcularPontosUsuario(
        row.palpite_mandante,
        row.palpite_visitante,
        row.placar_mandante,
        row.placar_visitante
      );
      pontosTotal += pontos;
      console.log(`  Jogo ${idx + 1}: ${row.palpite_mandante}x${row.palpite_visitante} vs ${row.placar_mandante}x${row.placar_visitante} = ${pontos} pts`);
    });
    console.log(`  ➜ Total: ${pontosTotal} pontos`);

    // 5. Comparar com ranking salvo
    console.log('\n 🏆 Ranking Salvo no Banco:');
    const [ranking] = await db.query(`
      SELECT id_usuario, pontos_totais, posicao 
      FROM ranking_rodada 
      WHERE rodada = 21 AND campeonato_id = 69
      ORDER BY posicao
    `);

    ranking.forEach(r => {
      console.log(`  Posição ${r.posicao}: Usuário ${r.id_usuario} = ${r.pontos_totais} pts`);
    });

    // 6. Verificar se placares dos jogos estão NULL
    console.log('\n ⚠️ Status dos Placares:');
    const [statusJogos] = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN placar_mandante IS NOT NULL THEN 1 END) as com_placar,
        COUNT(CASE WHEN placar_mandante IS NULL THEN 1 END) as sem_placar
      FROM jogos 
      WHERE rodada = 21 AND campeonato_id = 69
    `);
    console.log(`  Total de jogos: ${statusJogos[0].total}`);
    console.log(`  Com placar: ${statusJogos[0].com_placar}`);
    console.log(`  SEM placar (PROBLEMA!): ${statusJogos[0].sem_placar}`);

    if (statusJogos[0].sem_placar > 0) {
      console.log('\n  ⚠️ PROBLEMA IDENTIFICADO: Jogos sem placares registrados!');
      console.log('     Sem placares reais, todos os palpites acertam "vazio" → pontos iguais!');
      console.log('\n  SOLUÇÃO: Execute para atualizar placares:');
      console.log('     node backend/scripts/importarClassificacao.js');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
})();
