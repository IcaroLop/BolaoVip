#!/usr/bin/env node

/**
 * Script: Testar Webhook EFI PIX
 * Propósito: Simular o pagamento de uma cobrança PIX via webhook da EFI
 * 
 * Uso: node backend/scripts/testarWebhookEfiPix.js
 * 
 * Este script irá:
 * 1. Buscar a cobrança pendente de Maria Souza (rodada 3)
 * 2. Simular um webhook da EFI com status='CONCLUIDA'
 * 3. Enviar para o endpoint POST /pix/webhook
 * 4. Verificar se o status foi atualizado para 'PAGO'
 */

require('dotenv').config();
const axios = require('axios');
const pool = require('../database/conexao');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testarWebhookEfiPix() {
  try {
    console.log('\n🧪 TESTE DE WEBHOOK EFI PIX');
    console.log('=====================================\n');

    // 1) Buscar cobrança pendente de Maria Souza (rodada 3)
    console.log('1️⃣  Buscando cobrança de Maria Souza (rodada 3)...');
    const [cobrancas] = await pool.query(`
      SELECT 
        id, 
        id_usuario, 
        txid, 
        valor_original, 
        status_pagamento,
        payload_raw
      FROM pix_cobrancas
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
        AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
        AND status_pagamento = 'PENDENTE'
      LIMIT 1
    `);

    if (!cobrancas || cobrancas.length === 0) {
      console.error('❌ Nenhuma cobrança pendente encontrada para rodada 3!');
      process.exit(1);
    }

    const cobranca = cobrancas[0];
    console.log(`✅ Cobrança encontrada:`);
    console.log(`   ID: ${cobranca.id}`);
    console.log(`   Usuario ID: ${cobranca.id_usuario}`);
    console.log(`   TXID: ${cobranca.txid}`);
    console.log(`   Valor: R$ ${cobranca.valor_original.toFixed(2)}`);
    console.log(`   Status Atual: ${cobranca.status_pagamento}\n`);

    // 2) Preparar payload do webhook (simulando resposta da EFI)
    console.log('2️⃣  Preparando payload do webhook EFI...');
    const webhookPayload = {
      pix: [
        {
          txid: cobranca.txid,
          status: 'CONCLUIDA',  // ✅ Indicador de pagamento recebido
          valor: cobranca.valor_original,
          pagador: {
            cpf: '12345678901',
            nome: 'Apostador'
          },
          recebedor: {
            cpf: process.env.PIX_CPF_RECEBEDOR || '00000000000',
            nome: 'Bolão VIP'
          },
          endToEndId: `E${Date.now()}`,
          horario: new Date().toISOString()
        }
      ]
    };

    console.log(`✅ Payload preparado:`);
    console.log(JSON.stringify(webhookPayload, null, 2));
    console.log();

    // 3) Enviar webhook para o servidor
    console.log('3️⃣  Enviando webhook para /pix/webhook...');
    const webhookUrl = `${API_BASE_URL}/pix/webhook`;
    console.log(`   URL: ${webhookUrl}\n`);

    try {
      const response = await axios.post(webhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Webhook recebido com sucesso!`);
      console.log(`   Status HTTP: ${response.status}`);
      console.log(`   Resposta: ${response.data}\n`);
    } catch (err) {
      console.error(`❌ Erro ao enviar webhook: ${err.message}`);
      if (err.response) {
        console.error(`   Status: ${err.response.status}`);
        console.error(`   Dados: ${JSON.stringify(err.response.data)}`);
      }
      process.exit(1);
    }

    // 4) Verificar se o status foi atualizado
    console.log('4️⃣  Verificando se o pagamento foi registrado...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

    const [cobrancasApos] = await pool.query(`
      SELECT 
        id, 
        status_pagamento,
        data_pagamento,
        webhook_recebido,
        webhook_payload
      FROM pix_cobrancas
      WHERE txid = ?
    `, [cobranca.txid]);

    if (!cobrancasApos || cobrancasApos.length === 0) {
      console.error('❌ Cobrança não encontrada após webhook!');
      process.exit(1);
    }

    const cobrancaApos = cobrancasApos[0];
    console.log(`✅ Status atualizado:`);
    console.log(`   Status Pagamento: ${cobrancaApos.status_pagamento}`);
    console.log(`   Data Pagamento: ${cobrancaApos.data_pagamento}`);
    console.log(`   Webhook Recebido: ${cobrancaApos.webhook_recebido ? 'SIM' : 'NÃO'}`);
    console.log(`   Payload Webhook: ${cobrancaApos.webhook_payload ? 'Salvo' : 'Não salvo'}\n`);

    // 5) Verificar se prêmio foi atualizado (se for palpite)
    const payloadObj = JSON.parse(cobranca.payload_raw || '{}');
    if (payloadObj.origem === 'palpites') {
      console.log('5️⃣  Verificando palpite relacionado...');
      const [palpites] = await pool.query(`
        SELECT id, status_pagamento, data_pagamento
        FROM palpites
        WHERE codigo_envio = ?
      `, [cobranca.txid]);

      if (palpites && palpites.length > 0) {
        console.log(`✅ Palpite atualizado:`);
        console.log(`   ID: ${palpites[0].id}`);
        console.log(`   Status: ${palpites[0].status_pagamento}`);
        console.log(`   Data: ${palpites[0].data_pagamento}\n`);
      }
    }

    // 6) Resultado final
    console.log('=====================================');
    if (cobrancaApos.status_pagamento === 'PAGO' && cobrancaApos.webhook_recebido) {
      console.log('✅ TESTE WEBHOOK CONCLUÍDO COM SUCESSO!');
      console.log('   Cobrança de Maria Souza foi marcada como PAGO');
      console.log('   Webhook foi registrado no banco de dados');
    } else {
      console.log('⚠️  TESTE PARCIALMENTE BEM-SUCEDIDO');
      console.log(`   Status: ${cobrancaApos.status_pagamento}`);
      console.log(`   Webhook Recebido: ${cobrancaApos.webhook_recebido}`);
    }
    console.log('=====================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO DURANTE TESTE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar teste
testarWebhookEfiPix();
