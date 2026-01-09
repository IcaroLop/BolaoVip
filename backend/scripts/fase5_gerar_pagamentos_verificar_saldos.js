#!/usr/bin/env node

/**
 * Script: fase5_gerar_pagamentos_verificar_saldos.js
 * Propósito: Gerar pagamentos para rodadas 1-21 e verificar saldos após cada um
 * Usa: node scripts/fase5_gerar_pagamentos_verificar_saldos.js
 */

const pool = require('../database/conexao');
const rankingController = require('../controllers/rankingController');

(async () => {
  try {
    console.log('\n========================================');
    console.log('FASE 5: GERAR PAGAMENTOS E VERIFICAR SALDOS');
    console.log('========================================\n');

    const campeonatoId = 69; // Premier League
    const grupoId = 2;
    const rodadas = Array.from({ length: 21 }, (_, i) => i + 1);

    // Salvar saldos iniciais
    const [saldosIniciais] = await pool.query(
      'SELECT id, saldo FROM usuarios WHERE id IN (1,2,3,4,5,6,7,8,9) ORDER BY id'
    );
    
    console.log('=== SALDOS INICIAIS ===\n');
    const saldosAntes = {};
    saldosIniciais.forEach(u => {
      saldosAntes[u.id] = u.saldo;
      console.log(`User ${u.id}: R$ ${u.saldo.toFixed(2)}`);
    });

    // Processar cada rodada
    const relatorios = [];

    for (const rodada of rodadas) {
      console.log(`\n--- Rodada ${rodada} ---`);

      try {
        // 1. Verificar se rodada está encerrada
        const [rodadaCheck] = await pool.query(
          'SELECT numero, status FROM rodadas WHERE numero=?',
          [rodada]
        );

        if (rodadaCheck[0].status !== 'encerrada') {
          console.log(`⚠️ Rodada ${rodada} não está encerrada. Pulando...`);
          continue;
        }

        // 2. Gerar prêmios (chamando função do controller)
        try {
          await rankingController.gerarPremiacoesRodada(rodada, campeonatoId, grupoId);
          console.log(`✅ Prêmios gerados`);
        } catch (err) {
          console.log(`⚠️ Erro ao gerar prêmios: ${err.message}`);
        }

        // 3. Verificar prêmios criados
        const [premios] = await pool.query(
          'SELECT tipo_premio, valor, usuario_id FROM premios WHERE rodada=? AND campeonato_id=?',
          [rodada, campeonatoId]
        );

        console.log(`   Prêmios: ${premios.length}`);
        premios.slice(0, 3).forEach(p => {
          console.log(`   - User ${p.usuario_id}: ${p.tipo_premio} R$ ${p.valor.toFixed(2)}`);
        });

        // 4. Obter saldos atuais
        const [saldosDepois] = await pool.query(
          'SELECT id, saldo FROM usuarios WHERE id IN (1,2,3,4,5,6,7,8,9) ORDER BY id'
        );

        // 5. Verificar movimentações
        const [movimentacoes] = await pool.query(`
          SELECT 
            usuario_id,
            tipo,
            valor,
            saldo_anterior,
            saldo_novo
          FROM extrato_movimentacao 
          WHERE usuario_id IN (1,2,3,4,5,6,7,8,9)
            AND tipo LIKE '%premio%'
            AND id > (SELECT COALESCE(MAX(id), 0) FROM extrato_movimentacao WHERE usuario_id IN (1,2,3,4,5,6,7,8,9) AND tipo NOT LIKE '%premio%' LIMIT 1)
          ORDER BY usuario_id
        `);

        console.log(`   Movimentações: ${movimentacoes.length}`);

        // 6. Validar saldos
        let todosCorretos = true;
        movimentacoes.forEach(m => {
          const saldoAtual = saldosDepois.find(s => s.id === m.usuario_id)?.saldo;
          const saldoEsperado = m.saldo_novo;
          
          if (saldoAtual !== saldoEsperado) {
            console.log(`   ❌ User ${m.usuario_id}: Saldo esperado R$ ${saldoEsperado.toFixed(2)}, encontrado R$ ${saldoAtual.toFixed(2)}`);
            todosCorretos = false;
          }
        });

        if (todosCorretos && movimentacoes.length > 0) {
          console.log(`   ✅ Saldos validados com sucesso`);
        }

        relatorios.push({
          rodada,
          premios: premios.length,
          movimentacoes: movimentacoes.length,
          status: todosCorretos ? 'OK' : 'ERRO'
        });

      } catch (err) {
        console.log(`❌ Erro na rodada ${rodada}: ${err.message}`);
        relatorios.push({
          rodada,
          premios: 0,
          movimentacoes: 0,
          status: 'ERRO'
        });
      }
    }

    // Relatório Final
    console.log('\n\n========================================');
    console.log('RELATÓRIO FINAL FASE 5');
    console.log('========================================\n');

    console.log('=== RESUMO POR RODADA ===\n');
    relatorios.forEach(r => {
      const icon = r.status === 'OK' ? '✅' : '❌';
      console.log(`${icon} Rodada ${String(r.rodada).padStart(2, ' ')}: ${r.premios} prêmios, ${r.movimentacoes} movs - ${r.status}`);
    });

    // Saldos finais
    const [saldosFinais] = await pool.query(
      'SELECT id, saldo FROM usuarios WHERE id IN (1,2,3,4,5,6,7,8,9) ORDER BY id'
    );

    console.log('\n=== SALDOS FINAIS ===\n');
    let totalSaldoFinal = 0;
    saldosFinais.forEach(u => {
      const diferenca = u.saldo - saldosAntes[u.id];
      const icon = diferenca !== 0 ? '✅' : '⏸️';
      console.log(`${icon} User ${u.id}: R$ ${u.saldo.toFixed(2)} (${diferenca >= 0 ? '+' : ''}${diferenca.toFixed(2)})`);
      totalSaldoFinal += u.saldo;
    });

    console.log(`\nTotal Inicial: R$ ${Object.values(saldosAntes).reduce((a, b) => a + b, 0).toFixed(2)}`);
    console.log(`Total Final: R$ ${totalSaldoFinal.toFixed(2)}`);

    const sucessosas = relatorios.filter(r => r.status === 'OK').length;
    console.log(`\n${sucessosas}/21 rodadas processadas com sucesso`);

    console.log('\n✅ FASE 5 CONCLUÍDA\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
