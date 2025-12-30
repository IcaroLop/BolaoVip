/**
 * Script de teste para verificar sistema de saldo automático
 * Testa todos os cenários:
 * 1. Prêmio positivo -> Crédito de saldo
 * 2. Prêmio negativo com saldo total -> Débito automático
 * 3. Prêmio negativo com saldo parcial -> Confirmação necessária
 * 4. Prêmio negativo sem saldo -> Cobrança PIX
 */

const pool = require('../database/conexao');
const rankingController = require('../controllers/rankingController');
const saldoService = require('../services/saldoService');

async function testarSistemaSaldo() {
  console.log('🧪 === TESTE DO SISTEMA DE SALDO AUTOMÁTICO ===\n');

  try {
    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...');
    await pool.query('DELETE FROM premios WHERE rodada = 999');
    await pool.query('DELETE FROM extrato_movimentacao WHERE referencia_tipo = "premio_teste"');
    await pool.query('DELETE FROM ranking_rodada WHERE rodada = 999');
    
    // Criar usuários de teste com diferentes saldos
    console.log('\n👥 Configurando usuários de teste...');
    
    const [usuarios] = await pool.query('SELECT id FROM usuarios LIMIT 4');
    if (usuarios.length < 4) {
      console.log('❌ É necessário ter pelo menos 4 usuários no banco para o teste');
      return;
    }

    const userComSaldoTotal = usuarios[0].id;
    const userComSaldoParcial = usuarios[1].id;
    const userSemSaldo = usuarios[2].id;
    const userPremiado = usuarios[3].id;

    // Configurar saldos iniciais
    await pool.query('INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, 50.00, 0.00) ON DUPLICATE KEY UPDATE saldo_atual = 50.00, saldo_bloqueado = 0.00', [userComSaldoTotal]);
    await pool.query('INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, 5.00, 0.00) ON DUPLICATE KEY UPDATE saldo_atual = 5.00, saldo_bloqueado = 0.00', [userComSaldoParcial]);
    await pool.query('INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, 0.00, 0.00) ON DUPLICATE KEY UPDATE saldo_atual = 0.00, saldo_bloqueado = 0.00', [userSemSaldo]);
    await pool.query('INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, 0.00, 0.00) ON DUPLICATE KEY UPDATE saldo_atual = 0.00, saldo_bloqueado = 0.00', [userPremiado]);

    console.log(`   User ${userComSaldoTotal}: R$ 50,00 (saldo total para débito)`);
    console.log(`   User ${userComSaldoParcial}: R$ 5,00 (saldo parcial)`);
    console.log(`   User ${userSemSaldo}: R$ 0,00 (sem saldo)`);
    console.log(`   User ${userPremiado}: R$ 0,00 (será premiado)`);
  // Criar rodada 999 de teste se não existir
  await pool.query(`INSERT IGNORE INTO rodadas (id, numero, data_inicio, data_fim, status) VALUES (999, 999, '2025-01-01', '2025-01-07', 'encerrada')`);


    // Criar ranking simulado para rodada 999
    console.log('\n📊 Criando ranking de teste (rodada 999)...');
    await pool.query('INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, pontos_totais, posicao) VALUES (?, 999, 10, 100.0, 1)', [userPremiado]); // Campeão
    await pool.query('INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, pontos_totais, posicao) VALUES (?, 999, 10, 80.0, 2)', [userComSaldoTotal]); // Vice
    await pool.query('INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, pontos_totais, posicao) VALUES (?, 999, 10, 60.0, 3)', [userComSaldoParcial]); // Demais
    await pool.query('INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, pontos_totais, posicao) VALUES (?, 999, 10, 10.0, 4)', [userSemSaldo]); // Lanterna

    // Executar geração de premiações
    console.log('\n🏆 Gerando premiações...');
    await rankingController.gerarPremiacoesRodada(999, 10, null);

    // Verificar resultados
    console.log('\n📋 === RESULTADOS DO TESTE ===\n');

    // 1. Prêmio positivo (Campeão)
    const [premioPositivo] = await pool.query('SELECT * FROM premios WHERE usuario_id = ? AND rodada = 999', [userPremiado]);
    const saldoPremiado = await saldoService.obterSaldoUsuario(userPremiado);
    console.log('✅ CASO 1 - Crédito de premiação:');
    console.log(`   Status: ${premioPositivo[0].status_pagamento}`);
    console.log(`   Valor premiação: R$ ${Number(premioPositivo[0].valor).toFixed(2)}`);
    console.log(`   Saldo atual: R$ ${Number(saldoPremiado.saldo_disponivel).toFixed(2)}`);
    console.log(`   ${premioPositivo[0].status_pagamento === 'pago' && saldoPremiado.saldo_disponivel === 120 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // 2. Vice com prêmio positivo (crédito)
    const [premioVice] = await pool.query('SELECT * FROM premios WHERE usuario_id = ? AND rodada = 999', [userComSaldoTotal]);
    const saldoVice = await saldoService.obterSaldoUsuario(userComSaldoTotal);
    console.log('✅ CASO 2 - Crédito vice:');
    console.log(`   Status: ${premioVice[0].status_pagamento}`);
    console.log(`   Valor prêmio: R$ ${Number(premioVice[0].valor).toFixed(2)}`);
    console.log(`   Saldo atual: R$ ${Number(saldoVice.saldo_disponivel).toFixed(2)}`);
    console.log(`   ${(premioVice[0].status_pagamento === 'pago' && Number(saldoVice.saldo_disponivel) === 60) ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // 3. Saldo parcial (Demais)
    const [debitoParcial] = await pool.query('SELECT * FROM premios WHERE usuario_id = ? AND rodada = 999', [userComSaldoParcial]);
    const saldoParcial = await saldoService.obterSaldoUsuario(userComSaldoParcial);
    console.log('✅ CASO 3 - Saldo parcial (aguarda confirmação):');
    console.log(`   Status: ${debitoParcial[0].status_pagamento}`);
    console.log(`   Valor débito: R$ ${Number(Math.abs(debitoParcial[0].valor)).toFixed(2)}`);
    console.log(`   Saldo disponível: R$ ${Number(debitoParcial[0].saldo_parcial || 0).toFixed(2)}`);
    console.log(`   ${(debitoParcial[0].status_pagamento === 'pendente' && Number(debitoParcial[0].saldo_parcial || 0) === 5) ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // 4. Sem saldo (Lanterna) -> deve criar PIX
    const [debitoSemSaldo] = await pool.query('SELECT * FROM premios WHERE usuario_id = ? AND rodada = 999', [userSemSaldo]);
    const [pixCriado] = await pool.query('SELECT * FROM pix_cobrancas WHERE id_usuario = ? ORDER BY id DESC LIMIT 1', [userSemSaldo]);
    console.log('✅ CASO 4 - Sem saldo (cobrança PIX):');
    console.log(`   Status prêmio: ${debitoSemSaldo[0].status_pagamento}`);
    console.log(`   Valor débito: R$ ${Number(Math.abs(debitoSemSaldo[0].valor)).toFixed(2)}`);
    console.log(`   PIX criado: ${pixCriado.length > 0 ? 'Sim' : 'Não'}`);
    console.log(`   Valor PIX: R$ ${pixCriado[0] ? Number(pixCriado[0].valor_original).toFixed(2) : '0.00'}`);
    console.log(`   ${debitoSemSaldo[0].status_pagamento === 'pendente' && pixCriado.length > 0 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

    // Extrato de movimentações
    console.log('📜 === EXTRATO DE MOVIMENTAÇÕES ===\n');
    const [extratos] = await pool.query(`
      SELECT e.*, u.nome 
      FROM extrato_movimentacao e 
      JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.usuario_id IN (?, ?, ?, ?) 
      ORDER BY e.criado_em DESC
    `, [userPremiado, userComSaldoTotal, userComSaldoParcial, userSemSaldo]);

    extratos.forEach(e => {
      console.log(`   ${e.nome}: ${e.tipo} - R$ ${Number(e.valor).toFixed(2)} (${e.descricao})`);
    });

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (err) {
    console.error('❌ Erro durante o teste:', err);
  } finally {
    await pool.end();
  }
}

testarSistemaSaldo();
