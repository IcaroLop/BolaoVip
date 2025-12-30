// backend/services/integracaoNotificacoesService.js
// Exemplos de como integrar notificações nos fluxos existentes

const notificacoesService = require('./notificacoesService');

/**
 * EXEMPLO 1: Ao enviar palpite com sucesso
 * Adicionar no palpiteController.js após criar cobrança PIX
 */
async function notificarPalpiteEnviado(usuarioId, rodada, codigoPix, valor) {
  try {
    await notificacoesService.criarNotificacao(
      usuarioId,
      'palpite_enviado',
      `⚽ Palpite enviado - Rodada ${rodada}`,
      `Seus palpites foram registrados! Finalize o pagamento de R$ ${valor.toFixed(2)} para confirmar sua participação.`,
      {
        rodada,
        codigo_pix: codigoPix,
        valor
      }
    );
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao notificar palpite:', err);
  }
}

/**
 * EXEMPLO 2: Ao confirmar pagamento
 * Adicionar no saldoService.js ou no webhook PIX
 */
async function notificarPagamentoConfirmado(usuarioId, valor, rodada = null) {
  try {
    const mensagem = rodada
      ? `Pagamento de R$ ${valor.toFixed(2)} confirmado para a Rodada ${rodada}! Seus palpites estão válidos.`
      : `Depósito de R$ ${valor.toFixed(2)} confirmado! Seu saldo foi atualizado.`;

    await notificacoesService.criarNotificacao(
      usuarioId,
      'pagamento_confirmado',
      '💰 Pagamento Confirmado',
      mensagem,
      {
        valor,
        rodada
      }
    );
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao notificar pagamento:', err);
  }
}

/**
 * EXEMPLO 3: Ao iniciar nova rodada
 * Adicionar no scheduler ou job que processa início de rodada
 */
async function notificarInicioRodada(rodada, dataInicio) {
  try {
    // Buscar todos os usuários ativos
    const pool = require('../database/conexao');
    const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE ativo = TRUE');

    const data = new Date(dataInicio);
    const dataFormatada = data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Criar notificação para todos
    for (const usuario of usuarios) {
      await notificacoesService.criarNotificacao(
        usuario.id,
        'inicio_rodada',
        `📢 Rodada ${rodada} iniciou!`,
        `A Rodada ${rodada} começou em ${dataFormatada}. Envie seus palpites!`,
        {
          rodada,
          data_inicio: dataInicio
        }
      );
    }

    console.log(`[IntegracaoNotificacoes] Notificações enviadas para ${usuarios.length} usuários sobre Rodada ${rodada}`);
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao notificar início de rodada:', err);
  }
}

/**
 * EXEMPLO 4: Ao publicar resultados de rodada
 * Adicionar no consultaResultadosService.js após atualizar pontuações
 */
async function notificarResultadosPublicados(rodada) {
  try {
    const pool = require('../database/conexao');
    // Buscar usuários que participaram da rodada
    const [usuarios] = await pool.query(`
      SELECT DISTINCT usuario_id, SUM(pontos) as total_pontos
      FROM palpites
      WHERE rodada = ? AND status_pagamento = 'pago'
      GROUP BY usuario_id
    `, [rodada]);

    for (const usuario of usuarios) {
      const pontos = usuario.total_pontos || 0;
      await notificacoesService.criarNotificacao(
        usuario.usuario_id,
        'resultado_publicado',
        `🏆 Resultados da Rodada ${rodada}`,
        `Os resultados foram publicados! Você fez ${pontos.toFixed(2)} pontos nesta rodada.`,
        {
          rodada,
          pontos
        }
      );
    }

    console.log(`[IntegracaoNotificacoes] Notificações de resultados enviadas para ${usuarios.length} usuários`);
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao notificar resultados:', err);
  }
}

/**
 * EXEMPLO 5: Ao distribuir prêmios
 * Adicionar no rankingController.js ou service de premiações
 */
async function notificarPremioRecebido(usuarioId, rodada, posicao, valorPremio, tipo) {
  try {
    const mensagens = {
      'RECEBE': `🎉 Parabéns! Você ficou em ${posicao}º lugar na Rodada ${rodada} e receberá R$ ${valorPremio.toFixed(2)}!`,
      'PAGA': `Você ficou em ${posicao}º lugar na Rodada ${rodada}. Valor a pagar: R$ ${valorPremio.toFixed(2)}.`
    };

    await notificacoesService.criarNotificacao(
      usuarioId,
      'premio_recebido',
      tipo === 'RECEBE' ? '🏆 Prêmio Recebido!' : 'Colocação da Rodada',
      mensagens[tipo] || 'Classificação da rodada atualizada.',
      {
        rodada,
        posicao,
        valor: valorPremio,
        tipo
      }
    );
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao notificar prêmio:', err);
  }
}

/**
 * EXEMPLO 6: Notificação de sistema genérica
 */
async function notificarSistema(usuarioId, titulo, mensagem, dadosAdicionais = {}) {
  try {
    await notificacoesService.criarNotificacao(
      usuarioId,
      'sistema',
      titulo,
      mensagem,
      dadosAdicionais
    );
  } catch (err) {
    console.error('[IntegracaoNotificacoes] Erro ao enviar notificação de sistema:', err);
  }
}

module.exports = {
  notificarPalpiteEnviado,
  notificarPagamentoConfirmado,
  notificarInicioRodada,
  notificarResultadosPublicados,
  notificarPremioRecebido,
  notificarSistema
};

// ============================================
// INSTRUÇÕES DE INTEGRAÇÃO:
// ============================================
/*

1. PALPITES (backend/controllers/palpiteController.js):
   - Após criar cobrança PIX com sucesso:
   
   const integracaoNotif = require('../services/integracaoNotificacoesService');
   await integracaoNotif.notificarPalpiteEnviado(id_usuario, rodada, codigo_envio, 10.00);

2. PAGAMENTO (backend/services/saldoService.js):
   - Após confirmar depósito/pagamento:
   
   const integracaoNotif = require('./integracaoNotificacoesService');
   await integracaoNotif.notificarPagamentoConfirmado(usuario_id, valor);

3. INÍCIO DE RODADA (backend/services/scheduler.js):
   - Quando rodada começar:
   
   const integracaoNotif = require('./integracaoNotificacoesService');
   await integracaoNotif.notificarInicioRodada(rodadaAtual, dataInicio);

4. RESULTADOS (backend/services/consultaResultadosService.js):
   - Após atualizar pontuações:
   
   const integracaoNotif = require('./integracaoNotificacoesService');
   await integracaoNotif.notificarResultadosPublicados(rodada);

5. PRÊMIOS (backend/controllers/rankingController.js):
   - Ao distribuir prêmios:
   
   const integracaoNotif = require('../services/integracaoNotificacoesService');
   await integracaoNotif.notificarPremioRecebido(usuario_id, rodada, posicao, valor, 'RECEBE');

*/
