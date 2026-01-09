#!/usr/bin/env node
/**
 * Script: Diagnóstico da Rodada 21
 * Objetivo: Verificar status, placares e critérios para gerar pagamentos
 */

const db = require('../database/conexao');

(async () => {
  try {
    console.log('\n===== Diagnóstico Rodada 21 =====\n');

    // 1. Verificar status da rodada
    console.log('📋 Status da Rodada 21:');
    const [rodada] = await db.query(`
      SELECT numero, status, pagamentos_gerados, pagamentos_gerados_em
      FROM rodadas 
      WHERE numero = 21
    `);
    
    if (rodada.length === 0) {
      console.log('❌ ERRO: Rodada 21 não encontrada na tabela rodadas!');
    } else {
      console.log(`  Número: ${rodada[0].numero}`);
      console.log(`  Status: ${rodada[0].status}`);
      console.log(`  Pagamentos gerados: ${rodada[0].pagamentos_gerados}`);
      console.log(`  Gerados em: ${rodada[0].pagamentos_gerados_em}`);
    }

    // 2. Verificar placares dos jogos
    console.log('\n🎯 Placares dos Jogos da Rodada 21:');
    const [jogos] = await db.query(`
      SELECT 
        id, time_mandante, time_visitante, 
        placar_mandante, placar_visitante, status,
        CASE 
          WHEN placar_mandante IS NOT NULL THEN 'COM PLACAR'
          ELSE 'SEM PLACAR'
        END as tem_placar
      FROM jogos 
      WHERE rodada = 21 AND campeonato_id = 69
      ORDER BY id
    `);

    console.log(`Total de jogos: ${jogos.length}`);
    const comPlacar = jogos.filter(j => j.placar_mandante !== null).length;
    const semPlacar = jogos.filter(j => j.placar_mandante === null).length;
    console.log(`Com placar: ${comPlacar}`);
    console.log(`SEM placar: ${semPlacar}`);

    if (semPlacar > 0) {
      console.log('\n⚠️ PROBLEMA: Jogos sem placar:');
      jogos.filter(j => j.placar_mandante === null).forEach(j => {
        console.log(`  - Jogo ${j.id}: ${j.time_mandante} vs ${j.time_visitante}`);
      });
    }

    console.log('\n🔍 Condição para Gerar Pagamentos:');
    console.log('  - Status DEVE ser "encerrada"');
    console.log('  - E todos os jogos DEVEM ter placar');
    
    console.log(`\n  ✓ Todos os jogos têm placar? ${semPlacar === 0 ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`  ✓ Status da rodada é "encerrada"? ${rodada[0]?.status === 'encerrada' ? 'SIM ✅' : 'NÃO ❌ (é: ' + rodada[0]?.status + ')'}`);
    
    if (semPlacar === 0 && rodada[0]?.status === 'encerrada') {
      console.log('\n  ✅ TUDO OK! Pode gerar pagamentos!');
    } else {
      console.log('\n  ❌ Ainda há problemas a resolver');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  }
})();
