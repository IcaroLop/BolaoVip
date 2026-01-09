const pixService = require('./pixService');
const db = require('../database/conexao');
const saldoService = require('./saldoService');
const { criarNotificacao } = require('./notificacoesService');
require('dotenv').config();

const chavePix = process.env.EFI_PIX_KEY;

/**
 * Cria um depósito PIX via EFI (gera QRCode e CopiaECola)
 * @param {number} usuarioId - ID do usuário
 * @param {number} valor - Valor do depósito
 * @returns {Promise<Object>} - Dados do depósito criado (txid, QRCode, CopiaECola)
 */
async function criarDepositoPix(usuarioId, valor) {
  try {
    console.log(`[depositoPixService] Iniciando criação de depósito PIX. usuario=${usuarioId}, valor=${valor}`);

    // 1. Validar entrada
    if (!usuarioId || !valor || valor <= 0) {
      throw new Error('Usuário e valor válidos são obrigatórios');
    }

    // 2. Gerar txid único para o depósito
    const { v4: uuidv4 } = require('uuid');
    const txidCompleto = uuidv4().replace(/-/g, '');
    const txid = txidCompleto.substring(0, 26); // Limitar a 26 caracteres

    console.log(`[depositoPixService] txid gerado: ${txid}`);

    // 3. Buscar nome do usuário
    const [usuarioRows] = await db.query('SELECT nome FROM usuarios WHERE id = ?', [usuarioId]);
    if (!usuarioRows || usuarioRows.length === 0) {
      throw new Error(`Usuário ${usuarioId} não encontrado`);
    }
    const nomeUsuario = usuarioRows[0].nome || 'Deposito Bolão VIP';

    // 4. Chamar EFI para gerar PIX
    const descricao = `Depósito Bolão VIP - ${txid}`;
    console.log(`[depositoPixService] Chamando pixService.criarCobranca para gerar QRCode...`);

    const cobranca = await pixService.criarCobranca(txid, valor, chavePix, descricao, nomeUsuario);
    console.log(`[depositoPixService] ✅ Resposta EFI recebida`);
    console.log(`[depositoPixService] Estrutura da resposta EFI:`, Object.keys(cobranca));
    console.log(`[depositoPixService] Conteúdo completo da resposta EFI (primeiros 500 chars):`, JSON.stringify(cobranca).substring(0, 500));

    // 5. Extrair dados principais
    const calendarioCriacao = new Date(cobranca.calendario.criacao);
    const calendarioExpiracao = cobranca.calendario.expiracao;
    const valorOriginal = parseFloat(cobranca.valor.original);
    const locId = cobranca.loc?.id || null;
    const locLocation = cobranca.loc?.location || null;
    const locTipo = cobranca.loc?.tipoCob || null;
    const pixCopiaECola = cobranca.pixCopiaECola;

    // Log de debug
    console.log(`[depositoPixService] Dados extraídos:`);
    console.log(`  - calendarioCriacao: ${calendarioCriacao}`);
    console.log(`  - calendarioExpiracao: ${calendarioExpiracao}`);
    console.log(`  - valorOriginal: ${valorOriginal}`);
    console.log(`  - locId: ${locId}`);
    console.log(`  - locLocation: ${locLocation}`);
    console.log(`  - locTipo: ${locTipo}`);
    console.log(`  - pixCopiaECola: ${pixCopiaECola ? '✅ PRESENTE' : '❌ AUSENTE'}`);
    if (!pixCopiaECola) {
      console.log(`[depositoPixService] ⚠️ AVISO: pixCopiaECola não encontrado na resposta EFI!`);
      console.log(`[depositoPixService] Chaves disponíveis na resposta:`, Object.keys(cobranca).join(', '));
    }

    // 6. Armazenar no banco de dados
    const insertData = {
      id_usuario: usuarioId,
      txid: cobranca.txid,
      status: cobranca.status,
      status_pagamento: 'PENDENTE',
      valor_original: valorOriginal,
      chave_pix: chavePix,
      solicitacao_pagador: descricao,
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

    const [insertResult] = await db.query('INSERT INTO pix_depositos SET ?', [insertData]);
    console.log(`[depositoPixService] ✅ Depósito armazenado no banco. db_id=${insertResult.insertId}, txid=${txid}`);

    // 7. Criar notificação
    const dadosNotificacao = {
      txid,
      valor: valorOriginal,
      pix_copiaecola: pixCopiaECola,
      calendario_expiracao: calendarioExpiracao,
      loc_location: locLocation
    };

    const tituloNotificacao = '💰 Depósito PIX Gerado';
    const mensagemNotificacao = `Depósito de R$ ${valorOriginal.toFixed(2)} preparado. Escanneie o QRCode ou copie o código PIX. Válido por ${calendarioExpiracao} segundos.`;

    await criarNotificacao(
      usuarioId,
      'deposito',
      tituloNotificacao,
      mensagemNotificacao,
      dadosNotificacao
    ).catch(err => {
      console.error('[depositoPixService] Erro ao criar notificação de depósito pendente:', err);
    });

    // 8. Buscar o registro inserido
    const [rows] = await db.query('SELECT * FROM pix_depositos WHERE id = ?', [insertResult.insertId]);

    const response = {
      sucesso: true,
      deposito_id: insertResult.insertId,
      txid,
      valor: valorOriginal,
      pix_copiaecola: pixCopiaECola,
      qrcode_url: locLocation,
      calendario_expiracao: calendarioExpiracao,
      dados_completos: rows[0]
    };

    console.log(`[depositoPixService] ✅ Depósito PIX criado com sucesso. deposito_id=${insertResult.insertId}`);
    return response;

  } catch (error) {
    console.error(`[depositoPixService] ❌ Erro ao criar depósito PIX. usuario=${usuarioId}, valor=${valor}`);
    console.error('[depositoPixService] Erro:', error.message);
    console.error('[depositoPixService] Stack:', error.stack);
    throw error;
  }
}

/**
 * Verifica e atualiza status de um depósito pendente
 * @param {Object} deposito - Registro da tabela pix_depositos
 * @returns {Promise<boolean>} - true se foi atualizado, false caso contrário
 */
async function verificarEAtualizarDeposito(deposito) {
  let conexao;
  try {
    const { id, txid, id_usuario, valor_original } = deposito;

    // Consultar status na EFI
    const { consultarCobrancaEfi } = require('./pixConsultaService');
    const dados = await consultarCobrancaEfi(txid);

    // Verificar se tem pagamento confirmado
    if (dados.status === 'CONCLUIDA' && dados.pix && dados.pix.length > 0) {
      const pixPago = dados.pix[0];
      const valorPago = Number(pixPago.valor || valor_original || 0);

      console.log(`[depositoPixService] ✅ Depósito ${id} (txid: ${txid}) PAGO! Creditando saldo...`);

      // Usar conexão para transação
      conexao = await db.getConnection();
      await conexao.beginTransaction();

      try {
        // 1. Atualizar pix_depositos
        await conexao.query(
          `UPDATE pix_depositos 
           SET status = ?, 
               status_pagamento = ?, 
               webhook_recebido = ?, 
               webhook_payload = ?, 
               data_pagamento = NOW(),
               updated_at = NOW()
           WHERE id = ?`,
          ['CONCLUIDA', 'PAGO', false, JSON.stringify(pixPago), id]
        );

        // 2. Creditar saldo do usuário
        const saldoAnterior = await conexao.query(
          'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
          [id_usuario]
        );

        const saldoAnt = saldoAnterior[0][0]?.saldo_atual || 0;
        const saldoNovo = saldoAnt + valorPago;

        await conexao.query(
          'UPDATE saldo_usuario SET saldo_atual = saldo_atual + ? WHERE usuario_id = ?',
          [valorPago, id_usuario]
        );

        // 3. Registrar movimentação no extrato
        await conexao.query(
          `INSERT INTO extrato_movimentacao 
           (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id_usuario, 'deposito', valorPago, saldoAnt, saldoNovo, `Depósito PIX confirmado - txid: ${txid}`, id, 'deposito_pix', 'confirmado']
        );

        await conexao.commit();

        // 4. Enviar notificação ao usuário
        await criarNotificacao(
          id_usuario,
          'deposito_confirmado',
          '✅ Depósito Confirmado',
          `Seu depósito de R$ ${valorPago.toFixed(2)} foi confirmado e creditado em sua conta!`,
          {
            txid,
            valor: valorPago,
            saldo_novo: saldoNovo,
            data_confirmacao: new Date(),
            origem: 'fallback_deposito'
          }
        ).catch(err => {
          console.error('[depositoPixService] Erro ao criar notificação de depósito confirmado:', err);
        });

        console.log(`[depositoPixService] ✅ Depósito ${id} confirmado e saldo creditado (via fallback). Novo saldo: R$ ${saldoNovo.toFixed(2)}`);
        return true;

      } catch (transactionError) {
        await conexao.rollback();
        throw transactionError;
      }
    }

    console.log(`[depositoPixService] ⏳ Depósito ${id} ainda PENDENTE (status: ${dados.status})`);
    return false;

  } catch (error) {
    console.error(`[depositoPixService] ❌ Erro ao verificar depósito ${deposito.id}:`, error.message);
    return false;
  } finally {
    if (conexao) conexao.release();
  }
}

/**
 * Verifica todos os depósitos pendentes
 * @returns {Promise<Object>} - Estatísticas da verificação
 */
async function verificarDepositosPendentes() {
  try {
    console.log('[depositoPixService] 🔍 Iniciando verificação de depósitos pendentes...');

    // Buscar depósitos pendentes criados há mais de 2 minutos E não expirados
    const [depositos] = await db.query(
      `SELECT id, txid, id_usuario, valor_original, created_at, calendario_expiracao
       FROM pix_depositos
       WHERE status_pagamento = 'PENDENTE'
         AND webhook_recebido = false
         AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
         AND (
           calendario_expiracao IS NULL 
           OR DATE_ADD(created_at, INTERVAL calendario_expiracao SECOND) > NOW()
         )
       ORDER BY created_at DESC
       LIMIT 20`
    );

    if (!depositos || depositos.length === 0) {
      console.log('[depositoPixService] ✓ Nenhum depósito pendente antigo encontrado');
      return { total: 0, verificados: 0, atualizados: 0 };
    }

    console.log(`[depositoPixService] 📋 Encontrados ${depositos.length} depósitos pendentes para verificar`);

    let atualizados = 0;
    for (const deposito of depositos) {
      const foiAtualizado = await verificarEAtualizarDeposito(deposito);
      if (foiAtualizado) {
        atualizados++;
      }

      // Delay de 500ms entre consultas para não sobrecarregar API da EFI
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const resultado = {
      total: depositos.length,
      verificados: depositos.length,
      atualizados
    };

    console.log(`[depositoPixService] ✅ Verificação de depósitos concluída:`, resultado);
    return resultado;

  } catch (error) {
    console.error('[depositoPixService] ❌ Erro na verificação de depósitos:', error.message);
    throw error;
  }
}

module.exports = {
  criarDepositoPix,
  verificarEAtualizarDeposito,
  verificarDepositosPendentes
};
