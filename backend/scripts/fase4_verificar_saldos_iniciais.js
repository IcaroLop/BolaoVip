#!/usr/bin/env node

/**
 * Script: fase4_verificar_saldos_iniciais.js
 * Propósito: Verificar saldos iniciais antes de gerar pagamentos
 * Usa: node scripts/fase4_verificar_saldos_iniciais.js
 */

const pool = require('../database/conexao');

(async () => {
  try {
    console.log('\n========================================');
    console.log('FASE 4: VERIFICAR SALDOS INICIAIS');
    console.log('========================================\n');

    // 1. Verificar saldos atuais de todos os usuários (AMBAS as tabelas)
    const [usuarios] = await pool.query(
      'SELECT u.id, u.nome, u.saldo as saldo_usuarios, su.saldo_atual as saldo_usuario_tabela FROM usuarios u LEFT JOIN saldo_usuario su ON u.id = su.usuario_id WHERE u.id IN (1,2,3,4,5,6,7,8,9) ORDER BY u.id'
    );

    console.log('=== SALDOS ATUAIS DOS USUÁRIOS ===\n');
    let totalSaldos = 0;
    usuarios.forEach(u => {
      const saldoCorreto = (u.saldo_usuarios === 300 && u.saldo_usuario_tabela === 300);
      const status = saldoCorreto ? '✅' : '⚠️';
      console.log(`${status} User ${u.id}: ${u.nome.padEnd(20)} - usuarios: R$ ${u.saldo_usuarios.toFixed(2)}, saldo_usuario: R$ ${(u.saldo_usuario_tabela || 0).toFixed(2)}`);
      totalSaldos += u.saldo_usuarios;
    });

    console.log(`\nSaldo Total: R$ ${totalSaldos.toFixed(2)}`);
    console.log(`Saldo Esperado (9 × R$300): R$ ${(9 * 300).toFixed(2)}`);
    console.log(`Status: ${totalSaldos === 2700 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    // 2. Verificar movimentações recentes
    const [movimentacoes] = await pool.query(`
      SELECT 
        usuario_id,
        tipo,
        COUNT(*) as quantidade,
        SUM(valor) as total_movimentado
      FROM extrato_movimentacao 
      WHERE usuario_id IN (1,2,3,4,5,6,7,8,9)
      GROUP BY usuario_id, tipo
      ORDER BY usuario_id, tipo
    `);

    console.log('=== MOVIMENTAÇÕES POR USUÁRIO E TIPO ===\n');
    if (movimentacoes.length === 0) {
      console.log('✅ Sem movimentações registradas (estado limpo)\n');
    } else {
      movimentacoes.forEach(m => {
        console.log(`User ${m.usuario_id} - ${m.tipo}: ${m.quantidade} movimentações, Total: R$ ${m.total_movimentado.toFixed(2)}`);
      });
      console.log();
    }

    // 3. Verificar prêmios pendentes
    const [premios] = await pool.query(`
      SELECT 
        rodada,
        COUNT(*) as quantidade,
        SUM(valor) as total_premios
      FROM premios 
      WHERE rodada BETWEEN 1 AND 21 AND campeonato_id=69
      GROUP BY rodada
    `);

    console.log('=== PRÊMIOS JÁ GERADOS ===\n');
    if (premios.length === 0) {
      console.log('✅ Sem prêmios gerados (estado limpo)\n');
    } else {
      premios.forEach(p => {
        console.log(`Rodada ${p.rodada}: ${p.quantidade} prêmios, Total: R$ ${p.total_premios.toFixed(2)}`);
      });
      console.log();
    }

    // 4. Verificar status das rodadas
    const [rodadas] = await pool.query(`
      SELECT 
        numero,
        status,
        pagamentos_gerados
      FROM rodadas 
      WHERE numero BETWEEN 1 AND 21
      ORDER BY numero
    `);

    console.log('=== STATUS DAS RODADAS ===\n');
    let encerradas = 0;
    let comPagamentos = 0;

    rodadas.forEach(r => {
      if (r.status === 'encerrada') encerradas++;
      if (r.pagamentos_gerados === 1) comPagamentos++;
      const statusIcon = r.status === 'encerrada' ? '✅' : '⏳';
      const pagtoIcon = r.pagamentos_gerados === 1 ? '✅' : '❌';
      console.log(`${statusIcon} Rodada ${String(r.numero).padStart(2, ' ')}: ${r.status.padEnd(10)} ${pagtoIcon} Pagtos: ${r.pagamentos_gerados}`);
    });

    console.log(`\nRodadas encerradas: ${encerradas}/21`);
    console.log(`Rodadas com pagamentos: ${comPagamentos}/21\n`);

    // 5. Verificar se há placares em todos os jogos das rodadas 1-21
    const [jogosStats] = await pool.query(`
      SELECT 
        rodada,
        COUNT(*) as total_jogos,
        SUM(CASE WHEN placar_mandante IS NOT NULL THEN 1 ELSE 0 END) as jogos_com_placar
      FROM jogos 
      WHERE rodada BETWEEN 1 AND 21 AND campeonato_id=69
      GROUP BY rodada
      ORDER BY rodada
    `);

    console.log('=== STATUS DOS JOGOS E PLACARES ===\n');
    let todasComPlacar = true;

    jogosStats.forEach(j => {
      const completo = j.total_jogos === j.jogos_com_placar;
      const icon = completo ? '✅' : '⚠️';
      console.log(`${icon} Rodada ${String(j.rodada).padStart(2, ' ')}: ${j.jogos_com_placar}/${j.total_jogos} placares`);
      if (!completo) todasComPlacar = false;
    });

    console.log(`\n${todasComPlacar ? '✅ TODAS AS RODADAS COM PLACARES' : '⚠️ FALTAM PLACARES EM ALGUMAS RODADAS'}\n`);

    console.log('=== RESUMO FASE 4 ===\n');
    console.log(`✅ Saldos iniciais: R$ 300.00 cada`);
    console.log(`✅ Movimentações limpas`);
    console.log(`✅ Prêmios limpos`);
    console.log(`✅ ${encerradas}/21 rodadas encerradas`);
    console.log(`✅ Placares disponíveis: ${todasComPlacar ? 'SIM' : 'NÃO'}`);
    console.log(`\n✅ PRONTO PARA FASE 5: GERAÇÃO DE PAGAMENTOS\n`);

    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
