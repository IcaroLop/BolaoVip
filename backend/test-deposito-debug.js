#!/usr/bin/env node
/**
 * Script de DEBUG para testar fluxo completo de depósito PIX
 * Mostra exatamente o que a EFI está retornando
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const log = (msg, color = 'reset') => {
  console.log(`${colors[color]}${msg}${colors.reset}`);
};

async function testDepositoDebug() {
  try {
    log('\n========== TESTE DE DEPÓSITO PIX DEBUG ==========\n', 'cyan');

    // 1. Login
    log('[1/3] 🔐 Fazendo login...', 'blue');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'icaro@gmail.com',
      senha: 'icaro123'
    });
    
    const token = loginRes.data.token;
    log(`✅ Token obtido: ${token.substring(0, 20)}...`, 'green');

    // 2. Solicitar depósito de R$ 20
    log('\n[2/3] 💰 Solicitando depósito PIX de R$ 20...', 'blue');
    const depositoRes = await axios.post(`${API_BASE_URL}/saldo/deposito`, {
      valor: 20
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    log('\n✅ RESPOSTA COMPLETA DO DEPÓSITO:', 'green');
    log(JSON.stringify(depositoRes.data, null, 2), 'cyan');

    // 3. Analisar resposta
    log('\n[3/3] 📊 ANÁLISE DA RESPOSTA:', 'blue');
    
    const data = depositoRes.data;
    
    log(`\n  sucesso: ${data.sucesso}`, data.sucesso ? 'green' : 'red');
    log(`  deposito_id: ${data.deposito_id}`, 'cyan');
    log(`  txid: ${data.txid}`, 'cyan');
    log(`  valor: R$ ${data.valor}`, 'cyan');
    
    if (data.pix_copiaecola) {
      log(`  ✅ pix_copiaecola ENCONTRADO (${data.pix_copiaecola.length} chars)`, 'green');
      log(`  Primeiros 50 chars: ${data.pix_copiaecola.substring(0, 50)}...`, 'yellow');
    } else {
      log(`  ❌ pix_copiaecola NÃO ENCONTRADO!`, 'red');
    }

    if (data.qrcode_url) {
      log(`  ✅ qrcode_url ENCONTRADO`, 'green');
      log(`  URL: ${data.qrcode_url.substring(0, 80)}...`, 'yellow');
    } else {
      log(`  ❌ qrcode_url NÃO ENCONTRADO!`, 'red');
    }

    log(`  calendario_expiracao: ${data.calendario_expiracao} segundos`, 'cyan');

    if (data.dados_completos) {
      log(`\n  📄 Dados completos salvos no banco:`, 'blue');
      log(JSON.stringify(data.dados_completos, null, 2), 'yellow');
    }

    log('\n========== TESTE CONCLUÍDO ==========\n', 'cyan');

  } catch (error) {
    log('\n❌ ERRO:', 'red');
    log(`Status: ${error.response?.status}`, 'red');
    log(`Mensagem: ${error.response?.data?.erro || error.message}`, 'red');
    
    if (error.response?.data) {
      log('\nDetalhes:', 'red');
      log(JSON.stringify(error.response.data, null, 2), 'yellow');
    }

    log(`\nStack: ${error.stack}`, 'red');
  }
}

// Executar teste
testDepositoDebug().catch(err => {
  log(`\nERRO FATAL: ${err.message}`, 'red');
  process.exit(1);
});
