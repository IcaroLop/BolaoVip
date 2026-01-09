#!/usr/bin/env node

/**
 * Script: diagnosticarRodada20.js
 * Propósito: Diagnosticar status completo da rodada 20 da Premier League
 * Usa: node scripts/diagnosticarRodada20.js
 */

const pool = require('../database/conexao');

(async () => {
  try {
    console.log('\n========================================');
    console.log('DIAGNÓSTICO RODADA 20 - PREMIER LEAGUE');
    console.log('========================================\n');

    // 1. Verificar status da rodada 20
    const [rodada] = await pool.query('SELECT numero, status, pagamentos_gerados FROM rodadas WHERE numero=20');
    console.log('=== STATUS DA RODADA 20 ===');
    if (rodada.length === 0) {
      console.log('❌ Rodada 20 não encontrada no banco');
      process.exit(1);
    }
    console.log(`Status: ${rodada[0].status}`);
    console.log(`Pagamentos gerados? ${rodada[0].pagamentos_gerados === 1 ? '✅ SIM' : '❌ NÃO'}\n`);

    // 2. Verificar placares dos jogos
    const [jogosStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 ELSE 0 END) as com_placar
      FROM jogos 
      WHERE rodada=20 AND campeonato_id=69
    `);
    
    console.log('=== JOGOS DA RODADA 20 ===');
    console.log(`Total de jogos: ${jogosStats[0].total}`);
    console.log(`Jogos com placar: ${jogosStats[0].com_placar}`);
    console.log(`Placar completo? ${jogosStats[0].com_placar === jogosStats[0].total ? '✅ SIM' : '❌ NÃO'}\n`);

    // 3. Listar os jogos com seus placares
    const [jogos] = await pool.query(`
      SELECT id, time_mandante, time_visitante, placar_mandante, placar_visitante, status 
      FROM jogos 
      WHERE rodada=20 AND campeonato_id=69 
      ORDER BY id
    `);
    
    console.log('=== DETALHES DOS JOGOS ===');
    jogos.forEach((jogo, idx) => {
      const placar = jogo.placar_mandante !== null && jogo.placar_visitante !== null 
        ? `${jogo.placar_mandante}x${jogo.placar_visitante}` 
        : 'SEM PLACAR';
      console.log(`${idx + 1}. ${jogo.time_mandante} vs ${jogo.time_visitante}: ${placar} (${jogo.status})`);
    });
    console.log();

    // 4. Verificar ranking
    const [ranking] = await pool.query(`
      SELECT id_usuario, pontos_totais, posicao 
      FROM ranking_rodada 
      WHERE rodada=20 AND campeonato_id=69 
      ORDER BY posicao
    `);
    
    console.log('=== RANKING RODADA 20 ===');
    console.log(`Total de usuários: ${ranking.length}`);
    if (ranking.length === 0) {
      console.log('⚠️ Nenhum usuário no ranking');
    } else {
      ranking.forEach(r => {
        console.log(`  Posição ${r.posicao}: Usuário ${r.id_usuario} - ${r.pontos_totais} pontos`);
      });
    }
    console.log();

    // 5. Verificar prêmios já gerados
    const [premios] = await pool.query(`
      SELECT usuario_id, tipo_premio, valor, status_pagamento 
      FROM premios 
      WHERE rodada=20 AND campeonato_id=69
    `);
    
    console.log('=== PRÊMIOS GERADOS ===');
    if (premios.length === 0) {
      console.log('❌ Nenhum prêmio gerado ainda');
    } else {
      console.log(`Total de prêmios: ${premios.length}`);
      premios.forEach(p => {
        const statusIcon = p.status_pagamento === 'credito_concluido' ? '✅' : '⏳';
        console.log(`  ${statusIcon} User ${p.usuario_id}: ${p.tipo_premio} - R$ ${p.valor} (${p.status_pagamento})`);
      });
    }
    console.log();

    // 6. Verificar saldo atual do user 7
    const [usuario] = await pool.query('SELECT id, nome, saldo FROM usuarios WHERE id=7');
    
    console.log('=== SALDO DO USUÁRIO 7 (ICARO) ===');
    if (usuario.length === 0) {
      console.log('❌ Usuário 7 não encontrado');
    } else {
      console.log(`Nome: ${usuario[0].nome}`);
      console.log(`Saldo atual: R$ ${usuario[0].saldo}`);
    }
    console.log();

    // 7. Verificar palpites do user 7 na rodada 20
    const [palpites] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM palpites 
      WHERE id_usuario=7 AND rodada=20 AND campeonato_id=69
    `);
    
    console.log('=== PALPITES DO USUÁRIO 7 - RODADA 20 ===');
    console.log(`Total de palpites: ${palpites[0].total}`);
    console.log();

    // 8. Verificar extrato de movimentação para user 7
    const [extrato] = await pool.query(`
      SELECT * FROM extrato_movimentacao 
      WHERE usuario_id=7
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log('=== ÚLTIMAS MOVIMENTAÇÕES (USER 7) ===');
    if (extrato.length === 0) {
      console.log('Sem movimentações registradas');
    } else {
      extrato.forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.tipo}: R$ ${m.valor} (${m.saldo_anterior} -> ${m.saldo_novo})`);
      });
    }
    console.log();

    // 9. Resumo e recomendações
    console.log('=== RESUMO & RECOMENDAÇÕES ===');
    const rodadaFinalizada = rodada[0].status === 'encerrada';
    const todosJogosComPlacar = jogosStats[0].com_placar === jogosStats[0].total;
    const palpitesUser7 = palpites[0].total > 0;
    const rankingExiste = ranking.length > 0;
    const premiosGerados = premios.length > 0;

    console.log(`1. Rodada finalizada (status='encerrada')? ${rodadaFinalizada ? '✅' : '❌'}`);
    console.log(`2. Todos os placares inseridos? ${todosJogosComPlacar ? '✅' : '❌'}`);
    console.log(`3. Usuário 7 tem palpites? ${palpitesUser7 ? '✅' : '❌'}`);
    console.log(`4. Ranking foi calculado? ${rankingExiste ? '✅' : '❌'}`);
    console.log(`5. Prêmios foram gerados? ${premiosGerados ? '✅' : '❌'}`);

    if (!rodadaFinalizada) {
      console.log('\n⚠️ AÇÃO NECESSÁRIA: Alterar status da rodada para "encerrada"');
    }
    if (!todosJogosComPlacar) {
      console.log('\n⚠️ AÇÃO NECESSÁRIA: Inserir placares de todos os jogos');
    }
    if (!premiosGerados && rodadaFinalizada && todosJogosComPlacar) {
      console.log('\n✅ PRONTO: Execute o endpoint para gerar pagamentos');
      console.log('   curl -X POST "http://localhost:3001/ranking/rodada/20/gerar-pagamentos?campeonatoId=69&grupoId=2"');
    }

    console.log('\n========================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
