#!/usr/bin/env node

/**
 * Script de Teste: Fluxo Completo de Depósito PIX
 * 
 * Simula todo o ciclo de depósito:
 * 1. Gerar PIX (mock EFI)
 * 2. Verificar status (mock EFI)
 * 3. Creditar saldo (local)
 * 4. Registrar extrato (local)
 * 
 * Uso: node testarDepositoPix.js
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_USER_ID = process.env.TEST_USER_ID || 1;
const TEST_TOKEN = process.env.TEST_TOKEN || null;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testarDepositoPix() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       🧪 TESTE: Fluxo Completo de Depósito PIX via EFI         ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

  // Step 0: Validar Token
  if (!TEST_TOKEN) {
    log('\n❌ ERRO: TEST_TOKEN não configurado', 'red');
    log('   Use: TEST_TOKEN=seu_token node testarDepositoPix.js', 'yellow');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // STEP 1: Gerar Depósito PIX
    log('\n[STEP 1] Gerando Depósito PIX via EFI...', 'blue');
    log(`  POST ${API_BASE_URL}/saldo/deposito`, 'cyan');
    log(`  Body: { "valor": 50.00 }`, 'cyan');

    const depositoResponse = await axios.post(
      `${API_BASE_URL}/saldo/deposito`,
      { valor: 50.00 },
      { headers }
    );

    const depositoData = depositoResponse.data;
    log(`  ✅ Depósito criado com sucesso!`, 'green');
    log(`     Depósito ID: ${depositoData.deposito_id}`, 'green');
    log(`     txid: ${depositoData.txid}`, 'green');
    log(`     Valor: R$ ${depositoData.valor.toFixed(2)}`, 'green');
    log(`     Válido por: ${depositoData.calendario_expiracao}s`, 'green');
    log(`     Código PIX (primeiros 50 chars): ${depositoData.pix_copiaecola.substring(0, 50)}...`, 'green');

    // STEP 2: Verificar Saldo ANTES
    log('\n[STEP 2] Verificando Saldo ANTES da confirmação...', 'blue');
    const saldoAntesResponse = await axios.get(
      `${API_BASE_URL}/saldo/usuario`,
      { headers }
    );
    const saldoAntes = saldoAntesResponse.data.saldo_atual;
    log(`  ✅ Saldo Atual: R$ ${parseFloat(saldoAntes).toFixed(2)}`, 'green');

    // STEP 3: Simular Fallback (Verificação Manual)
    log('\n[STEP 3] Aguardando 5 segundos (simulando delay do usuario pagar)...', 'blue');
    await new Promise(r => setTimeout(r, 5000));

    log('\n[STEP 4] Executando Fallback Manualmente...', 'blue');
    log(`  POST ${API_BASE_URL}/debug-fallback/executar`, 'cyan');

    try {
      const fallbackResponse = await axios.post(
        `${API_BASE_URL}/debug-fallback/executar`,
        {},
        { headers }
      );
      
      log(`  ✅ Fallback executado:`, 'green');
      log(`     Cobranças verificadas: ${fallbackResponse.data.cobracas.verificadas || 0}`, 'green');
      log(`     Cobranças atualizadas: ${fallbackResponse.data.cobracas.atualizadas || 0}`, 'green');
      log(`     Depósitos verificados: ${fallbackResponse.data.depositos.verificados || 0}`, 'green');
      log(`     Depósitos atualizados: ${fallbackResponse.data.depositos.atualizados || 0}`, 'green');
    } catch (err) {
      log(`  ⚠️  Fallback endpoint não disponível (normal se não houver rota de debug)`, 'yellow');
      log(`     Sugestão: Esperar 5 minutos para o cron job executar`, 'yellow');
    }

    // STEP 5: Verificar Saldo DEPOIS
    log('\n[STEP 5] Verificando Saldo APÓS confirmação...', 'blue');
    await new Promise(r => setTimeout(r, 2000)); // Pequeno delay

    const saldoDepoisResponse = await axios.get(
      `${API_BASE_URL}/saldo/usuario`,
      { headers }
    );
    const saldoDepois = saldoDepoisResponse.data.saldo_atual;
    const diferencaSaldo = parseFloat(saldoDepois) - parseFloat(saldoAntes);

    log(`  ✅ Saldo Atualizado: R$ ${parseFloat(saldoDepois).toFixed(2)}`, 'green');
    
    if (diferencaSaldo > 0) {
      log(`  ✅ DIFERENÇA: +R$ ${diferencaSaldo.toFixed(2)} (SUCESSO!)`, 'green');
    } else {
      log(`  ⚠️  DIFERENÇA: R$ ${diferencaSaldo.toFixed(2)} (Fallback pode estar aguardando)`, 'yellow');
    }

    // STEP 6: Verificar Extrato
    log('\n[STEP 6] Verificando Extrato de Movimentações...', 'blue');
    const extratoResponse = await axios.get(
      `${API_BASE_URL}/saldo/extrato?tipo=deposito&limite=5`,
      { headers }
    );

    const movimentacoes = extratoResponse.data;
    if (movimentacoes && movimentacoes.length > 0) {
      log(`  ✅ Encontradas ${movimentacoes.length} movimentação(ões) de depósito:`, 'green');
      movimentacoes.slice(0, 3).forEach((m, i) => {
        log(`     [${i + 1}] R$ ${parseFloat(m.valor).toFixed(2)} | Status: ${m.status} | ${m.descricao}`, 'green');
      });
    } else {
      log(`  ⚠️  Nenhuma movimentação de depósito encontrada (ainda não confirmado)`, 'yellow');
    }

    // RESUMO
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    📊 RESUMO DO TESTE                          ║', 'cyan');
    log('╠════════════════════════════════════════════════════════════════╣', 'cyan');
    log(`║ ✅ PIX Gerado: txid = ${depositoData.txid}`, 'cyan');
    log(`║ ✅ Valor Solicitado: R$ ${depositoData.valor.toFixed(2)}`, 'cyan');
    log(`║ ✅ Saldo Antes: R$ ${parseFloat(saldoAntes).toFixed(2)}`, 'cyan');
    log(`║ ✅ Saldo Depois: R$ ${parseFloat(saldoDepois).toFixed(2)}`, 'cyan');
    
    if (diferencaSaldo > 0) {
      log(`║ ✅ RESULTADO: Depósito confirmado e saldo creditado!`, 'cyan');
    } else {
      log(`║ ⏳ RESULTADO: Aguardando confirmação (fallback em ~5min)`, 'cyan');
    }
    log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

    // PRÓXIMOS PASSOS
    log('\n📋 PRÓXIMOS PASSOS:', 'yellow');
    log('   1. Verifique o QRCode/Código PIX no frontend (DepositoModal)', 'yellow');
    log('   2. Se desejado, importe a transação como PAGO no banco:', 'yellow');
    log(`      UPDATE pix_depositos SET status_pagamento='PAGO', webhook_recebido=1 WHERE txid='${depositoData.txid}';`, 'yellow');
    log('   3. Execute o fallback manualmente para testar crédito:', 'yellow');
    log('      Ou aguarde 5 minutos para o cron job executar automaticamente', 'yellow');

  } catch (error) {
    log(`\n❌ ERRO durante teste:`, 'red');
    log(`   ${error.response?.data?.erro || error.message}`, 'red');
    
    if (error.response?.status === 401) {
      log(`\n   🔑 Token expirado ou inválido. Use:`, 'red');
      log(`      TEST_TOKEN=seu_token_valido node testarDepositoPix.js`, 'yellow');
    }

    process.exit(1);
  }
}

// Executar teste
testarDepositoPix().catch(err => {
  log(`\n❌ Erro não capturado: ${err.message}`, 'red');
  process.exit(1);
});
