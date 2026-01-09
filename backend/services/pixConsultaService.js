const axios = require('axios');
const db = require('../database/conexao');
const { criarNotificacao } = require('./notificacoesService');
const fs = require('fs');
const https = require('https');

/**
 * Consulta o status de uma cobrança PIX diretamente na API da EFI
 * @param {string} txid - ID da transação PIX
 * @returns {Promise<Object>} - Dados da cobrança
 */
async function consultarCobrancaEfi(txid) {
  try {
    console.log(`[PIX Consulta] Consultando txid: ${txid}`);

    // 1. Obter token OAuth2
    const tokenUrl = process.env.EFI_PIX_SANDBOX === 'true'
      ? 'https://pix-h.api.efipay.com.br/oauth/token'
      : 'https://pix.api.efipay.com.br/oauth/token';

    const credentials = Buffer.from(
      `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
    ).toString('base64');

    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(process.env.EFI_PIX_CERT_PATH),
      key: fs.readFileSync(process.env.EFI_PIX_KEY_PATH),
      rejectUnauthorized: process.env.EFI_PIX_SANDBOX === 'true' ? false : true
    });

    const tokenResponse = await axios.post(
      tokenUrl,
      { grant_type: 'client_credentials' },
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2. Consultar cobrança
    const consultaUrl = process.env.EFI_PIX_SANDBOX === 'true'
      ? `https://pix-h.api.efipay.com.br/v2/cob/${txid}`
      : `https://pix.api.efipay.com.br/v2/cob/${txid}`;

    const consultaResponse = await axios.get(consultaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      httpsAgent
    });

    console.log(`[PIX Consulta] Status: ${consultaResponse.data.status}`);
    return consultaResponse.data;

  } catch (error) {
    console.error('[PIX Consulta] Erro ao consultar cobrança:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * Verifica e atualiza status de uma cobrança pendente
 * @param {Object} cobranca - Registro da tabela pix_cobrancas
 * @returns {Promise<boolean>} - true se foi atualizado, false caso contrário
 */
async function verificarEAtualizarCobranca(cobranca) {
  try {
    const { id, txid, id_usuario, codigo_envio, valor_original } = cobranca;

    // Consultar na EFI
    const dados = await consultarCobrancaEfi(txid);

    // Verificar se tem pagamento confirmado
    if (dados.status === 'CONCLUIDA' && dados.pix && dados.pix.length > 0) {
      const pixPago = dados.pix[0];
      const valorPago = Number(pixPago.valor || valor_original || 0);

      console.log(`[PIX Fallback] ✅ Cobrança ${id} (txid: ${txid}) PAGA! Atualizando...`);

      // Atualizar pix_cobrancas
      await db.query(
        `UPDATE pix_cobrancas 
         SET status = ?, 
             status_pagamento = ?, 
             webhook_recebido = ?, 
             webhook_payload = ?, 
             data_pagamento = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        ['CONCLUIDA', 'PAGO', false, JSON.stringify(pixPago), id]
      );

      // Atualizar palpites vinculados
      await db.query(
        `UPDATE palpites 
         SET status_pagamento = ?, 
             data_pagamento = NOW() 
         WHERE codigo_envio = ?`,
        ['PAGO', codigo_envio]
      );

      // Enviar notificação ao usuário
      const valorNum = Number(valor_original || valorPago || 0);
      await criarNotificacao(
        id_usuario,
        'pagamento_confirmado',
        '✅ Pagamento Confirmado',
        `Seu pagamento de R$ ${valorNum.toFixed(2)} foi confirmado! Referência: ${codigo_envio}`,
        {
          txid,
          codigo_envio,
          valor: valorNum,
          data_pagamento: new Date(),
          status: 'CONFIRMADO',
          origem: 'fallback_polling'
        }
      );

      console.log(`[PIX Fallback] ✅ Cobrança ${id} atualizada com sucesso (via polling)`);
      return true;
    }

    console.log(`[PIX Fallback] ⏳ Cobrança ${id} ainda PENDENTE (status: ${dados.status})`);
    return false;

  } catch (error) {
    console.error(`[PIX Fallback] ❌ Erro ao verificar cobrança ${cobranca.id}:`, error.message);
    return false;
  }
}

/**
 * Verifica todas as cobranças pendentes antigas (> 2 minutos)
 * @returns {Promise<Object>} - Estatísticas da verificação
 */
async function verificarCobrancasPendentes() {
  try {
    console.log('[PIX Fallback] 🔍 Iniciando verificação de cobranças pendentes...');

    // Buscar cobranças pendentes criadas há mais de 2 minutos
    const [cobrancas] = await db.query(
      `SELECT id, txid, id_usuario, codigo_envio, valor_original, created_at
       FROM pix_cobrancas
       WHERE status_pagamento = 'PENDENTE'
         AND webhook_recebido = false
         AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
       ORDER BY created_at DESC
       LIMIT 20`
    );

    if (!cobrancas || cobrancas.length === 0) {
      console.log('[PIX Fallback] ✓ Nenhuma cobrança pendente antiga encontrada');
      return { total: 0, verificadas: 0, atualizadas: 0 };
    }

    console.log(`[PIX Fallback] 📋 Encontradas ${cobrancas.length} cobranças pendentes para verificar`);

    let atualizadas = 0;
    for (const cobranca of cobrancas) {
      const foiAtualizada = await verificarEAtualizarCobranca(cobranca);
      if (foiAtualizada) {
        atualizadas++;
      }

      // Delay de 500ms entre consultas para não sobrecarregar API da EFI
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const resultado = {
      total: cobrancas.length,
      verificadas: cobrancas.length,
      atualizadas
    };

    console.log(`[PIX Fallback] ✅ Verificação concluída:`, resultado);
    return resultado;

  } catch (error) {
    console.error('[PIX Fallback] ❌ Erro na verificação de cobranças:', error.message);
    throw error;
  }
}

module.exports = {
  consultarCobrancaEfi,
  verificarEAtualizarCobranca,
  verificarCobrancasPendentes
};
