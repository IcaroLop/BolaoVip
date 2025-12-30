const pixService = require('../services/pixService');
const db = require('../database/conexao'); // mysql2/promise pool
const { criarNotificacao } = require('../services/notificacoesService');
require('dotenv').config();

const chavePix = process.env.EFI_PIX_KEY;

async function gerarCobranca(req, res) {
  try {
    console.log('[gerarCobranca] 🚀 INÍCIO DO REQUISIÇÃO');
    console.log('[gerarCobranca] Headers recebidos:', req.headers);
    console.log('[gerarCobranca] Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { id_usuario, nome_usuario, codigo_envio, valor, txid } = req.body;
    console.log(`[gerarCobranca] Tentativa: usuario=${id_usuario}, codigo_envio=${codigo_envio}, valor=${valor}`);

    if (!id_usuario || !nome_usuario || !codigo_envio || !valor || !txid) {
      console.warn(`[gerarCobranca] ⚠️ Campos obrigatórios ausentes: usuario=${id_usuario}, nome=${nome_usuario}, codigo=${codigo_envio}, valor=${valor}, txid=${txid}`);
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    // Sanitize txid (remover dashes e caracteres especiais)
    let sanitizedTxid = txid.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitizedTxid.length < 26) {
      sanitizedTxid = sanitizedTxid.padEnd(26, '0');
    } else if (sanitizedTxid.length > 35) {
      sanitizedTxid = sanitizedTxid.substring(0, 35);
    }
    console.log(`[gerarCobranca] txid original='${txid}' -> sanitizado='${sanitizedTxid}'`);

    const descricao = `Pagamento Bolão VIP - ${codigo_envio}`;
    console.log('[gerarCobranca] Chamando pixService.criarCobranca...');

    // Chamar o serviço PIX
    const cobranca = await pixService.criarCobranca(sanitizedTxid, valor, nome_usuario, descricao);
    console.log('[gerarCobranca] ✅ pixService.criarCobranca retornou:', JSON.stringify(cobranca, null, 2).substring(0, 300) + '...');

    // Extrair dados principais
    const calendarioCriacao = new Date(cobranca.calendario.criacao);
    const calendarioExpiracao = cobranca.calendario.expiracao;
    const valorOriginal = parseFloat(cobranca.valor.original);
    const locId = cobranca.loc?.id || null;
    const locLocation = cobranca.loc?.location || null;
    const locTipo = cobranca.loc?.tipoCob || null;
    const pixCopiaECola = cobranca.pixCopiaECola;

    const insertData = {
      id_usuario,
      codigo_envio,
      txid: cobranca.txid,
      status: cobranca.status,
      status_pagamento: 'PENDENTE',
      valor_original: valorOriginal,
      chave_pix: cobranca.chave,
      solicitacao_pagador: cobranca.solicitacaoPagador,
      loc_id: locId,
      loc_location: locLocation,
      loc_tipo: locTipo,
      pix_copiaecola: pixCopiaECola,
      calendario_criacao: calendarioCriacao,
      calendario_expiracao: calendarioExpiracao,
      payload_raw: JSON.stringify(cobranca),
      webhook_recebido: false,
      webhook_payload: null
    };

    // Inserir no banco
    const [insertResult] = await db.query('INSERT INTO pix_cobrancas SET ?', [insertData]);
    console.log(`[gerarCobranca] ✅ PIX criado com sucesso. db_id=${insertResult.insertId}, sanitizedTxid=${sanitizedTxid}, valor=${valorOriginal}`);

    // ✅ NOTIFICAÇÃO: Cobrança PIX Pendente
    const dadosNotificacao = {
      txid: cobranca.txid,
      codigo_envio,
      valor: valorOriginal,
      pix_copiaecola: pixCopiaECola,
      calendario_expiracao: calendarioExpiracao,
      loc_location: locLocation
    };

    const tituloNotificacao = '💳 Cobrança PIX Pendente';
    const mensagemNotificacao = `Código ${codigo_envio}: Pague R$ ${valorOriginal.toFixed(2)} via PIX. Válida até ${new Date(calendarioExpiracao * 1000).toLocaleString('pt-BR')}`;

    await criarNotificacao(
      id_usuario,
      'pagamento_pendente',
      tituloNotificacao,
      mensagemNotificacao,
      dadosNotificacao
    ).catch(err => {
      console.error('Erro ao criar notificação de cobrança pendente:', err);
    });

    // Buscar a cobrança inserida pelo ID gerado
    const [rows] = await db.query('SELECT * FROM pix_cobrancas WHERE id = ?', [insertResult.insertId]);

    const responseData = {
      success: true,
      cobranca_db: rows[0],
      cobranca_api: cobranca
      };

      //console.log('Resposta enviada pelo backend:', responseData);
      console.log('[gerarCobranca] ✅ Enviando resposta para o frontend:', JSON.stringify(responseData, null, 2).substring(0, 200) + '...');

      res.json(responseData);

  } catch (error) {
    console.error(`[gerarCobranca] ❌ Erro ao gerar cobrança PIX. usuario=${req.body.id_usuario}, codigo=${req.body.codigo_envio}`);
    console.error('[gerarCobranca] Stack trace:', error.stack);
    console.error('[gerarCobranca] Erro detalhado:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, error: 'Erro ao gerar cobrança Pix', detalhes: error.message });
  }
}

async function webhookCobranca (req, res) {
  try {
    const notification = req.body;

    const pixArray = notification.pix; // Array de pagamentos
    if (!pixArray || !Array.isArray(pixArray)) {
      console.warn('Webhook recebido sem array pix');
      return res.status(400).send('Formato inválido');
    }

    for (const pix of pixArray) {
      const txid = pix.txid;
      const status = pix.status;

      if (txid && status) {
        if (status === 'CONCLUIDA') {
          // Registra data_pagamento quando EFI confirma em produção
          await db.query(
            'UPDATE pix_cobrancas SET status = ?, status_pagamento = ?, webhook_recebido = ?, webhook_payload = ?, data_pagamento = NOW() WHERE txid = ?',
            [status, 'PAGO', true, JSON.stringify(pix), txid]
          );
          await db.query(
            'UPDATE palpites SET status_pagamento = ?, data_pagamento = NOW() WHERE codigo_envio = ?',
            ['PAGO', txid]
          );

          // ✅ NOTIFICAÇÃO: Pagamento Confirmado
          const [cobrancaRows] = await db.query('SELECT id_usuario, codigo_envio, valor_original FROM pix_cobrancas WHERE txid = ?', [txid]);
          if (cobrancaRows && cobrancaRows.length > 0) {
            const { id_usuario, codigo_envio, valor_original } = cobrancaRows[0];
            
            const dadosNotificacao = {
              txid,
              codigo_envio,
              valor: valor_original,
              data_pagamento: new Date(),
              status: 'CONFIRMADO'
            };

            const tituloNotificacao = '✅ Pagamento Confirmado';
            const mensagemNotificacao = `Seu pagamento de R$ ${valor_original.toFixed(2)} foi confirmado! Referência: ${codigo_envio}`;

            await criarNotificacao(
              id_usuario,
              'pagamento_confirmado',
              tituloNotificacao,
              mensagemNotificacao,
              dadosNotificacao
            ).catch(err => {
              console.error('Erro ao criar notificação de pagamento confirmado:', err);
            });
          }

          console.log(`✅ Palpites atualizados para PAGO → codigo_envio: ${txid}`);
        } else {
          await db.query(
            'UPDATE pix_cobrancas SET status = ?, status_pagamento = ?, webhook_recebido = ?, webhook_payload = ? WHERE txid = ?',
            [status, status === 'CONCLUIDA' ? 'PAGO' : 'PENDENTE', true, JSON.stringify(pix), txid]
          );
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook Pix:', error);
    res.status(500).send('Erro no webhook');
  }
}


module.exports = {
  gerarCobranca,
  webhookCobranca
};
