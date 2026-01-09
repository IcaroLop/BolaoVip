#!/usr/bin/env node

/**
 * Script: fase3_recalcular_rankings.js
 * Propósito: Recalcular rankings para rodadas 1-21 e diagnosticar resultados
 * Usa: node scripts/fase3_recalcular_rankings.js
 */

const pool = require('../database/conexao');
const rankingController = require('../controllers/rankingController');

(async () => {
  try {
    console.log('\n========================================');
    console.log('FASE 3: RECALCULAR RANKINGS RODADAS 1-21');
    console.log('========================================\n');

    const campeonatoId = 69; // Premier League
    const rodadas = Array.from({ length: 21 }, (_, i) => i + 1);

    let totalRankings = 0;

    for (const rodada of rodadas) {
      console.log(`Processando rodada ${rodada}...`);
      
      try {
        // Recalcular ranking (deleta e recria)
        await rankingController.calcularRankingRodada(rodada, campeonatoId);
        
        // Verificar resultado
        const [ranking] = await pool.query(
          'SELECT id_usuario, pontos_totais, posicao FROM ranking_rodada WHERE rodada=? AND campeonato_id=? ORDER BY posicao',
          [rodada, campeonatoId]
        );
        
        console.log(`  ✅ ${ranking.length} usuários no ranking`);
        totalRankings += ranking.length;
        
        // Mostrar top 3
        if (ranking.length >= 3) {
          console.log(`     1º: User ${ranking[0].id_usuario} - ${ranking[0].pontos_totais} pts`);
          console.log(`     2º: User ${ranking[1].id_usuario} - ${ranking[1].pontos_totais} pts`);
          console.log(`     3º: User ${ranking[2].id_usuario} - ${ranking[2].pontos_totais} pts`);
        }
      } catch (err) {
        console.log(`  ❌ Erro na rodada ${rodada}: ${err.message}`);
      }
    }

    console.log('\n=== DIAGNÓSTICO FASE 3: RANKINGS CALCULADOS ===\n');

    // Verificar total de rankings criados
    const [totalCheck] = await pool.query(
      'SELECT COUNT(DISTINCT rodada) as rodadas_com_ranking, COUNT(*) as total_linhas FROM ranking_rodada WHERE rodada BETWEEN 1 AND 21 AND campeonato_id=69'
    );

    console.log(`Total de rodadas com ranking: ${totalCheck[0].rodadas_com_ranking}/21`);
    console.log(`Total de linhas de ranking: ${totalCheck[0].total_linhas}`);
    console.log(`Média de usuários por rodada: ${(totalCheck[0].total_linhas / 21).toFixed(1)}\n`);

    // Mostrar ranking de cada rodada
    console.log('=== RESUMO DE RANKINGS POR RODADA ===\n');

    for (let rodada = 1; rodada <= 21; rodada++) {
      const [ranking] = await pool.query(
        'SELECT id_usuario, pontos_totais, posicao FROM ranking_rodada WHERE rodada=? AND campeonato_id=69 ORDER BY posicao LIMIT 3',
        [rodada]
      );

      if (ranking.length > 0) {
        const placares = ranking.map(r => `[${r.posicao}º: U${r.id_usuario}=${r.pontos_totais}pts]`).join(' ');
        console.log(`Rodada ${String(rodada).padStart(2, '0')}: ${placares}`);
      } else {
        console.log(`Rodada ${String(rodada).padStart(2, '0')}: ⚠️ Sem ranking`);
      }
    }

    console.log('\n=== DISTRIBUIÇÃO DE PONTOS (TODAS AS RODADAS) ===\n');

    // Mostrar distribuição de pontos
    const [pontosDistribucao] = await pool.query(`
      SELECT 
        ROUND(pontos_totais, 1) as pontos,
        COUNT(*) as quantidade
      FROM ranking_rodada 
      WHERE rodada BETWEEN 1 AND 21 AND campeonato_id=69
      GROUP BY ROUND(pontos_totais, 1)
      ORDER BY pontos DESC
    `);

    pontosDistribucao.forEach(dist => {
      console.log(`${dist.pontos}pts: ${dist.quantidade} ocorrências`);
    });

    console.log('\n✅ FASE 3 CONCLUÍDA\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
